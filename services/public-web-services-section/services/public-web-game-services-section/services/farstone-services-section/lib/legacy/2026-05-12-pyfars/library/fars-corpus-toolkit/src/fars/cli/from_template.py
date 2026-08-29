"""``fars from-template <source-slug> <new-slug>`` — clone an fm shape.

Reads the source note, copies its frontmatter *keys* (with empty values
for scalars and empty lists for sequences, except ``kind:`` and
``component-of:`` which are copied verbatim), and writes a new note
with the same body skeleton structure (rubric H2s if the source has
them, else empty). Useful for "I want a new theorem shaped like this
existing one" without retyping the field set.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.render.fm_dump import dump as fm_dump
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="from-template",
    description="Clone an existing note's frontmatter shape under a new slug.",
    example="corpus from-template bilattice four-bilattice",
    notes="Copies fm keys (clears values), preserves `kind:` and `component-of:`.",
    output="Writes <source-dir>/<new-slug>.md (or --out path); --stdout prints instead.",
    parameters=(
        Parameter(name="source", kind="positional", required=True,
                  description="slug or path of the template note"),
        Parameter(name="new_slug", kind="positional", required=True,
                  description="slug for the new note"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="out", kind="flag", type=Path, default=None,
                  description="explicit target path (default: source's dir / new-slug.md)"),
        Parameter(name="keep_values", kind="store_true",
                  description="copy fm values verbatim instead of clearing"),
        Parameter(name="stdout", kind="store_true",
                  description="print scaffold to stdout instead of writing a file"),
        Parameter(name="force", kind="store_true",
                  description="overwrite if the target file already exists"),
    ),
)


def _empty_value(v):
    if isinstance(v, list):
        return []
    if isinstance(v, dict):
        return {}
    if isinstance(v, bool):
        return False
    if isinstance(v, (int, float)):
        return 0
    return ""


_H2_RE = re.compile(r"^## .+$", re.MULTILINE)


def run(source: str, new_slug: str, *,
        root: Path | str = ".",
        keep_values: bool = False) -> tuple[str, Path] | None:
    """Render the cloned scaffold and return ``(rendered, target_path)``.
    Target path is the default location; caller may override."""
    rooted = as_directory(root, "corpus from-template")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    matches = (ws.by_slug.get(source.lower(), [])
               or ws.by_slug.get(source, []))
    if not matches:
        return None
    src = matches[0]

    new_fm: dict = {}
    for k, v in src.fm.items():
        if k in ("kind", "component-of") or keep_values:
            new_fm[k] = v
        else:
            new_fm[k] = _empty_value(v)
    new_fm["title"] = new_slug.replace("-", " ").capitalize()

    headings = _H2_RE.findall(src.body)
    body_skeleton = "\n\n".join(headings) + "\n" if headings else ""

    fm_yaml = fm_dump(new_fm).rstrip() + "\n"
    rendered = f"---\n{fm_yaml}---\n\n{body_skeleton}"
    target = (rooted / src.path).parent / f"{new_slug}.md"
    return rendered, target.resolve()


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(args.source, args.new_slug, root=args.root,
                 keep_values=args.keep_values)
    if result is None:
        if not as_directory(args.root, "corpus from-template"):
            return 2
        print(f"corpus from-template: no note with slug {args.source!r}",
              file=sys.stderr)
        return 1
    rendered, default_target = result

    if args.stdout:
        sys.stdout.write(rendered)
        return 0

    target = (args.out.resolve() if args.out else default_target)
    if target.exists() and not args.force:
        print(f"corpus from-template: target exists (pass --force): {target}",
              file=sys.stderr)
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered, encoding="utf-8")
    print(f"corpus from-template: wrote {target}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
