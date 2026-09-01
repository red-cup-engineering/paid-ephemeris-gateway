"""``neighborhood <S>`` — all in/out edges for entity S, with dead-outs flagged."""
from __future__ import annotations

from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 1:
        print("usage: query neighborhood <S>")
        return 2
    s = args[0]
    known = set(ctx.by_slug.keys())
    print(f"=== {s} ===\n")
    print("OUTBOUND (this entity points at...):")
    out = ctx.out_edges.get(s, [])
    if not out:
        print("  (no outbound edges)")
    for e in out:
        resolves = "✓" if e.dst in known else "✗"
        print(f"  [{e.source}] {resolves}  {e.kind:20s} {e.dst}")
    print()
    print("INBOUND (entities pointing at this one):")
    in_es = ctx.in_edges.get(s, [])
    if not in_es:
        print("  (no inbound edges)")
        return 0
    by_pred: dict[str, list] = {}
    for e in in_es:
        by_pred.setdefault(e.kind, []).append(e)
    for k, items in sorted(by_pred.items(), key=lambda x: -len(x[1])):
        print(f"  via {k} ({len(items)}):")
        for e in items[:6]:
            print(f"      {e.src}")
        if len(items) > 6:
            print(f"      ... and {len(items)-6} more")
    return 0
