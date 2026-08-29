"""``fars compose <path>`` — render the subtree as a single markdown monograph.

If any note declares ``kind: narrative`` with a ``chapters:`` list, walks
parts → chapters → blocks. Otherwise topo-sorts every note by
``depends-on`` and renders each as a block (the "monograph of algebra"
case where no explicit narrative structure exists).

Output goes to ``<root>/monograph.md`` by default, or stdout with ``--stdout``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.monograph import render as render_monograph
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="compose",
    description="Render the subtree as a single markdown monograph.",
    example="fars compose library/.../math/theories/algebra --title Algebra",
    notes="Falls back to flat topo-sort when no narratives with `chapters:` exist.",
    output="Writes <root>/monograph.md or prints to stdout with --stdout.",
    parameters=(
        Parameter(name="path", kind="positional", required=False, default=".",
                  description="directory to compose (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="write monograph here (default: <root>/monograph.md)"),
        Parameter(name="stdout", kind="store_true",
                  description="print to stdout instead of writing a file"),
        Parameter(name="title", kind="flag", default=None,
                  description="override the title (default: root dir name)"),
        Parameter(name="subtitle", kind="flag", default=None,
                  description="optional subtitle"),
        Parameter(name="bib", kind="flag", default=None,
                  description="path/relpath for the bibliography YAML key"),
    ),
)


def run(*, path: Path | str = ".",
        title: str | None = None,
        subtitle: str | None = None,
        bib: str | None = None) -> tuple | None:
    """Render the monograph and return ``(rendered, n_notes, n_parse_diags, root)``."""
    rooted = as_directory(path, "fars compose")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    rendered = render_monograph(
        ws.notes,
        title=title or ws.root.name,
        subtitle=subtitle,
        bib_relpath=bib,
    )
    return rendered, len(ws.notes), len(ws.parse_diagnostics), ws.root


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(path=args.path, title=args.title,
                 subtitle=args.subtitle, bib=args.bib)
    if result is None:
        return 2
    rendered, n_notes, n_parse_diags, root = result

    if args.stdout:
        sys.stdout.write(rendered)
    else:
        out_path = args.out or (root / "monograph.md")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(rendered, encoding="utf-8")
        print(f"fars compose: {n_notes} notes -> {out_path}  "
              f"({len(rendered):,} chars)", file=sys.stderr)

    if n_parse_diags:
        print(f"  {n_parse_diags} parse diagnostics suppressed; "
              f"run `validate` to surface", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
