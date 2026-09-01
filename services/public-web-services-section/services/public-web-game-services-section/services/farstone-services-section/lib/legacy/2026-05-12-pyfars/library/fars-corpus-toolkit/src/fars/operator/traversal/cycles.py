"""Cycles in the depends-on graph: self-loops + non-trivial SCCs.

Iterative Tarjan's algorithm to avoid recursion-depth limits on dense
corpora. Each returned list is one cycle (or self-loop when length 1).
"""
from __future__ import annotations

from typing import Iterable, Mapping


def detect(depends_on: Mapping[str, Iterable[str]]) -> list[list[str]]:
    cycles: list[list[str]] = []
    slugs = list(depends_on.keys())
    for s in slugs:
        if s in depends_on.get(s, ()):
            cycles.append([s])

    index_counter = [0]
    stack: list[str] = []
    on_stack: set[str] = set()
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    sccs: list[list[str]] = []

    def strong_connect(v: str) -> None:
        work: list[tuple[str, Iterable[str]]] = [
            (v, iter(depends_on.get(v, ()))),
        ]
        indices[v] = index_counter[0]
        lowlink[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack.add(v)

        while work:
            cur, succs = work[-1]
            advanced = False
            for w in succs:
                if w not in indices:
                    indices[w] = index_counter[0]
                    lowlink[w] = index_counter[0]
                    index_counter[0] += 1
                    stack.append(w)
                    on_stack.add(w)
                    work.append((w, iter(depends_on.get(w, ()))))
                    advanced = True
                    break
                elif w in on_stack:
                    lowlink[cur] = min(lowlink[cur], indices[w])
            if advanced:
                continue
            if lowlink[cur] == indices[cur]:
                comp: list[str] = []
                while True:
                    x = stack.pop()
                    on_stack.discard(x)
                    comp.append(x)
                    if x == cur:
                        break
                if len(comp) > 1:
                    sccs.append(comp)
            work.pop()
            if work:
                parent_cur, _ = work[-1]
                lowlink[parent_cur] = min(lowlink[parent_cur], lowlink[cur])

    for s in slugs:
        if s not in indices:
            strong_connect(s)

    cycles.extend(sccs)
    return cycles
