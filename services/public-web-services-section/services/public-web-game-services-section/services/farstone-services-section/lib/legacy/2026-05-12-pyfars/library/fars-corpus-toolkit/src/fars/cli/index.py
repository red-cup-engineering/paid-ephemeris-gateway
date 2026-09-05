"""``fars index [--rebuild | --status]`` — manage the sqlite load cache.

  - default: build/refresh the cache from the current corpus state.
  - ``--status``: report whether the cache exists and is fresh.
  - ``--rebuild``: drop the cache and rebuild from scratch.
  - ``--clear``: remove the cache without rebuilding.

Cache location: ``<root>/.corpus/cache.sqlite``. When fresh, downstream
verbs that opt in via ``cache=True`` skip parse + walk and load notes
directly from sqlite — sub-second whole-repo reads instead of ~7s.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from fars.cli._runner import as_directory
from fars.substrate.index.sqlite_cache import CACHE_REL, is_fresh, write
from fars.substrate.load.notes import load as load_notes
from fars.spec import Parameter, VerbSpec, make_argparse

SPEC = VerbSpec(
    name="index",
    description="Build, refresh, or query the sqlite load cache.",
    example="fars index --rebuild",
    notes="Optional cache; consumers opt in via cache=True. Status / clear flags too.",
    output="Stderr message with build time + path; --status reports freshness.",
    parameters=(
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="status", kind="store_true",
                  description="report cache state and exit"),
        Parameter(name="rebuild", kind="store_true",
                  description="drop the cache and rebuild"),
        Parameter(name="clear", kind="store_true",
                  description="remove the cache without rebuilding"),
    ),
)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    root = as_directory(args.root, "fars index")
    if root is None:
        return 2

    cache_path = root / CACHE_REL

    if args.clear:
        if cache_path.is_file():
            cache_path.unlink()
            print(f"fars index: removed {cache_path}", file=sys.stderr)
        else:
            print("fars index: no cache to clear", file=sys.stderr)
        return 0

    if args.status:
        if not cache_path.is_file():
            print("fars index: no cache present")
            return 1
        fresh = is_fresh(root)
        size = cache_path.stat().st_size
        print(f"fars index: cache at {cache_path}")
        print(f"  size: {size:,} bytes")
        print(f"  fresh: {fresh}")
        return 0 if fresh else 1

    if args.rebuild and cache_path.is_file():
        cache_path.unlink()

    t0 = time.time()
    notes, _ = load_notes(root)
    n = write(root, notes)
    elapsed = time.time() - t0
    print(f"fars index: cached {n} notes in {elapsed:.2f}s -> {cache_path}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
