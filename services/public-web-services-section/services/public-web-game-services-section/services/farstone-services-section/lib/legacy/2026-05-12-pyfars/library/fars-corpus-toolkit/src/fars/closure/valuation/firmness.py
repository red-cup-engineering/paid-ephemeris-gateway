"""Classify a slug's structural firmness.

  - ``missing``: no note exists for this slug.
  - ``firm``:    a theorem/lemma/proposition/corollary with status=proved,
                 OR an anchor (concept/definition/morphism) with at least
                 one proved theorem characterizing it.
  - ``sketch``:  a theorem-like note that isn't proved yet.
  - ``loose``:   an anchor with no proved characterizations.
"""
from __future__ import annotations

from typing import Iterable, Literal, Mapping

from fars.closure.valuation.proven_theorems_about import score as proven_count
from fars.convention import ANCHOR_KINDS, THEOREM_KINDS
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile

Firmness = Literal["firm", "sketch", "loose", "missing"]


def score(slug: str, *,
          by_slug: Mapping[str, list[Flatfile]],
          in_edges: Mapping[str, Iterable[Predication]]) -> Firmness:
    candidates = by_slug.get(slug, [])
    if not candidates:
        return "missing"
    n = candidates[0]
    if n.kind in THEOREM_KINDS:
        return "firm" if n.fm.get("status") == "proved" else "sketch"
    if n.kind in ANCHOR_KINDS:
        return "firm" if proven_count(slug, in_edges=in_edges, by_slug=by_slug) >= 1 else "loose"
    return "firm"
