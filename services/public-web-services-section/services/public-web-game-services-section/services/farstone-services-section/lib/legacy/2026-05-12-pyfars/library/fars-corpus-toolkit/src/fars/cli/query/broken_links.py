"""``broken-links`` — top broken targets (most-referenced missing slugs)."""
from __future__ import annotations

from collections import Counter

from fars.cli.query._load import QueryContext
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query broken-links")
        return 2
    known = set(ctx.by_slug.keys())
    broken: Counter[str] = Counter()
    examples: dict[str, str] = {}
    for n in ctx.notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            slug = slug_of(link.target_raw, require_md=True)
            if slug is None or slug in known:
                continue
            broken[link.target_raw] += 1
            examples.setdefault(link.target_raw, str(n.path))
    if not broken:
        print("  no broken links")
        return 0
    print(f'{"count":>5s}  basename                                   target_raw')
    for tgt, n in broken.most_common(50):
        base = tgt.split("/")[-1].split("#")[0]
        print(f"  {n:5d}  {base:40s} {tgt}")
    return 0
