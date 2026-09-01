"""``health`` — per-predicate cells / distinct-values / category / smell flag.

A predicate marked with ⚠ has high cell count but very low distinct
values — likely a typo cluster or a SCALAR_CONFIG miscategorized as EDGE.
"""
from __future__ import annotations

from fars.analyze.predicate_category import category
from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query health")
        return 2
    counts: dict[str, int] = {}
    distinct: dict[str, set[str]] = {}
    by_pred: dict[str, list[str]] = {}
    for c in ctx.claims:
        if not c.flat:
            continue
        counts[c.attribute] = counts.get(c.attribute, 0) + 1
        if c.value is not None:
            distinct.setdefault(c.attribute, set()).add(c.value)
            by_pred.setdefault(c.attribute, []).append(c.value)
    print(f'{"category":13s} {"predicate":35s} {"cells":>6s} {"distinct":>8s}  top values')
    print("-" * 110)
    for pred, n in sorted(counts.items(), key=lambda x: -x[1])[:60]:
        if n < 30:
            continue
        cat = category(pred)
        d = len(distinct.get(pred, set()))
        from collections import Counter
        tops = [v for v, _ in Counter(by_pred.get(pred, [])).most_common(3)]
        ratio = d / n if n else 0
        smell = "⚠" if (cat == "EDGE" and ratio < 0.05 and n > 200) else " "
        print(f"  {smell} {cat:11s} {pred:35s} {n:6d} {d:8d}  {tops}")
    return 0
