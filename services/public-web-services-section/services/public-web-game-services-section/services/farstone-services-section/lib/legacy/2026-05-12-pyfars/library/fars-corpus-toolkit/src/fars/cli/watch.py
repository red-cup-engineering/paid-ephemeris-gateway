"""``fars watch <verb> [args...]`` — re-run a verb on file changes.

Polls the corpus tree every ``--interval`` seconds; when any tracked
file's mtime changes, re-runs the verb. Useful for tight agent edit
loops where you want continuous feedback from ``validate`` or ``check``.

  $ fars watch validate library/domains/humanities/.../predication-categories
  $ fars watch check path/to/note.md

The wrapped invocation gets the corpus' own argv handling, so flags
pass through verbatim.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Callable

from fars.cli import (
    audit, check, cite, compose, context, diff, fm, fm_keys, impact, lint,
    list as list_cli, plan, ramp, search, show, stats, validate, where,
)
from fars.cli._runner import as_directory
from fars.cli.query import __main__ as query_main

# Verbs that make sense to re-run on file changes (read-only / fast).
_WATCHABLE: dict[str, Callable[[list[str] | None], int]] = {
    "audit": audit.main,
    "check": check.main,
    "cite": cite.main,
    "compose": compose.main,
    "context": context.main,
    "diff": diff.main,
    "fm": fm.main,
    "fm-keys": fm_keys.main,
    "impact": impact.main,
    "lint": lint.main,
    "list": list_cli.main,
    "plan": plan.main,
    "query": query_main.main,
    "ramp": ramp.main,
    "search": search.main,
    "show": show.main,
    "stats": stats.main,
    "validate": validate.main,
    "where": where.main,
}


def _snapshot(root: Path) -> dict[Path, float]:
    out: dict[Path, float] = {}
    for p in root.rglob("*.md"):
        try:
            out[p] = p.stat().st_mtime
        except OSError:
            continue
    return out


def main(argv: list[str] | None = None) -> int:
    # Custom parser: doesn't use make_parser because watch has REMAINDER args
    # that conflict with auto-injected --root. We resolve --root explicitly.
    ap = argparse.ArgumentParser(prog="fars watch", add_help=False)
    ap.add_argument("--root", "-r", default=".")
    ap.add_argument("--interval", type=float, default=1.5,
                    help="poll interval in seconds (default: 1.5)")
    ap.add_argument("verb", help="verb to re-run on changes")
    ap.add_argument("verb_args", nargs=argparse.REMAINDER)
    parsed = ap.parse_args(argv)

    if parsed.verb not in _WATCHABLE:
        print(f"fars watch: not watchable: {parsed.verb!r}", file=sys.stderr)
        print("watchable: " + ", ".join(sorted(_WATCHABLE)), file=sys.stderr)
        return 2

    root = as_directory(parsed.root, "fars watch")
    if root is None:
        return 2

    fn = _WATCHABLE[parsed.verb]
    print(f"fars watch: tracking {root}, running `fars {parsed.verb}` "
          f"every {parsed.interval}s", file=sys.stderr)

    last = _snapshot(root)
    print("--- initial run ---", file=sys.stderr)
    fn(parsed.verb_args)
    try:
        while True:
            time.sleep(parsed.interval)
            cur = _snapshot(root)
            if cur != last:
                changed = sum(1 for p in cur if last.get(p) != cur[p])
                added = sum(1 for p in cur if p not in last)
                removed = sum(1 for p in last if p not in cur)
                print(f"\n--- {changed} modified, {added} added, "
                      f"{removed} removed ---",
                      file=sys.stderr)
                fn(parsed.verb_args)
                last = cur
    except KeyboardInterrupt:
        print("\ncorpus watch: stopped", file=sys.stderr)
        return 0


if __name__ == "__main__":
    sys.exit(main())
