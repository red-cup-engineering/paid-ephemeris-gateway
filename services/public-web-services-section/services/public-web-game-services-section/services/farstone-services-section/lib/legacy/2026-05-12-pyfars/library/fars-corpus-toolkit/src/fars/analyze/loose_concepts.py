"""Concepts with no proved theorem about them.

Split into ``primitives`` (declared as type ``entity`` or
``predicate-section`` — notional anchors expected to be loose) and
``candidates`` (everything else — implicit demand for characterization).
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.closure.valuation.proven_theorems_about import score as proven_count
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> tuple[list[str], list[str]]:
    primitives: list[str] = []
    candidates: list[str] = []
    for n in notes:
        if n.kind != "concept":
            continue
        if proven_count(n.slug, in_edges=in_edges, by_slug=by_slug) > 0:
            continue
        type_ = n.fm.get("type", "")
        if type_ in ("entity", "predicate-section"):
            primitives.append(n.slug)
        else:
            candidates.append(n.slug)
    return sorted(primitives), sorted(candidates)
