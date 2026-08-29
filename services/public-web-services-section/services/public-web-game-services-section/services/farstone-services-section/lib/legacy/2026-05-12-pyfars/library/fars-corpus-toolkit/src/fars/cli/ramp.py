"""``fars ramp <slug>`` — topo-sorted reading list of a slug's ancestors.

Shows every transitive ``depends-on`` ancestor of ``<slug>`` in
just-in-time topological order: dependencies first, the seed last.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.ramp import gather
from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.render.ramp_report import render as render_report
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="ramp",
    description="Topo-sorted reading list of a slug's transitive ancestors.",
    example="fars ramp bilattice",
    notes='Answers "what do I need to read first to understand this?".',
    output="Numbered list with kind, title, and path; --json emits the same as a list of dicts.",
    parameters=(
        Parameter(name="slug", kind="positional", required=True,
                  description="slug whose ramp-up reading list to compute"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of markdown"),
    ),
)


def run(slug: str, *, root: Path | str = ".") -> list | None:
    """Return the topo-sorted ancestor list, or None if slug is unknown."""
    rooted = as_directory(root, "fars ramp")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    if slug not in ws.by_slug:
        return None
    return gather(slug, by_slug=ws.by_slug, depends_on=ws.depends_on)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    ordered = run(args.slug, root=args.root)
    if ordered is None:
        if not as_directory(args.root, "fars ramp"):
            return 2
        print(f"fars ramp: no note with slug {args.slug!r}", file=sys.stderr)
        return 1

    if args.json:
        payload = [{"slug": n.slug, "kind": n.kind,
                    "title": n.fm.get("title") or n.fm.get("name") or n.slug,
                    "path": str(n.path).replace("\\", "/")} for n in ordered]
        sys.stdout.write(render_json(payload,
                                     meta={"seed": args.slug, "n": len(ordered)}))
    else:
        sys.stdout.write(render_report(args.slug, ordered))
    return 0


if __name__ == "__main__":
    sys.exit(main())
