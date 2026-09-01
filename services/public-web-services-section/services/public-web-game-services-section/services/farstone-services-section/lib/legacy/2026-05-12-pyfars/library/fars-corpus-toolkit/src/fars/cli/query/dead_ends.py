"""``dead-ends`` — files where most outbound .md links are broken.

A note where ≥50% of outbound .md links are broken is likely orphaned
or pointing at a vanished neighborhood. Threshold tunable via env vars
in a future refinement; default is 5+ outbound links and ≥50% broken.
"""
from __future__ import annotations

from fars.cli.query._load import QueryContext
from fars.substrate.parse._slug_target import slug_of
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if args:
        print("usage: query dead-ends")
        return 2
    known = set(ctx.by_slug.keys())
    rows: list[tuple[int, int, str]] = []
    for n in ctx.notes:
        total = 0
        broken = 0
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            total += 1
            slug = slug_of(link.target_raw, require_md=True)
            if slug is None or slug not in known:
                broken += 1
        if total >= 5 and broken * 2 >= total:
            rows.append((broken, total, str(n.path)))
    rows.sort(key=lambda r: -r[0])
    print(f'{"broken/total":>13s}  src')
    for broken, total, path in rows[:30]:
        print(f"  {broken:>5d}/{total:<5d}  {path}")
    return 0
