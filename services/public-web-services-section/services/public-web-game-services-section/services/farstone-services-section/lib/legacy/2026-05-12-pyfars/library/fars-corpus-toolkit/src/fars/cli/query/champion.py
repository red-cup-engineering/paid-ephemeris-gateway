"""``champion`` — top library terms by combined quality signals."""
from __future__ import annotations

from fars.analyze.champion import find
from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query champion")
        return 2
    known = set(ctx.by_slug.keys())
    rows = find(
        ctx.notes,
        in_edges=ctx.in_edges,
        out_edges=ctx.out_edges,
        known_slugs=known,
        limit=15,
    )
    print(f'{"score":>7s}  {"in":>4s}  {"body":>5s}  {"refs":>4s}  {"h2":>2s}  '
          f'{"rub":>3s}  desc  c_out  src')
    for r in rows:
        d = "✓" if r["has_description"] else "✗"
        slop_mark = " (slop!)" if r["slop"] else ""
        print(f"  {r['score']:6.1f}  {r['inbound']:4d}  {r['body_chars']:5d}  "
              f"{r['n_refs']:4d}  {r['h2']:2d}  {r['rubric_hits']:1d}/6   "
              f"{d}    {r['clean_outbound']:.2f}   {r['path']}{slop_mark}")
    return 0
