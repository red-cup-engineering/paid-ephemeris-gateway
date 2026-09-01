"""Connected components of the open-question graph (shared not-firm blockers).

Two questions are linked iff they share at least one explored entity that
is sketch / loose / missing. Connected components are roadmap *spines*;
singletons are independent questions.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Mapping

from fars.analyze.open_questions import find as open_questions
from fars.analyze.question_blockers import find as question_blockers
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], *,
         by_slug: Mapping[str, list[Flatfile]],
         in_edges: Mapping[str, Iterable[Predication]],
         ) -> list[dict]:
    qs = [q.slug for q in open_questions(notes)]
    q_blockers: dict[str, set[str]] = {}
    for n in open_questions(notes):
        b = question_blockers(n, by_slug=by_slug, in_edges=in_edges)
        non_firm: set[str] = set()
        non_firm.update(e for e, _ in b["sketch"])
        non_firm.update(b["loose"])
        non_firm.update(b["missing"])
        q_blockers[n.slug] = non_firm

    parent: dict[str, str] = {q: q for q in qs}

    def root(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = root(a), root(b)
        if ra != rb:
            parent[ra] = rb

    blocker_to_qs: dict[str, list[str]] = defaultdict(list)
    for q, blockers in q_blockers.items():
        for b in blockers:
            blocker_to_qs[b].append(q)
    for shared_qs in blocker_to_qs.values():
        for i in range(1, len(shared_qs)):
            union(shared_qs[0], shared_qs[i])

    components: dict[str, set[str]] = defaultdict(set)
    for q in qs:
        components[root(q)].add(q)

    out: list[dict] = []
    for comp in components.values():
        shared: list[tuple[str, set[str]]] = []
        for b, ks in blocker_to_qs.items():
            in_comp = [q for q in ks if q in comp]
            if len(in_comp) >= 2:
                shared.append((b, set(in_comp)))
        shared.sort(key=lambda x: (-len(x[1]), x[0]))
        out.append({"questions": comp, "shared_blockers": shared})
    out.sort(key=lambda c: (-len(c["questions"]), sorted(c["questions"])[0]))
    return out
