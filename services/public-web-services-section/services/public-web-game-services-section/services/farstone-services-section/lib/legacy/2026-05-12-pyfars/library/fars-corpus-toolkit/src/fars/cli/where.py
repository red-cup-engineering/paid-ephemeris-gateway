"""``fars where <kind> [slug]`` — suggest where a new note of this kind goes.

Counts the dirs every existing ``<kind>`` note lives in and ranks them.
The most common dir is the corpus's de-facto convention for that kind.
``<slug>`` is optional — when given, the top suggestion's path is
emitted as ``<dir>/<slug>.md`` for a one-shot ``fars new`` setup.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.where import propose
from fars.cli._runner import as_directory
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="where",
    description="Suggest the canonical directory for a new note of a given kind.",
    example="fars where theorem widget-soundness",
    notes="Frequency analysis over existing notes' parent directories.",
    output="Markdown table when slug omitted; the canonical relative path when slug given.",
    parameters=(
        Parameter(name="kind", kind="positional", required=True,
                  description="note kind (concept, theorem, ...)"),
        Parameter(name="slug", kind="positional", required=False,
                  description="optional slug for the new note"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
    ),
)


def run(kind: str, slug: str | None = None, *,
        root: Path | str = ".") -> list[tuple[str, int, list[str]]] | None:
    """Return ranked dir suggestions for the given kind."""
    rooted = as_directory(root, "fars where")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    return propose(ws.notes, kind=kind)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    suggestions = run(args.kind, args.slug, root=args.root)
    if suggestions is None:
        return 2
    if not suggestions:
        print(f"fars where: no notes of kind {args.kind!r}", file=sys.stderr)
        return 1

    if args.slug:
        top_dir = suggestions[0][0]
        print(f"{top_dir}/{args.slug}.md")
        print(f"\n{len(suggestions)} candidate dirs ranked by frequency:",
              file=sys.stderr)
    else:
        print(f"# Where do `{args.kind}` notes live?")
        print()
        print("| count | dir | sample slugs |")
        print("|---:|---|---|")
    for d, c, sample in suggestions:
        sample_str = ", ".join(f"`{s}`" for s in sample)
        if args.slug:
            print(f"  {c:4d}  {d}  ({sample_str})", file=sys.stderr)
        else:
            print(f"| {c} | `{d}` | {sample_str} |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
