"""``fars move <old> <new>`` — rename or relocate a note, rewriting refs.

``<old>`` is a slug or relative path.
``<new>`` is the new path (relative to ``--root`` or absolute). The new
file's stem becomes the new slug.

Default is ``--dry-run`` (prints what would change). Pass ``--apply``
to actually move the file and rewrite inbound references.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.operator.edit.move_note import move
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="move",
    description="Rename or relocate a note, rewriting every inbound fm + body reference.",
    example="fars move concepts/widget.md objects/widget.md --apply",
    notes="Default is dry-run. Pass --apply to actually move.",
    output="Summary of planned/applied rewrites on stderr; exit 0 in both modes.",
    parameters=(
        Parameter(name="old", kind="positional", required=True,
                  description="slug or path of the note to move"),
        Parameter(name="new", kind="positional", required=True,
                  description="new path (file or directory)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="apply", kind="store_true",
                  description="actually move and rewrite (default is dry-run)"),
    ),
)


def run(old: str, new: str, *,
        root: Path | str = ".",
        apply: bool = False) -> dict | None:
    """Resolve old → file, plan or apply the move. ``None`` if nothing matched."""
    rooted = as_directory(root, "fars move")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)

    old_note = None
    if "/" in old or "\\" in old or old.endswith(".md"):
        normalized = old.replace("\\", "/")
        for n in ws.notes:
            if str(n.path).replace("\\", "/") == normalized:
                old_note = n
                break
    if old_note is None:
        matches = ws.by_slug.get(old.lower(), []) or ws.by_slug.get(old, [])
        if len(matches) == 1:
            old_note = matches[0]
        elif len(matches) > 1:
            return {"error": "ambiguous", "matches": matches}
    if old_note is None:
        return None

    new_path = Path(new)
    if not new_path.is_absolute():
        new_path = rooted / new_path
    new_path = new_path.resolve()
    if new_path.is_dir():
        new_path = new_path / (rooted / old_note.path).name

    return move(old_note, new_path, root=rooted, all_notes=ws.notes,
                dry_run=not apply)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    summary = run(args.old, args.new, root=args.root, apply=args.apply)
    if summary is None:
        if not as_directory(args.root, "fars move"):
            return 2
        print(f"fars move: no note matched {args.old!r}", file=sys.stderr)
        return 1
    if summary.get("error") == "ambiguous":
        ms = summary["matches"]
        print(f"fars move: {len(ms)} notes share slug {args.old!r}; "
              f"pass an explicit path", file=sys.stderr)
        for n in ms:
            print(f"  {n.path}", file=sys.stderr)
        return 2

    print(f"  old: {summary['old']}", file=sys.stderr)
    print(f"  new: {summary['new']}", file=sys.stderr)
    print(f"  slug: {summary['old_slug']} -> {summary['new_slug']}",
          file=sys.stderr)
    print(f"  fm refs to rewrite: {summary['fm_planned']}", file=sys.stderr)
    print(f"  body refs to rewrite: {summary['body_planned']}", file=sys.stderr)
    if args.apply:
        print(f"  moved: {summary['moved']}", file=sys.stderr)
        print(f"  fm rewrites applied: {summary['fm']}", file=sys.stderr)
        print(f"  body rewrites applied: {summary['body']}", file=sys.stderr)
    else:
        print("  (dry-run; pass --apply to execute)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
