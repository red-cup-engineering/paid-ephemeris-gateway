"""``fars rewrite-slug <old> <new>`` — rename a slug, file stays in its dir.

Sugar over ``fars move <old> <samedir>/<new>.md`` — locates the
canonical file for ``<old>``, computes the same-directory target with
``<new>`` as the new stem, and runs the move (with all inbound fm/body
ref rewrites). Default dry-run; pass ``--apply``.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.cli._runner import as_directory
from fars.operator.edit.move_note import move
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="rewrite-slug",
    description="Rename a slug everywhere; file stays in its directory.",
    example="corpus rewrite-slug widget gizmo --apply",
    notes="Sugar over `move <old> <samedir>/<new>.md`.",
    output="Stderr summary of planned/applied rewrites.",
    parameters=(
        Parameter(name="old", kind="positional", required=True,
                  description="current slug"),
        Parameter(name="new", kind="positional", required=True,
                  description="new slug"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="apply", kind="store_true",
                  description="actually rewrite (default is dry-run)"),
    ),
)


def run(old: str, new: str, *,
        root: Path | str = ".",
        apply: bool = False) -> dict | None:
    """Resolve old → file, plan or apply the same-dir slug rename."""
    rooted = as_directory(root, "corpus rewrite-slug")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)

    matches = ws.by_slug.get(old.lower(), []) or ws.by_slug.get(old, [])
    if not matches:
        return None
    if len(matches) > 1:
        return {"error": "ambiguous", "matches": matches}

    note = matches[0]
    old_full = (rooted / note.path).resolve()
    new_full = old_full.with_name(f"{new}.md")
    return move(note, new_full, root=rooted, all_notes=ws.notes,
                dry_run=not apply)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    summary = run(args.old, args.new, root=args.root, apply=args.apply)
    if summary is None:
        if not as_directory(args.root, "corpus rewrite-slug"):
            return 2
        print(f"corpus rewrite-slug: no note with slug {args.old!r}",
              file=sys.stderr)
        return 1
    if summary.get("error") == "ambiguous":
        ms = summary["matches"]
        print(f"corpus rewrite-slug: {len(ms)} notes share slug {args.old!r}; "
              f"use `move <path>` for a specific file", file=sys.stderr)
        for n in ms:
            print(f"  {n.path}", file=sys.stderr)
        return 2

    rooted = Path(args.root).resolve()
    print(f"  {Path(summary['old']).relative_to(rooted)}  ->  "
          f"{Path(summary['new']).relative_to(rooted)}", file=sys.stderr)
    print(f"  slug: {summary['old_slug']} -> {summary['new_slug']}",
          file=sys.stderr)
    print(f"  fm refs to rewrite: {summary['fm_planned']}", file=sys.stderr)
    print(f"  body refs to rewrite: {summary['body_planned']}", file=sys.stderr)
    if args.apply:
        print(f"  fm rewrites applied: {summary['fm']}", file=sys.stderr)
        print(f"  body rewrites applied: {summary['body']}", file=sys.stderr)
    else:
        print("  (dry-run; pass --apply to execute)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
