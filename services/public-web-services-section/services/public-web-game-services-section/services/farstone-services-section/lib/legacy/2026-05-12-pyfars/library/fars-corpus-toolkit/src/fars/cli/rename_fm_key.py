"""``fars rename-fm-key <old> <new>`` — bulk-rename a frontmatter key.

Walks every note in the corpus and renames ``<old>`` to ``<new>`` in
its frontmatter, preserving key order. Default is dry-run; pass
``--apply`` to write the changes.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.operator.edit.rename_fm_key import rename
from fars.operator.edit.rewrite_fm import apply
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="rename-fm-key",
    description="Bulk-rename a frontmatter key across the fars.",
    example="corpus rename-fm-key date-created date_created --apply",
    notes="Default dry-run.",
    output="Stderr summary listing affected files; with --apply, count of files written.",
    parameters=(
        Parameter(name="old", kind="positional", required=True,
                  description="old frontmatter key name"),
        Parameter(name="new", kind="positional", required=True,
                  description="new frontmatter key name"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="apply", kind="store_true",
                  description="write changes (default is dry-run)"),
    ),
)


def run(old: str, new: str, *,
        root: Path | str = ".",
        apply_: bool = False) -> tuple[list, int] | None:
    """Find affected notes and (when ``apply_``) rewrite them.
    Returns ``(affected_notes, n_written)``."""
    rooted = as_directory(root, "corpus rename-fm-key")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    affected = [n for n in ws.notes if old in n.fm]
    if not apply_:
        return affected, 0

    written = 0
    for n in affected:
        new_fm = rename(n.fm, old, new)
        if new_fm is not n.fm:
            apply(rooted / n.path, new_fm)
            written += 1
    return affected, written


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    result = run(args.old, args.new, root=args.root, apply_=args.apply)
    if result is None:
        return 2
    affected, written = result

    print(f"corpus rename-fm-key: {len(affected)} notes have key `{args.old}`",
          file=sys.stderr)
    for n in affected[:20]:
        print(f"  {n.path}", file=sys.stderr)
    if len(affected) > 20:
        print(f"  (+{len(affected) - 20} more)", file=sys.stderr)

    if not args.apply:
        print("  (dry-run; pass --apply to execute)", file=sys.stderr)
        return 0
    print(f"  wrote {written} files", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
