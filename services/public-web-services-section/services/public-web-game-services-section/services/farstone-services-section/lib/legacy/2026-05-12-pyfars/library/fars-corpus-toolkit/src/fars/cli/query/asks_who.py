"""``asks-who <P> <O>`` — claims at (?, P, O). Who lands at O through P."""
from __future__ import annotations

from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 2:
        print("usage: query asks-who <P> <O>")
        return 2
    p, o = args
    rows = [c for c in ctx.claims if c.attribute == p and c.value == o and c.flat]
    if not rows:
        print(f"  empty: no cells at (?, {p}, {o})")
        return 0
    for c in rows:
        print(f"  {c.entity}  {c.attribute}  {c.value}    [{c.source_path}]")
    return 0
