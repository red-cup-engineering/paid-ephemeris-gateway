"""Entities shared across multiple open questions, leverage-weighted.

Leverage = (number of questions exploring it) × firmness weight.
Firmness weight is 1.0 if the entity itself is not firm (the bottleneck
is also the unsolved work), 0.3 if firm.

Returns ``[(entity, {questions}, firmness, leverage), ...]`` sorted by
descending leverage.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Mapping

from fars.analyze.open_questions import find as open_questions
from fars.closure.valuation.firmness import score as firmness_of
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> list[tuple[str, set[str], str, float]]:
    shared: dict[str, set[str]] = defaultdict(set)
    for q in open_questions(notes):
        for e in (q.fm.get("explores") or []):
            if isinstance(e, str):
                shared[e].add(q.slug)
    out: list[tuple[str, set[str], str, float]] = []
    for e, qs in shared.items():
        if len(qs) < 2:
            continue
        firm = firmness_of(e, by_slug=by_slug, in_edges=in_edges)
        weight = 1.0 if firm != "firm" else 0.3
        leverage = len(qs) * weight
        out.append((e, qs, firm, leverage))
    out.sort(key=lambda x: (-x[3], -len(x[1]), x[0]))
    return out
