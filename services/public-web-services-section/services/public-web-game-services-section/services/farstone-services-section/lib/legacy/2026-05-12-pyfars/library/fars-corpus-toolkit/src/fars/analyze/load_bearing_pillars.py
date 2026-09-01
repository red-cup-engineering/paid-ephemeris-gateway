"""Anchors (definitions / concepts / morphisms) depended on by many proved theorems."""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.closure.valuation.firmness import ANCHOR_KINDS
from fars.closure.valuation.proven_theorems_about import score as proven_count
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         min_theorems: int = 5,
         ) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for n in notes:
        if n.kind not in ANCHOR_KINDS:
            continue
        c = proven_count(n.slug, in_edges=in_edges, by_slug=by_slug)
        if c >= min_theorems:
            out.append((n.slug, c))
    out.sort(key=lambda x: (-x[1], x[0]))
    return out
