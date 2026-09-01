"""``fars impact <slug>`` — descendants ranked by status (proved first).

Useful before editing a load-bearing slug: shows what proofs / draft
theorems / anchors / examples depend on it transitively.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.impact import gather
from fars.cli._runner import as_directory
from fars.render.impact_report import render as render_report
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="impact",
    description="Transitive descendants of a slug, ranked by status (proved first).",
    example="fars impact bilattice",
    notes="Run before editing a load-bearing slug to see what proofs are at risk.",
    output="Markdown sections (proved theorems / drafts / anchors / examples), or JSON.",
    parameters=(
        Parameter(name="slug", kind="positional", required=True,
                  description="slug to analyze"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(slug: str, *, root: Path | str = ".") -> dict | None:
    """Return the impact dict for ``slug``, or None if the slug is unknown."""
    rooted = as_directory(root, "fars impact")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    if slug not in ws.by_slug:
        return None
    return gather(slug, by_slug=ws.by_slug, dependents=ws.dependents)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    impact = run(args.slug, root=args.root)
    if impact is None:
        if not as_directory(args.root, "fars impact"):
            return 2
        print(f"fars impact: no note with slug {args.slug!r}", file=sys.stderr)
        return 1
    if args.json:
        sys.stdout.write(render_json(impact))
    else:
        sys.stdout.write(render_report(impact))
    return 0


if __name__ == "__main__":
    sys.exit(main())
