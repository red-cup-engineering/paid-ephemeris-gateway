"""Morphisms with no proved theorem about them — definitions without consequences."""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.closure.valuation.proven_theorems_about import score as proven_count
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> list[str]:
    out: list[str] = []
    for n in notes:
        if n.kind != "morphism":
            continue
        if proven_count(n.slug, in_edges=in_edges, by_slug=by_slug) == 0:
            out.append(n.slug)
    return sorted(out)
