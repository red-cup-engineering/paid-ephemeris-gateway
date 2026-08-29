"""``fars fm <slug-or-path>`` — read/mutate a note's frontmatter.

Operations (apply in declared order):
  --set k=v          set a scalar field
  --add k=item       append to a list field (creating it if absent)
  --rm k             delete a field
  --rm-item k=item   delete one item from a list field

Without operations, prints the current frontmatter as YAML.
``--dry-run`` prints the proposed new frontmatter without writing.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.operator.edit.fm_add import add_item
from fars.operator.edit.fm_rm import remove
from fars.operator.edit.fm_set import set_field
from fars.operator.edit.rewrite_fm import apply
from fars.render.fm_dump import dump
from fars.spec import Parameter, VerbSpec, make_argparse
from fars.substrate.store import Substrate


def _parse_kv(s: str) -> tuple[str, str]:
    if "=" not in s:
        raise argparse.ArgumentTypeError(f"expected k=v, got {s!r}")
    k, _, v = s.partition("=")
    return k.strip(), v


SPEC = VerbSpec(
    name="fm",
    description="Read or mutate a note's frontmatter without YAML editing.",
    example='fars fm widget --set "description=A small testing widget." --add depends-on=base',
    notes="Without operations, prints the current frontmatter as YAML.",
    output="YAML on stdout (read mode); writes the file in place (mutate mode); `--dry-run` prints without writing.",
    parameters=(
        Parameter(name="target", kind="positional", required=True,
                  description="slug or path of the note"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="set", kind="append", type=_parse_kv, default=[],
                  metavar="k=v", description="set a scalar field"),
        Parameter(name="add", kind="append", type=_parse_kv, default=[],
                  metavar="k=item", description="append to a list field"),
        Parameter(name="rm", kind="append", default=[],
                  metavar="k", description="delete a field"),
        Parameter(name="rm_item", kind="append", type=_parse_kv, default=[],
                  metavar="k=item",
                  description="delete one item from a list field"),
        Parameter(name="dry_run", kind="store_true",
                  description="print the proposed new frontmatter without writing"),
    ),
)


class _AmbiguousTarget(Exception):
    """Raised when a target slug resolves to more than one note."""

    def __init__(self, slug: str, matches):
        self.slug = slug
        self.matches = matches


def _resolve_target(target: str, ws: Substrate) -> Path | None:
    if "/" in target or "\\" in target or target.endswith(".md"):
        candidate = Path(target)
        if not candidate.is_absolute():
            candidate = (ws.root / candidate).resolve()
        if candidate.is_file():
            return candidate
    matches = ws.by_slug.get(target.lower(), []) or ws.by_slug.get(target, [])
    if not matches:
        return None
    if len(matches) > 1:
        raise _AmbiguousTarget(target, matches)
    return (ws.root / matches[0].path).resolve()


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    rooted = as_directory(args.root, "fars fm")
    if rooted is None:
        return 2
    ws = Substrate(root=rooted)

    try:
        file_path = _resolve_target(args.target, ws)
    except _AmbiguousTarget as e:
        print(f"fars fm: {len(e.matches)} notes share slug {e.slug!r}; "
              f"pass an explicit path", file=sys.stderr)
        for n in e.matches:
            print(f"  {n.path}", file=sys.stderr)
        return 2
    if file_path is None:
        print(f"fars fm: no note matched {args.target!r}", file=sys.stderr)
        return 1

    from fars.substrate.parse.frontmatter import parse as parse_fm
    text = file_path.read_text(encoding="utf-8")
    fm, _ = parse_fm(text)
    if fm is None:
        fm = {}

    if not (args.set or args.add or args.rm or args.rm_item):
        sys.stdout.write(dump(fm))
        return 0

    new_fm = dict(fm)
    for k, v in args.set:
        new_fm = set_field(new_fm, k, v)
    for k, v in args.add:
        new_fm = add_item(new_fm, k, v)
    for k in args.rm:
        new_fm = remove(new_fm, k)
    for k, v in args.rm_item:
        new_fm = remove(new_fm, k, v)

    if args.dry_run:
        sys.stdout.write(dump(new_fm))
        return 0

    apply(file_path, new_fm)
    print(f"fars fm: wrote {file_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
