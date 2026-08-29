"""As-late-as-possible (just-in-time) topological sort.

Each item is placed at the latest position consistent with the dep graph —
immediately before its earliest dependent. A primitive used only by one
theorem appears right before that theorem, not at the top of the book.
Cyclic leftovers append alphabetically.
"""
from __future__ import annotations

import bisect
from typing import Iterable, Mapping


def sort(items: Iterable[str], deps: Mapping[str, Iterable[str]]) -> list[str]:
    items = set(items)
    dependents: dict[str, set[str]] = {s: set() for s in items}
    for s in items:
        for d in deps.get(s, ()) or ():
            if d in dependents:
                dependents[d].add(s)

    remaining = {s: set(dependents[s]) for s in items}
    queue = sorted(s for s in items if not remaining[s])
    process_order: list[str] = []
    while queue:
        s = queue.pop(0)
        process_order.append(s)
        for d in deps.get(s, ()) or ():
            if d in remaining:
                remaining[d].discard(s)
                if not remaining[d]:
                    bisect.insort(queue, d)

    for s in sorted(items):
        if s not in process_order:
            process_order.append(s)

    final: list[str] = []
    pos: dict[str, int] = {}
    for s in process_order:
        min_dep_pos = None
        for u in dependents[s]:
            if u in pos and (min_dep_pos is None or pos[u] < min_dep_pos):
                min_dep_pos = pos[u]
        if min_dep_pos is None:
            final.append(s)
            pos[s] = len(final) - 1
        else:
            final.insert(min_dep_pos, s)
            for k, v in pos.items():
                if v >= min_dep_pos:
                    pos[k] = v + 1
            pos[s] = min_dep_pos

    return final
