"""How many proved theorems point at this slug.

A characterization-strength signal: a concept with many proved theorems
about it is firm; one with none is loose. Used by ``score.firmness`` and
the planner's enablement-frontier analysis.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.convention import THEOREM_KINDS
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def score(slug: str, *,
          in_edges: Mapping[str, Iterable[Predication]],
          by_slug: Mapping[str, list[Flatfile]]) -> int:
    n = 0
    for e in in_edges.get(slug, ()):
        for src_note in by_slug.get(e.src, ()):
            if src_note.kind in THEOREM_KINDS and src_note.fm.get("status") == "proved":
                n += 1
                break
    return n
