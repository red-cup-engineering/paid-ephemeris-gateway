"""Longest path from an atomic note (no incoming depends-on) to each slug.

Computed via Kahn's algorithm; cyclic components are skipped — callers
should detect cycles separately if they need totality.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable, Mapping


def distance(slugs: Iterable[str],
             depends_on: Mapping[str, Iterable[str]],
             dependents: Mapping[str, Iterable[str]]) -> dict[str, int]:
    slugs = list(slugs)
    indeg: dict[str, int] = {s: 0 for s in slugs}
    for s in slugs:
        for d in depends_on.get(s, ()) or ():
            if d in indeg:
                indeg[s] += 1

    queue: deque[str] = deque(s for s, d in indeg.items() if d == 0)
    dist: dict[str, int] = {s: 0 for s in queue}
    while queue:
        cur = queue.popleft()
        for nxt in dependents.get(cur, ()) or ():
            if nxt not in indeg:
                continue
            cand = dist[cur] + 1
            if cand > dist.get(nxt, -1):
                dist[nxt] = cand
            indeg[nxt] -= 1
            if indeg[nxt] == 0:
                queue.append(nxt)
    return dist
