"""Find concepts without realizers, constructions without ``realizes:``,
and concepts realized by multiple constructions (robust concepts).
"""
from __future__ import annotations

from fars.substrate.index.realizers import build as build_realizers
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile]) -> dict:
    realizers = build_realizers(notes)
    by_slug = {n.slug: n for n in notes}

    unrealized = sorted(
        n.slug for n in notes
        if n.kind == "concept" and not realizers.get(n.slug)
    )
    unanchored = sorted(
        n.slug for n in notes
        if n.kind in ("definition", "morphism") and not (n.fm.get("realizes") or [])
    )
    multi = sorted(
        ((s, rs) for s, rs in realizers.items()
         if len(rs) >= 2 and s in by_slug and by_slug[s].kind == "concept"),
        key=lambda x: -len(x[1]),
    )
    return {
        "unrealized_concepts": unrealized,
        "unanchored_constructions": unanchored,
        "multi_realized": multi,
    }
