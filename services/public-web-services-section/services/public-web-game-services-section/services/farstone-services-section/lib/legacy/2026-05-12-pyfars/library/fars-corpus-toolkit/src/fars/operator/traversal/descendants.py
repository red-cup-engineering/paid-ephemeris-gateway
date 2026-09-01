"""Transitive descendants of ``slug`` in the depends-on graph.

Returns the set of slugs that transitively depend on ``slug``. The
starting slug is not included.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable, Mapping


def descendants(slug: str, dependents: Mapping[str, Iterable[str]]) -> set[str]:
    seen: set[str] = set()
    queue: deque[str] = deque([slug])
    while queue:
        cur = queue.popleft()
        for nxt in dependents.get(cur, ()):
            if nxt in seen:
                continue
            seen.add(nxt)
            queue.append(nxt)
    return seen
