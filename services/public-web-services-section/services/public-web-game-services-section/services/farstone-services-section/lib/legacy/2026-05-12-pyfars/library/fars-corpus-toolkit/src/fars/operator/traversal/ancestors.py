"""Transitive ancestors of ``slug`` in the depends-on graph.

Returns the set of slugs reachable from ``slug`` by following ``depends-on``
edges outward. The starting slug is not included.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable, Mapping


def ancestors(slug: str, depends_on: Mapping[str, Iterable[str]]) -> set[str]:
    seen: set[str] = set()
    queue: deque[str] = deque([slug])
    while queue:
        cur = queue.popleft()
        for prv in depends_on.get(cur, ()):
            if prv in seen:
                continue
            seen.add(prv)
            queue.append(prv)
    return seen
