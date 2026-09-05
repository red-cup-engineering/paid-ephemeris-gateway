"""``fars query <subcommand> [args...]`` — replaces the old corpus-digraph queries.

Loads the corpus once and dispatches to one of the listed subcommands.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Callable

from fars.cli.query import (
    asks, asks_who, broken_by_domain, broken_links, chain, champion,
    dangling, dead_ends, fiber, health, links, near_misses, neighborhood,
    nominate, resolve, split, triage_cands, whose_broken,
)
from fars.cli.query._load import QueryContext, load

SUBCOMMANDS: dict[str, Callable[[QueryContext, list[str]], int]] = {
    "asks":             asks.run,
    "asks-who":         asks_who.run,
    "broken-by-domain": broken_by_domain.run,
    "broken-links":     broken_links.run,
    "chain":            chain.run,
    "champion":         champion.run,
    "dangling":         dangling.run,
    "dead-ends":        dead_ends.run,
    "fiber":            fiber.run,
    "health":           health.run,
    "links":            links.run,
    "near-misses":      near_misses.run,
    "neighborhood":     neighborhood.run,
    "nominate":         nominate.run,
    "resolve":          resolve.run,
    "split":            split.run,
    "triage-cands":     triage_cands.run,
    "whose-broken":     whose_broken.run,
}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="fars query", add_help=True)
    ap.add_argument("--root", "-r", default=".",
                    help="corpus root (default: CWD)")
    ap.add_argument("--include-triage", action="store_true",
                    help="load notes inside triage/ subtrees (needed for triage-cands)")
    ap.add_argument("subcommand", nargs="?", default=None,
                    help="one of: " + ", ".join(sorted(SUBCOMMANDS)))
    ap.add_argument("args", nargs=argparse.REMAINDER)
    parsed = ap.parse_args(argv)

    if parsed.subcommand is None:
        ap.print_help()
        print("\nsubcommands:", file=sys.stderr)
        for s in sorted(SUBCOMMANDS):
            print(f"  {s}", file=sys.stderr)
        return 1

    if parsed.subcommand not in SUBCOMMANDS:
        print(f"fars query: unknown subcommand {parsed.subcommand!r}", file=sys.stderr)
        print("subcommands: " + ", ".join(sorted(SUBCOMMANDS)), file=sys.stderr)
        return 2

    root = Path(parsed.root).resolve()
    if not root.is_dir():
        print(f"fars query: not a directory: {root}", file=sys.stderr)
        return 2

    include_triage = parsed.include_triage or parsed.subcommand == "triage-cands"
    ctx = load(root, include_triage=include_triage)
    return SUBCOMMANDS[parsed.subcommand](ctx, parsed.args)


if __name__ == "__main__":
    sys.exit(main())
