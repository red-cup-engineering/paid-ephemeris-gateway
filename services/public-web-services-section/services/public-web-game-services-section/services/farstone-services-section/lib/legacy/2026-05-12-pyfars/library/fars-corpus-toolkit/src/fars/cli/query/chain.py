"""``chain <slug> [--key KEY]`` — walk a relation-chain rooted at a slug.

Default ``KEY`` is ``component-of`` (the corpus's domain-hierarchy relation).
The lookup is ``index.by_domain`` (only ``_index.md`` notes contribute);
to chain non-domain relations like ``specializes`` between individual
notes, pass ``--lookup by_slug``.
"""
from __future__ import annotations

import argparse

from fars.cli.query._load import QueryContext
from fars.operator.traversal.chain import chain


def run(ctx: QueryContext, args: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="query chain")
    ap.add_argument("slug")
    ap.add_argument("--key", default="component-of")
    ap.add_argument("--lookup", choices=("by_domain", "by_slug"), default="by_domain")
    parsed = ap.parse_args(args)
    lookup = ctx.by_domain if parsed.lookup == "by_domain" else ctx.by_slug
    candidates = lookup.get(parsed.slug.lower(), [])
    if not candidates:
        print(f"  no entry for {parsed.slug!r} in {parsed.lookup}")
        return 0
    walk = chain(candidates[0], lookup, key=parsed.key)
    print(f"chain rooted at {parsed.slug!r} via `{parsed.key}`:")
    for i, d in enumerate(walk):
        v = d.fm.get(parsed.key) or "(root)"
        print(f"  {i}. {d.path}    {parsed.key}: {v}")
    return 0
