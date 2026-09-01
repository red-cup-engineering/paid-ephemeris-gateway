"""``whose-broken <slug>`` — who points at <slug>.md when no such file exists."""
from __future__ import annotations

from fars.cli.query._load import QueryContext
from fars.substrate.parse.markdown_links import parse as parse_links


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 1:
        print("usage: query whose-broken <slug>")
        return 2
    slug = args[0]
    target_substr = f"{slug}.md"
    by_src: dict[str, list[tuple[str, int]]] = {}
    for n in ctx.notes:
        for link in parse_links(n.body):
            if link.kind not in ("relative", "absolute"):
                continue
            if target_substr not in link.target_raw:
                continue
            from fars.substrate.parse._slug_target import slug_of
            tgt_slug = slug_of(link.target_raw, require_md=True)
            if tgt_slug is None or tgt_slug in ctx.by_slug:
                continue
            by_src.setdefault(str(n.path), []).append((link.target_raw, link.line))
    if not by_src:
        print(f"  no broken refs to {slug}.md")
        return 0
    total = sum(len(v) for v in by_src.values())
    print(f"  {total} broken refs across {len(by_src)} files:")
    for src, refs in sorted(by_src.items()):
        for tgt, line in refs:
            print(f"    {src}:{line}    -> {tgt}")
    return 0
