"""``resolve <src> <slug>`` — show how ``slug`` resolves from source ``src``.

``src`` is either a path (relative to repo root) or a slug to look up.
Walks colocated → directory ancestors → component-of-chain.
"""
from __future__ import annotations

from pathlib import Path

from fars.cli.query._load import QueryContext
from fars.operator.traversal.resolve_term import resolve


def run(ctx: QueryContext, args: list[str]) -> int:
    if len(args) != 2:
        print("usage: query resolve <src> <slug>")
        return 2
    src, slug = args

    src_note = None
    if "/" in src or src.endswith(".md"):
        target = Path(src)
        for n in ctx.notes:
            if str(n.path).replace("\\", "/") == str(target).replace("\\", "/"):
                src_note = n
                break
    if src_note is None:
        candidates = ctx.by_slug.get(src.lower(), [])
        if candidates:
            src_note = candidates[0]
    if src_note is None:
        print(f"  source {src!r} not found")
        return 1

    print(f"resolving {slug!r} from {src_note.path}:")
    target, reason = resolve(
        src_note, slug,
        by_slug=ctx.by_slug, by_domain=ctx.by_domain,
    )
    if target:
        print(f"  ✓  {target.path}")
        print(f"     via: {reason}")
    else:
        print(f"  ✗  unresolved   ({reason})")
    return 0
