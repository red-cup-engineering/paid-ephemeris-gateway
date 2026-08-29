"""``fars snapshot [--label NAME] [--list] [--no-git]`` — save corpus state.

Default: stashes every uncommitted .md change with an auto-generated
label. ``--list`` prints existing snapshots. ``--no-git`` forces a
filesystem copy under ``.corpus/snapshots/<label>/`` for non-git repos
or when you want a guaranteed-untouchable backup.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.operator.edit.snapshot import list_snapshots, save
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="snapshot",
    description="Save current corpus state via git stash (or filesystem copy).",
    example="fars snapshot --label before-bulk-edit",
    notes="`--list` shows existing snapshots; `--no-git` forces filesystem mode.",
    output="Stderr summary with mode + label; --list prints existing snapshots.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="label", kind="flag", default=None,
                  description="snapshot label (default: UTC timestamp)"),
        Parameter(name="list", kind="store_true",
                  description="show existing snapshots and exit"),
        Parameter(name="no_git", kind="store_true",
                  description="force filesystem-copy mode"),
    ),
)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    root = as_directory(args.root, "fars snapshot")
    if root is None:
        return 2

    if args.list:
        snaps = list_snapshots(root)
        if not snaps:
            print("fars snapshot: no snapshots found")
            return 0
        for s in snaps:
            extra = (s.get("stash") or s.get("path") or "")
            print(f"  [{s['mode']}]  {s['label']}  {extra}")
        return 0

    result = save(root, label=args.label, use_git=not args.no_git)
    if result.get("empty"):
        print("fars snapshot: nothing to save", file=sys.stderr)
        return 0
    print(f"fars snapshot: {result['mode']} mode, label={result['label']}",
          file=sys.stderr)
    if result["mode"] == "fs":
        print(f"  saved {result['n_files']} files to {result['snap_dir']}",
              file=sys.stderr)
    else:
        print(f"  git stash: {result['stash_msg']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
