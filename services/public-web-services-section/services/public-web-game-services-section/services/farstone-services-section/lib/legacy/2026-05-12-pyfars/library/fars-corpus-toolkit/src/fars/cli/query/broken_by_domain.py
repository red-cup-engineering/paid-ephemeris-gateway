"""``broken-by-domain`` — broken outbound link counts grouped by top-level dirs."""
from __future__ import annotations

from fars.cli.query._load import QueryContext
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query broken-by-domain")
        return 2
    known = set(ctx.by_slug.keys())
    counts: dict[str, int] = {}
    for n in ctx.notes:
        path_str = str(n.path).replace("\\", "/")
        parts = path_str.split("/")
        bucket = "/".join(parts[:4]) if len(parts) >= 4 else "/".join(parts[:2])
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            slug = slug_of(link.target_raw, require_md=True)
            if slug is None or slug in known:
                continue
            counts[bucket] = counts.get(bucket, 0) + 1
    print(f'{"broken":>7s}  bucket')
    for bucket, n in sorted(counts.items(), key=lambda x: -x[1])[:30]:
        print(f"  {n:6d}  {bucket}")
    return 0
