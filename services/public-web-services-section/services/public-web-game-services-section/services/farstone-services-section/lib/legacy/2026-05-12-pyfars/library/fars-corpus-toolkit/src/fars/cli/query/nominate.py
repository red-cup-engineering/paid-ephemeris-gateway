"""``nominate`` — top library-curation candidates (high inbound × broken outbound)."""
from __future__ import annotations

from fars.analyze.nominate import find
from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query nominate")
        return 2
    known = set(ctx.by_slug.keys())
    rows = find(
        ctx.notes,
        in_edges=ctx.in_edges,
        out_edges=ctx.out_edges,
        known_slugs=known,
        limit=15,
    )
    print(f'{"score":>7s}  {"in":>3s}  {"out!":>4s}  {"body":>5s}  desc  src')
    for r in rows:
        d = "✓" if r["has_description"] else "✗"
        print(f"  {r['score']:6.1f}  {r['inbound']:3d}  {r['broken_outbound']:4d}  "
              f"{r['body_chars']:5d}   {d}    {r['path']}")
    return 0
