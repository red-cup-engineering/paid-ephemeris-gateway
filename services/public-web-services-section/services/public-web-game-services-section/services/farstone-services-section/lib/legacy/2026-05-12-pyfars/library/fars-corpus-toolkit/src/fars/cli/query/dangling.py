"""``dangling`` — edge-predicate values that don't resolve to any entity.

Walks every flat claim whose predicate is in the ``EDGE`` category and
reports values that aren't slugs of loaded notes. Excludes META / SCALAR_CONFIG
predicates (those are file-about-itself or scalar config, not edges).
"""
from __future__ import annotations

from fars.analyze.predicate_category import category
from fars.cli.query._load import QueryContext


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query dangling")
        return 2
    known = set(ctx.by_slug.keys())
    counts: dict[str, int] = {}
    preds_for: dict[str, set[str]] = {}
    for c in ctx.claims:
        if not c.flat or c.value is None:
            continue
        if category(c.attribute) != "EDGE":
            continue
        v = c.value.strip().lower()
        if not v or len(v) > 80 or "\n" in v:
            continue
        if v in known:
            continue
        counts[v] = counts.get(v, 0) + 1
        preds_for.setdefault(v, set()).add(c.attribute)
    ranked = sorted(counts.items(), key=lambda x: -x[1])
    print(f"{len(ranked)} distinct dangling values across edge predicates")
    print(f'{"count":>5s}  {"value":40s} {"predicates"}')
    for v, n in ranked[:30]:
        preds = ",".join(sorted(preds_for[v])[:4])
        print(f"  {n:5d}  {v:40s} {preds}")
    return 0
