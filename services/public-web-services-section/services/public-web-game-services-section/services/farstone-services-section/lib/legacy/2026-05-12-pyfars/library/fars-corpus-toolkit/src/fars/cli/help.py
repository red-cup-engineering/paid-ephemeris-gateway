"""``fars help <verb>`` — usage + worked example for one verb.

This module is also the legacy fallback source of truth for verb
descriptions: ``description_for(verb)`` returns the one-line summary
that ``cli/_runner.make_parser`` injects as argparse's description for
verbs that haven't migrated to ``SPEC``-driven definitions. Spec-driven
verbs read their description from their own ``SPEC.description``.
"""
from __future__ import annotations

import importlib
import sys

from fars.spec import Parameter, VerbSpec, format_help, make_argparse

SPEC = VerbSpec(
    name="help",
    description="Print usage + worked example for one verb.",
    example="fars help validate",
    notes="With no verb, lists every verb. Spec-driven verbs render full parameter docs.",
    output="Markdown help section for the verb on stdout.",
    parameters=(
        Parameter(name="verb", kind="positional", required=False, default=None,
                  description="verb to describe (omit to list all)"),
    ),
)


def description_for(verb: str) -> str | None:
    """Return the one-line description for a verb, or None if unknown."""
    entry = _HELP.get(verb)
    return entry[0] if entry else None

# (verb name, one-line description, example invocation, optional notes)
_HELP: dict[str, tuple[str, str, str]] = {
    "agents": (
        "List registered agents in the discovered FARS profile.",
        "fars agents",
        "Reads `.fars/config.toml`; one line per agent with caps and skills.",
    ),
    "audit": (
        "Structural-risk analysis of the depends-on graph (load-bearing slugs, body-vs-deps mismatches).",
        "fars audit library/domains/humanities/.../predication-categories",
        "Writes <root>/dependency-audit.md by default.",
    ),
    "check": (
        "Fast single-file validate.",
        "fars check path/to/note.md",
        "Use this in agent edit loops; full corpus checks belong to `validate`.",
    ),
    "cite": (
        "Generate references.bib from inline `references:` blocks + annotation files.",
        "fars cite . --check",
        "`--check` validates without writing.",
    ),
    "commit": (
        "Stage corpus .md changes and commit with an auto-generated message.",
        "fars commit --apply",
        "Default dry-run; refuses to touch non-.md files.",
    ),
    "compose": (
        "Render the subtree as a single markdown monograph.",
        "fars compose library/.../math/theories/algebra --title Algebra",
        "Falls back to flat topo-sort when no narratives with `chapters:` exist.",
    ),
    "context": (
        "Bounded-budget BFS subgraph from a slug for LLM context injection.",
        "fars context bilattice --depth 2 --budget 8000",
        "Use this to load a slug + its dep neighborhood as one prompt blob.",
    ),
    "diff": (
        "Run check rules on every .md changed since a git ref.",
        "fars diff --since main",
        "Useful in CI / pre-commit. Includes uncommitted unless --committed-only.",
    ),
    "dispatch": (
        "Find agents eligible to take an operational task.",
        "fars dispatch achievement-system",
        "Filters by work-type, skills, capabilities, jurisdiction, charter; sorts by load.",
    ),
    "fm": (
        "Read or mutate a note's frontmatter without YAML editing.",
        'fars fm widget --set "description=A small testing widget." --add depends-on=base',
        "Without operations, prints the current frontmatter as YAML.",
    ),
    "fm-keys": (
        "Every frontmatter key in the corpus, ranked by frequency.",
        "fars fm-keys --rare",
        "`--rare` shows only keys used by ≤3 notes — drift / typo detector.",
    ),
    "from-template": (
        "Clone an existing note's frontmatter shape under a new slug.",
        "corpus from-template bilattice four-bilattice",
        "Copies fm keys (clears values), preserves `kind:` and `component-of:`.",
    ),
    "impact": (
        "Transitive descendants of a slug, ranked by status (proved first).",
        "fars impact bilattice",
        "Run before editing a load-bearing slug.",
    ),
    "index": (
        "Build, refresh, or query the sqlite load cache.",
        "fars index --rebuild",
        "Optional cache; consumers opt in via cache=True. Status / clear flags too.",
    ),
    "install-hooks": (
        "Drop a pre-commit hook running `fars diff --since HEAD --committed-only`.",
        "corpus install-hooks",
        "`--uninstall` removes the managed block.",
    ),
    "lint": (
        "List or auto-fix common corpus problems (missing depends-on, empty description, key casing, ...).",
        "fars lint --fix --code missing-trailing-newline",
        "Without --fix, just lists. With --code X, runs only that linter.",
    ),
    "list": (
        "Enumerate notes by kind / domain / path substring.",
        "fars list --kind theorem --domain theorems",
        "Add --json for machine-readable output.",
    ),
    "list-verbs": (
        "Emit the verb catalog with descriptions + examples.",
        "fars list-verbs --json",
        "Designed for tooling integrations (MCP servers, IDE plugins).",
    ),
    "mcp": (
        "Run an MCP server exposing every corpus verb as a tool.",
        "fars mcp --root .",
        "Requires `pip install mcp`. Stdio transport — designed to be launched as a subprocess.",
    ),
    "move": (
        "Rename or relocate a note, rewriting every inbound fm + body reference.",
        "fars move concepts/widget.md objects/widget.md --apply",
        "Default is dry-run. Pass --apply to actually move.",
    ),
    "new": (
        "Scaffold a new note with kind-correct frontmatter and rubric body.",
        "fars new theorem widget-soundness --depends-on widget",
        "Avoids YAML errors at creation time.",
    ),
    "plan": (
        "Research-demand views: question readiness, enablement frontier, realization gaps.",
        "fars plan library/domains/humanities/.../predication-categories",
        "Writes <root>/research-program.md by default.",
    ),
    "profile": (
        "Show the discovered FARS instance profile.",
        "fars profile",
        "Walks parents from CWD looking for .fars/config.toml.",
    ),
    "query": (
        "18 read-only graph + EAVT subcommands (asks, fiber, neighborhood, nominate, champion, ...).",
        "fars query nominate",
        "Run `fars query` with no subcommand to see the full list.",
    ),
    "ramp": (
        "Topo-sorted reading list of a slug's transitive ancestors.",
        "fars ramp bilattice",
        'Answers "what do I need to read first to understand this?".',
    ),
    "rename-fm-key": (
        "Bulk-rename a frontmatter key across the fars.",
        "corpus rename-fm-key date-created date_created --apply",
        "Default dry-run.",
    ),
    "rewrite-slug": (
        "Rename a slug everywhere; file stays in its directory.",
        "corpus rewrite-slug widget gizmo --apply",
        "Sugar over `move <old> <samedir>/<new>.md`.",
    ),
    "search": (
        "Ranked text + frontmatter search.",
        'fars search "bilattice" --kind concept --limit 10',
        "Title=10, slug=8, description=4, body=1 weighting; --regex for regex.",
    ),
    "show": (
        "Pretty-print a note + its in/out edges.",
        "fars show bilattice",
        "First tool to reach for when an agent needs to know what a slug is.",
    ),
    "snapshot": (
        "Save current corpus state via git stash (or filesystem copy).",
        "fars snapshot --label before-bulk-edit",
        "`--list` shows existing snapshots; `--no-git` forces filesystem mode.",
    ),
    "stats": (
        "One-shot corpus health overview (counts, edges, broken links, top load-bearing).",
        "fars stats",
        "",
    ),
    "undo": (
        "Restore from a snapshot — overwrite current files with snapshot content.",
        "fars undo before-bulk-edit",
        "Restore semantics, not merge: post-snapshot edits to those files are lost.",
    ),
    "validate": (
        "Run every default rule and emit a markdown diagnostic report.",
        "fars validate library/domains/humanities/.../predication-categories",
        "Exits 1 if any error-severity diagnostic was emitted.",
    ),
    "watch": (
        "Re-run a verb on file changes; the wrapped invocation gets argv passthrough.",
        "fars watch validate library/domains/humanities/.../predication-categories",
        "Polls every --interval seconds (default 1.5). Ctrl-C to stop.",
    ),
    "where": (
        "Suggest the canonical directory for a new note of a given kind.",
        "fars where theorem widget-soundness",
        "Frequency analysis over existing notes' parent directories.",
    ),
    "witness-log": (
        "Tail the FARS event log (witness chain).",
        "fars witness-log --tail 50",
        "Reads `<root>/.fars/event-log/`; one line per witness.",
    ),
}


def _spec_for(verb: str) -> VerbSpec | None:
    """Return the verb's SPEC if it has migrated, else None."""
    from fars.cli.__main__ import VERB_MODULES
    if verb not in VERB_MODULES:
        return None
    try:
        module = importlib.import_module(f"fars.cli.{VERB_MODULES[verb]}")
    except ImportError:
        return None
    return getattr(module, "SPEC", None)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)

    if args.verb is None:
        print("usage: fars help <verb>", file=sys.stderr)
        print("\nverbs:", file=sys.stderr)
        from fars.cli.__main__ import VERB_MODULES
        for v in sorted(VERB_MODULES):
            spec = _spec_for(v)
            desc = (spec.description if spec is not None
                    else (_HELP.get(v, ("",))[0]))
            print(f"  {v:18s}  {desc}", file=sys.stderr)
        return 1

    verb = args.verb
    spec = _spec_for(verb)
    if spec is not None:
        print(format_help(spec))
        return 0

    if verb not in _HELP:
        print(f"fars help: unknown verb {verb!r}", file=sys.stderr)
        print("verbs: " + ", ".join(sorted(_HELP)), file=sys.stderr)
        return 2

    desc, example, notes = _HELP[verb]
    print(f"# corpus {verb}")
    print()
    print(desc)
    print()
    print("## Example")
    print()
    print(f"    $ {example}")
    print()
    if notes:
        print(notes)
        print()
    print("## Argparse details")
    print()
    print(f"Run `fars {verb} --help` for the full flag list.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
