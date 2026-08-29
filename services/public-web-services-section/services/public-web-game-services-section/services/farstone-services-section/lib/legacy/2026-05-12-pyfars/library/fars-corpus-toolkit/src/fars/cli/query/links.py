"""``links`` — one-line link-health summary across the fars."""
from __future__ import annotations

from fars.cli.query._load import QueryContext
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query links")
        return 2
    known = set(ctx.by_slug.keys())
    counts = {"relative": 0, "absolute": 0, "external": 0, "anchor": 0, "asset": 0}
    broken = 0
    from fars.substrate.parse._slug_target import slug_of
    for n in ctx.notes:
        for link in parse_links(n.body):
            counts[link.kind] = counts.get(link.kind, 0) + 1
            if link.kind in ("relative", "absolute"):
                slug = slug_of(link.target_raw, require_md=True)
                if slug is None or slug not in known:
                    broken += 1
    internal = counts["relative"] + counts["absolute"]
    pct = (broken / internal * 100) if internal else 0
    print(f"  internal .md links: {internal}  ({broken} broken, {pct:.1f}%)")
    print(f"  external:           {counts['external']}")
    print(f"  anchor (#frag):     {counts['anchor']}")
    print(f"  asset (img/etc):    {counts['asset']}")
    return 0
