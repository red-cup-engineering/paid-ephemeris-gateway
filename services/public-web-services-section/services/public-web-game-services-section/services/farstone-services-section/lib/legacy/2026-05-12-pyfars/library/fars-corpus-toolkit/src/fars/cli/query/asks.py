"""``asks <S> <P>`` — claims at (S, P, ?). What S says via predicate P."""
from __future__ import annotations

from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 2:
        print("usage: query asks <S> <P>")
        return 2
    s, p = args
    rows = [c for c in ctx.claims if c.entity == s and c.attribute == p and c.flat]
    if not rows:
        print(f"  empty: no cells at ({s}, {p}, ?)")
        return 0
    for c in rows:
        print(f"  {c.entity}  {c.attribute}  {c.value}    [{c.source_path}]")
    return 0
