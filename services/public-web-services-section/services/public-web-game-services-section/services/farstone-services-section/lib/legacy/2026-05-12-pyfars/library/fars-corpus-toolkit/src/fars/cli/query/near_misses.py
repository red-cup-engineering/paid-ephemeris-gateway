"""``near-misses`` — broken targets whose basename matches an existing slug.

Likely path-rewrite candidates: a real file exists with the right slug,
the link just points at the wrong location.
"""
from __future__ import annotations

from fars.cli.query._load import QueryContext
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query near-misses")
        return 2
    known = ctx.by_slug
    miss_counts: dict[str, int] = {}
    miss_examples: dict[str, str] = {}
    for n in ctx.notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            slug = slug_of(link.target_raw, require_md=True)
            if slug is None or slug in known:
                continue
            if slug.lower() in {s.lower() for s in known}:
                miss_counts[slug] = miss_counts.get(slug, 0) + 1
                if slug not in miss_examples:
                    candidates = known.get(slug.lower(), [])
                    if candidates:
                        miss_examples[slug] = str(candidates[0].path)
    print(f'{"refs":>5s}  {"stem":40s} canonical-path')
    for stem, n in sorted(miss_counts.items(), key=lambda x: -x[1])[:40]:
        print(f"  {n:5d}  {stem:40s} {miss_examples.get(stem, '')}")
    print(f"\n  {len(miss_counts)} distinct near-miss stems, "
          f"{sum(miss_counts.values())} broken refs")
    return 0
