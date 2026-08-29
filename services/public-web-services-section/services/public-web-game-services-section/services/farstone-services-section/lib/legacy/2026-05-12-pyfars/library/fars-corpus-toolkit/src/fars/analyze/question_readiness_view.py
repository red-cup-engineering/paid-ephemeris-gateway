"""Tier every open question by the firmness of its blockers.

Tiers:
  - ``answerable``: every explored entity is firm.
  - ``blocked``: some explored entity is sketch- or loose-firmness.
  - ``needs-construction``: some explored entity is missing entirely.
  - ``unanchored``: the question declares no ``explores:``.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.analyze.open_questions import find as open_questions
from fars.analyze.question_blockers import find as question_blockers
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def view(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> dict[str, list[tuple[str, dict]]]:
    tiers: dict[str, list[tuple[str, dict]]] = {
        "answerable": [], "blocked": [],
        "needs-construction": [], "unanchored": [],
    }
    for q in open_questions(notes):
        b = question_blockers(q, by_slug=by_slug, in_edges=in_edges)
        if b["missing"]:
            tier = "needs-construction"
        elif b["sketch"] or b["loose"]:
            tier = "blocked"
        elif b["firm"]:
            tier = "answerable"
        else:
            tier = "unanchored"
        tiers[tier].append((q.slug, b))
    for tier in tiers.values():
        tier.sort(key=lambda x: x[0])
    return tiers
