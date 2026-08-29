"""Pairs of open questions with moderately overlapping ``explores:`` sets.

Jaccard 0.2..0.5: enough overlap to suggest a common upstream entity,
not enough to be the same question. The intersection may be a missing
abstraction that would unify both questions.
"""
from __future__ import annotations

from fars.analyze.open_questions import find as open_questions
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         limit: int = 15,
         lower: float = 0.2,
         upper: float = 0.5,
         ) -> list[tuple[str, str, set[str], float]]:
    qs = open_questions(notes)
    explored = {q.slug: set(q.fm.get("explores") or []) for q in qs}
    slugs = [q.slug for q in qs]
    out: list[tuple[str, str, set[str], float]] = []
    for i, q1 in enumerate(slugs):
        e1 = explored[q1]
        if not e1:
            continue
        for q2 in slugs[i + 1:]:
            e2 = explored[q2]
            if not e2:
                continue
            jac = len(e1 & e2) / len(e1 | e2)
            if lower <= jac <= upper:
                out.append((q1, q2, e1 & e2, jac))
    out.sort(key=lambda x: -x[3])
    return out[:limit]
