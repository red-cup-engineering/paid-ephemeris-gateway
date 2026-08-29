"""Render the research-program plan: question readiness, frontiers, gaps.

Each section corresponds to one ``analyze.*`` view. The plan is shape
guidance, not a directive — the graph proposes, the mathematician disposes.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.closure.valuation.firmness import score as firmness_of
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def render(notes: list[Flatfile], *,
           by_slug: Mapping[str, list[Flatfile]],
           in_edges: Mapping[str, Iterable[Predication]],
           readiness: dict[str, list[tuple[str, dict]]],
           qclusters: list[dict],
           frontier: list[tuple[str, dict]],
           clusters: list[tuple[str, set[str], str, float]],
           realization: dict,
           splits: list[dict],
           ancestors_view: list[tuple[str, str, set[str], float]],
           primitives: list[str],
           loose: list[str],
           pillars: list[tuple[str, int]],
           isolated: list[str],
           ) -> str:
    out: list[str] = ["# Research-program report", ""]
    out.append(
        f"Generated from the frontmatter graph of {len(notes)} notes. "
        "Each section is a flag for the mathematician to consider — not a "
        "directive."
    )
    out.append("")

    out.append("## Question readiness")
    out.append("")
    counts = {tier: len(qs) for tier, qs in readiness.items()}
    out.append(
        f"**Tally:** {counts['answerable']} answerable · "
        f"{counts['blocked']} blocked · "
        f"{counts['needs-construction']} need new construction"
        + (f" · {counts['unanchored']} unanchored" if counts['unanchored'] else "")
        + "."
    )
    out.append("")
    if readiness["answerable"]:
        out.append("### Answerable now")
        out.append("")
        for q, _ in readiness["answerable"]:
            out.append(f"- `{q}`")
        out.append("")
    if readiness["blocked"]:
        out.append("### Blocked on sketches / loose entities")
        out.append("")
        for q, b in readiness["blocked"]:
            blockers = [f"`{e}` ({s})" for e, s in b["sketch"]]
            blockers += [f"`{e}` (loose)" for e in b["loose"]]
            out.append(f"- **`{q}`** — blocked on: {', '.join(blockers)}")
        out.append("")
    if readiness["needs-construction"]:
        out.append("### Need new construction")
        out.append("")
        for q, b in readiness["needs-construction"]:
            missing = ", ".join(f"`{e}`" for e in b["missing"])
            other = [f"`{e}` ({s})" for e, s in b["sketch"]] + [f"`{e}` (loose)" for e in b["loose"]]
            line = f"- **`{q}`** — missing: {missing}"
            if other:
                line += f" · also blocked on: {', '.join(other)}"
            out.append(line)
        out.append("")
    if readiness["unanchored"]:
        out.append("### Unanchored (no `explores:`)")
        out.append("")
        for q, _ in readiness["unanchored"]:
            out.append(f"- `{q}`")
        out.append("")

    multi = [c for c in qclusters if len(c["questions"]) >= 2]
    singletons = [c for c in qclusters if len(c["questions"]) == 1]
    out.append("## Question clusters")
    out.append("")
    if multi:
        for i, c in enumerate(multi, start=1):
            qs = sorted(c["questions"])
            out.append(f"### Spine {i} ({len(qs)} questions)")
            out.append("")
            for q in qs:
                out.append(f"- `{q}`")
            out.append("")
            if c["shared_blockers"]:
                out.append("Shared not-firm blockers:")
                out.append("")
                for b, blocking_qs in c["shared_blockers"][:8]:
                    f = firmness_of(b, by_slug=by_slug, in_edges=in_edges)
                    out.append(f"- `{b}` ({f}, blocks {len(blocking_qs)} of {len(qs)})")
                out.append("")
    if singletons:
        out.append(f"### Independent ({len(singletons)} questions)")
        out.append("")
        for c in singletons:
            (q,) = c["questions"]
            out.append(f"- `{q}`")
        out.append("")

    out.append("## Enablement frontier")
    out.append("")
    for ent, d in frontier[:20]:
        cand = by_slug.get(ent, [])
        kind = cand[0].kind if cand else "—"
        n_thm = d["characterizing_theorems"]
        plural = "s" if n_thm != 1 else ""
        out.append(f"### `{ent}` ({kind}, {n_thm} characterizing theorem{plural})")
        out.append("")
        for q in sorted(d["questions"]):
            out.append(f"- explored by `{q}`")
        out.append("")

    out.append("## Demand clusters (bottleneck entities)")
    out.append("")
    for ent, qs, firm, leverage in clusters[:15]:
        cand = by_slug.get(ent, [])
        kind = cand[0].kind if cand else "—"
        out.append(
            f"- **`{ent}`** ({kind}, {firm}, leverage {leverage:.1f}) — "
            f"explored by {len(qs)} questions: {', '.join(sorted(qs))}"
        )
    out.append("")

    out.append("## Realization graph")
    out.append("")
    out.append(f"**Concepts without realizers ({len(realization['unrealized_concepts'])}):**")
    out.append("")
    if realization["unrealized_concepts"]:
        out.append(", ".join(f"`{s}`" for s in realization["unrealized_concepts"]))
    out.append("")
    out.append(
        f"**Constructions without `realizes:` ({len(realization['unanchored_constructions'])}):** "
        "may legitimately not realize a named concept, or implicit demand to declare one."
    )
    out.append("")
    if realization["multi_realized"]:
        out.append("**Concepts with multiple realizations:**")
        out.append("")
        for c, rs in realization["multi_realized"][:10]:
            out.append(f"- `{c}` realized by: {', '.join(f'`{r}`' for r in rs)}")
        out.append("")

    out.append("## Concept-splitting candidates")
    out.append("")
    if splits:
        for c in splits:
            out.append(f"- `{c['slug']}` — {c['n_sections']} sections, {c['n_deps']} deps")
    else:
        out.append("*(no candidates surfaced this run)*")
    out.append("")

    out.append("## Possible unnamed common ancestors")
    out.append("")
    if ancestors_view:
        for q1, q2, common, jac in ancestors_view:
            shared = ", ".join(f"`{c}`" for c in sorted(common))
            out.append(f"- `{q1}` ↔ `{q2}` (Jaccard {jac:.2f}). Shared: {shared}")
    else:
        out.append("*(no candidates surfaced this run)*")
    out.append("")

    out.append("## Concepts without characterizing theorems")
    out.append("")
    out.append(
        f"Primitives: {', '.join(f'`{p}`' for p in primitives) if primitives else '*(none)*'}."
    )
    out.append("")
    if loose:
        out.append("Non-primitive concepts with no proved theorem:")
        out.append("")
        for c in loose:
            out.append(f"- `{c}`")
        out.append("")
    else:
        out.append("Every non-primitive concept has at least one characterizing theorem.")
        out.append("")

    out.append("## Load-bearing pillars")
    out.append("")
    for s, c in pillars[:15]:
        cand = by_slug.get(s, [])
        kind = cand[0].kind if cand else "—"
        out.append(f"- `{s}` ({kind}) — {c} theorems")
    out.append("")

    out.append("## Morphisms without characterizing theorems")
    out.append("")
    out.append(f"{len(isolated)} morphisms have no proved theorem about them.")
    out.append("")
    for m in isolated:
        out.append(f"- `{m}`")
    out.append("")

    return "\n".join(out)
