"""``fars dispatch <task-slug>`` — eligible agents for an operational task.

Reads agent and task frontmatter from the corpus, builds the dispatch
graph (capabilities, skills, jurisdiction, charter bindings, capacity),
and reports who could take the task.

Eligibility filter (in order):
  1. ``work-type`` — agent's ``work-types`` must include the task's ``work-type``
  2. ``requires-skills`` ⊆ agent's ``skills``
  3. ``requires-capabilities`` ⊆ agent's ``provides-capabilities``
  4. ``touches`` ⊆ agent's ``jurisdiction.write`` (paths)
  5. charter-binding check — agent's charter-bound rules apply
  6. capacity — sort eligible agents by current load (least-loaded first)
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

from fars.cli._runner import as_directory
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="dispatch",
    description="Find agents eligible to take an operational task.",
    example="fars dispatch achievement-system",
    notes="Walks agents and tasks under <root>; reports eligible agents sorted by current load.",
    output="Markdown report; --json emits {task, ready, eligible:[{agent,reason}], rejected:[{agent,reason}]}.",
    parameters=(
        Parameter(name="slug", kind="positional", required=True,
                  description="task slug to dispatch"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


# ---------- Type tests over Flatfile ----------

def _is_agent(n) -> bool:
    return bool(n.fm.get("model")) and "provides-capabilities" in n.fm


def _is_task(n) -> bool:
    return n.fm.get("specialization") == "task" or n.kind == "task"


def _list(v) -> list:
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [v]
    return []


# ---------- Capacity ----------

def _compute_capacity(tasks) -> dict:
    load = defaultdict(int)
    for t in tasks:
        if t.fm.get("status") in ("ready", "in-progress"):
            assignee = t.fm.get("assigned-to")
            if assignee:
                load[assignee] += 1
    return dict(load)


# ---------- Readiness ----------

def _task_ready(task, by_slug) -> tuple[bool, str]:
    deps = _list(task.fm.get("depends-on"))
    for dep_slug in deps:
        if not isinstance(dep_slug, str):
            continue
        dep_notes = by_slug.get(dep_slug, [])
        if not dep_notes:
            return False, f"depends-on unknown task: {dep_slug}"
        dep_status = dep_notes[0].fm.get("status")
        if dep_status != "completed":
            return False, f"waiting on {dep_slug} (status={dep_status})"
    return True, "all dependencies satisfied"


# ---------- Jurisdiction ----------

def _jurisdiction_covers(task, agent) -> tuple[bool, str]:
    touches = _list(task.fm.get("touches"))
    if not touches:
        return True, "no jurisdiction constraint"
    juris = agent.fm.get("jurisdiction") or {}
    write_paths = _list(juris.get("write") if isinstance(juris, dict) else None)
    if not write_paths:
        return False, f"agent has no write jurisdiction; task touches {touches}"
    uncovered = []
    for tp in touches:
        if not any(
            tp == wp
            or tp.startswith(wp.rstrip("/") + "/")
            or wp.strip().endswith(str(tp))
            for wp in write_paths
        ):
            uncovered.append(tp)
    if uncovered:
        return False, f"agent jurisdiction {write_paths} does not cover {uncovered}"
    return True, f"covered by {write_paths}"


# ---------- Charter binding ----------

def _charter_violations(task, agent, charter_rules) -> list:
    violations = []
    bindings = (agent.fm.get("charter-bindings") or {})
    if not isinstance(bindings, dict):
        return violations
    bound_rules = _list(bindings.get("rules"))
    for rule_slug in bound_rules:
        rule = charter_rules.get(rule_slug)
        if not rule:
            continue
        check_block = rule.fm.get("checkable") or {}
        for field in _list(check_block.get("task-must-have")):
            v = task.fm.get(field)
            if v in (None, "", [], {}):
                violations.append((rule_slug, f"missing required field `{field}`"))
        if _list(check_block.get("task-must-trace-to")):
            trace_keys = ("charter-bindings", "plan", "serves", "part-of", "contributes-to")
            if not any(task.fm.get(k) for k in trace_keys):
                violations.append((rule_slug, f"no trace via {trace_keys}"))
    return violations


# ---------- Eligibility ----------

def _eligible_agents(task, agents, capacity, charter_rules):
    eligible = []
    rejected = []
    work_type = task.fm.get("work-type")
    required_caps = set(_list(task.fm.get("requires-capabilities") or task.fm.get("requires")))
    required_skills = set(_list(task.fm.get("requires-skills")))

    for agent in agents:
        slug = agent.slug
        reasons = []

        agent_work_types = _list(agent.fm.get("work-types"))
        if work_type and agent_work_types:
            if work_type not in agent_work_types:
                rejected.append((slug, f"work-type {work_type} not in {agent_work_types}"))
                continue
            reasons.append(f"work-type:{work_type}")

        if required_skills:
            agent_skills = set(_list(agent.fm.get("skills")))
            missing = required_skills - agent_skills
            if missing:
                rejected.append((slug, f"missing skills: {sorted(missing)}"))
                continue
            reasons.append(f"skills:{sorted(required_skills & agent_skills)}")

        if required_caps:
            agent_caps = set(_list(agent.fm.get("provides-capabilities")))
            missing = required_caps - agent_caps
            if missing:
                rejected.append((slug, f"missing caps: {sorted(missing)}"))
                continue
            reasons.append(f"caps:{sorted(required_caps & agent_caps)}")

        covered, jur_reason = _jurisdiction_covers(task, agent)
        if not covered:
            rejected.append((slug, jur_reason))
            continue

        violations = _charter_violations(task, agent, charter_rules)
        if violations:
            msg = "; ".join(f"{r}: {m}" for r, m in violations)
            rejected.append((slug, f"charter — {msg}"))
            continue

        if not reasons:
            continue

        load = capacity.get(slug, 0)
        eligible.append({"agent": slug, "reason": "; ".join(reasons), "load": load})

    eligible.sort(key=lambda e: e["load"])
    return eligible, [{"agent": a, "reason": r} for a, r in rejected]


# ---------- Verb entry ----------

def _dispatch_path_filter(path: Path) -> bool:
    """Like the default corpus filter but does NOT skip `triage/`.

    Operational tasks live in triage as their working area; dispatch must
    see them to compute readiness, capacity, and eligibility. Build/cache
    dirs and vendored content are still excluded.
    """
    parts = path.parts
    skip_dirs = {".git", "node_modules", "public", ".lake", ".venv",
                 "__pycache__", "build", "dist", "archetypes"}
    if any(p in skip_dirs for p in parts):
        return False
    if path.name == "README.md":
        return False
    if "reference-source-code" in str(path).replace("\\", "/"):
        return False
    return True


def run(slug: str, *, root: Path | str = ".") -> dict | None:
    rooted = as_directory(root, "fars dispatch")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted, path_filter=_dispatch_path_filter)
    notes = list(ws.notes)

    # Resolve task
    task = None
    for n in notes:
        if n.slug == slug and _is_task(n):
            task = n
            break
    if task is None:
        return None

    agents = [n for n in notes if _is_agent(n)]
    tasks = [n for n in notes if _is_task(n)]
    charter_rules = {n.slug: n for n in notes
                     if n.fm.get("specialization") == "rule" and "checkable" in n.fm}

    capacity = _compute_capacity(tasks)
    ready, why = _task_ready(task, ws.by_slug)
    subtasks = _list(task.fm.get("subtasks"))

    out = {
        "task": slug,
        "title": task.fm.get("title"),
        "status": task.fm.get("status"),
        "work-type": task.fm.get("work-type"),
        "ready": ready,
        "ready-reason": why,
        "subtasks": subtasks,
        "coordinator": task.fm.get("coordinator"),
    }

    if subtasks:
        # Composite — surface coordinator + next ready subtask
        out["composite"] = True
        next_ready = None
        for st_slug in subtasks:
            st_notes = ws.by_slug.get(st_slug, [])
            if not st_notes:
                continue
            st = st_notes[0]
            if st.fm.get("status") == "completed":
                continue
            r, _ = _task_ready(st, ws.by_slug)
            if r and st.fm.get("status") == "open":
                e, _ = _eligible_agents(st, agents, capacity, charter_rules)
                next_ready = {"slug": st_slug, "eligible": e[:5]}
                break
        out["next-ready-subtask"] = next_ready
    else:
        eligible, rejected = _eligible_agents(task, agents, capacity, charter_rules)
        out["eligible"] = eligible
        out["rejected"] = rejected[:8]

    return out


def _render_markdown(out: dict) -> str:
    lines = []
    lines.append(f"# Dispatch: {out['task']}\n")
    lines.append(f"- **title:** {out.get('title')}")
    lines.append(f"- **status:** {out.get('status')}")
    lines.append(f"- **work-type:** {out.get('work-type')}")
    lines.append(f"- **ready:** {out.get('ready')} — {out.get('ready-reason')}\n")

    if out.get("composite"):
        lines.append(f"## Composite task — coordinator: `{out.get('coordinator') or '<none>'}`\n")
        lines.append(f"Subtasks: {out.get('subtasks')}\n")
        nrs = out.get("next-ready-subtask")
        if nrs:
            lines.append(f"### Next ready subtask: `{nrs['slug']}`")
            for e in nrs["eligible"]:
                lines.append(f"- {e['agent']}  ({e['reason']}; load={e['load']})")
        else:
            lines.append("No ready subtask — all subtasks blocked or completed.")
        return "\n".join(lines) + "\n"

    eligible = out.get("eligible", [])
    rejected = out.get("rejected", [])
    lines.append(f"## Eligible agents ({len(eligible)})\n")
    for e in eligible:
        lines.append(f"- **{e['agent']}** — {e['reason']} (load={e['load']})")
    if not eligible:
        lines.append("\nNo eligible agents. Top rejection reasons:")
        for r in rejected:
            lines.append(f"- {r['agent']}: {r['reason']}")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    out = run(args.slug, root=args.root)
    if out is None:
        if not as_directory(args.root, "fars dispatch"):
            return 2
        print(f"fars dispatch: no task with slug {args.slug!r}", file=sys.stderr)
        return 1
    if args.json:
        sys.stdout.write(json.dumps(out, indent=2, default=str))
    else:
        sys.stdout.write(_render_markdown(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
