"""``fars new <kind> <slug>`` — scaffold a new note.

Default target: ``<root>/<kind>s/<slug>.md`` (kinds pluralize naively
by appending ``s``). Use ``--dir`` to override the subdirectory or
``--out`` to specify a full path. ``--component-of`` fills the parent
domain; ``--depends-on a,b`` seeds the depends-on list.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.note_template import render as render_template
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="new",
    description="Scaffold a new note with kind-correct frontmatter and rubric body.",
    example="fars new theorem widget-soundness --depends-on widget",
    notes="Avoids YAML errors at creation time.",
    output="Writes <root>/<kind>s/<slug>.md (or --out path); --stdout prints instead.",
    parameters=(
        Parameter(name="kind", kind="positional", required=True,
                  description="note kind: concept, definition, theorem, ..."),
        Parameter(name="slug", kind="positional", required=True,
                  description="slug for the new note"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="dir", kind="flag", default=None,
                  description="subdirectory under root (default: <kind>s)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="explicit output path; overrides --root/--dir"),
        Parameter(name="title", kind="flag", default=None,
                  description="note title (default: derived from slug)"),
        Parameter(name="component_of", kind="flag", default=None,
                  description="parent domain slug"),
        Parameter(name="depends_on", kind="flag", default=None,
                  description="comma-separated initial depends-on slugs"),
        Parameter(name="force", kind="store_true",
                  description="overwrite if the target file already exists"),
        Parameter(name="stdout", kind="store_true",
                  description="print scaffold to stdout instead of writing a file"),
    ),
)


def _pluralize_kind(kind: str) -> str:
    return kind + "s" if not kind.endswith("s") else kind


def run(kind: str, slug: str, *,
        root: Path | str = ".",
        dir: str | None = None,
        out: Path | None = None,
        title: str | None = None,
        component_of: str | None = None,
        depends_on: str | None = None) -> str | None:
    """Render the scaffold body. Doesn't write — caller decides where."""
    deps = (
        [s.strip() for s in depends_on.split(",") if s.strip()]
        if depends_on else None
    )
    if component_of is None:
        if out is not None:
            component_of = Path(out).resolve().parent.parent.name
        else:
            component_of = Path(root).resolve().name
    return render_template(
        kind=kind, slug=slug, title=title,
        component_of=component_of, depends_on=deps,
    )


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    body = run(args.kind, args.slug, root=args.root, dir=args.dir,
               out=args.out, title=args.title,
               component_of=args.component_of, depends_on=args.depends_on)

    if args.stdout:
        sys.stdout.write(body)
        return 0

    if args.out is not None:
        target = args.out.resolve()
    else:
        root = as_directory(args.root, "fars new")
        if root is None:
            return 2
        sub = args.dir or _pluralize_kind(args.kind)
        target = (root / sub / f"{args.slug}.md").resolve()

    if target.exists() and not args.force:
        print(f"fars new: target exists (pass --force to overwrite): {target}",
              file=sys.stderr)
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")
    print(f"fars new: wrote {target}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
