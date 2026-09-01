"""``fars fm-keys`` — every frontmatter key, ranked by frequency.

Surfaces drift (``Date-Created`` vs ``date-created``), rare keys, and
typo candidates. Pairs naturally with ``fars rename-fm-key`` for
cleanup.
"""
from __future__ import annotations

import sys
from pathlib import Path

from fars.analyze.fm_keys import gather
from fars.cli._runner import as_directory
from fars.render.json_dump import dump as render_json
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="fm-keys",
    description="Every frontmatter key in the corpus, ranked by frequency.",
    example="fars fm-keys --rare",
    notes="`--rare` shows only keys used by ≤3 notes — drift / typo detector.",
    output="Plain text table (count + key + sample value), or JSON with samples.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="limit", kind="flag", type=int, default=80,
                  description="max rows to emit (default: 80)"),
        Parameter(name="rare", kind="store_true",
                  description="show only keys used by ≤3 notes (drift detector)"),
        Parameter(name="json", kind="store_true",
                  description="emit JSON instead of plain text"),
    ),
)


def run(*, root: Path | str = ".", limit: int = 80,
        rare: bool = False) -> list[tuple[str, int, list[str], list[str]]] | None:
    """Return the per-key frequency rows, filtered by ``rare`` and capped at ``limit``."""
    rooted = as_directory(root, "fars fm-keys")
    if rooted is None:
        return None
    from fars.substrate.store import Substrate
    ws = Substrate(root=rooted)
    rows = gather(ws.notes)
    if rare:
        rows = [r for r in rows if r[1] <= 3]
    return rows[:limit]


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    rows = run(root=args.root, limit=args.limit, rare=args.rare)
    if rows is None:
        return 2

    if args.json:
        payload = [
            {"key": k, "count": c, "sample_values": vs, "sample_paths": ps}
            for k, c, vs, ps in rows
        ]
        sys.stdout.write(render_json(payload, meta={"total_keys": len(rows)}))
        return 0

    print(f"# {len(rows)} frontmatter keys")
    print()
    print(f"{'count':>6}  key")
    print("-" * 60)
    for k, c, vs, _ in rows:
        sample = vs[0] if vs else ""
        print(f"  {c:5d}  {k:30s}  e.g. {sample}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
