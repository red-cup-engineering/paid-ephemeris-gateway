"""``fiber <P>`` — every cell in predicate P's fiber: (S, P, O)."""
from __future__ import annotations

from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 1:
        print("usage: query fiber <P>")
        return 2
    p = args[0]
    rows = [c for c in ctx.claims if c.attribute == p and c.flat]
    rows.sort(key=lambda c: c.entity)
    for c in rows:
        print(f"  {c.entity}  {c.attribute}  {c.value}")
    print(f"  ({len(rows)} cells)")
    return 0
