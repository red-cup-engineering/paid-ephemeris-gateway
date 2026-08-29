"""``split <P1> <P2>`` — compare two predicate fibers side by side.

Useful for diagnosing when one predicate has fragmented across two
spellings (e.g. ``date-created`` vs ``date_created``) — the two fibers
will have largely-disjoint object sets.
"""
from __future__ import annotations

from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 2:
        print("usage: query split <P1> <P2>")
        return 2
    p1, p2 = args
    f1 = [c for c in ctx.claims if c.attribute == p1 and c.flat]
    f2 = [c for c in ctx.claims if c.attribute == p2 and c.flat]
    o1 = {c.value for c in f1 if c.value is not None}
    o2 = {c.value for c in f2 if c.value is not None}
    print(f"  {p1}: {len(f1)} cells, {len(o1)} distinct objects")
    print(f"  {p2}: {len(f2)} cells, {len(o2)} distinct objects")
    print(f"  objects shared by both fibers: {len(o1 & o2)}")
    print(f"  objects only in {p1}: {len(o1 - o2)}")
    print(f"  objects only in {p2}: {len(o2 - o1)}")
    return 0
