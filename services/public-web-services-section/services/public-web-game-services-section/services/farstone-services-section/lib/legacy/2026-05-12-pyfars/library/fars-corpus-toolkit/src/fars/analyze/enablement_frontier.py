"""Entities explored by open questions but loosely characterized.

For each entity that's the target of an open question's ``explores:``,
count how many proved theorems point at it. Entities with fewer than
``min_theorems`` characterizing theorems are on the frontier — writing
theorems about them would unblock the questions.

Returns ``[(entity, {questions, characterizing_theorems}), ...]`` sorted
by question count (descending), then theorem count (ascending).
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.analyze.open_questions import find as open_questions
from fars.closure.valuation.proven_theorems_about import score as proven_count
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         min_theorems: int = 3,
         ) -> list[tuple[str, dict]]:
    demands: dict[str, dict] = {}
    for q in open_questions(notes):
        for ent in (q.fm.get("explores") or []):
            if not isinstance(ent, str) or ent not in by_slug:
                continue
            if ent not in demands:
                char = proven_count(ent, in_edges=in_edges, by_slug=by_slug)
                demands[ent] = {"questions": [], "characterizing_theorems": char}
            demands[ent]["questions"].append(q.slug)
    frontier = [(e, d) for e, d in demands.items()
                if d["characterizing_theorems"] < min_theorems]
    frontier.sort(key=lambda x: (-len(x[1]["questions"]),
                                 x[1]["characterizing_theorems"]))
    return frontier
