"""Walk the depends-on neighborhood of a slug, depth- and budget-bounded.

Breadth-first from the seed slug, following ``depends-on`` outward.
Returns the visited Notes in BFS order — the seed first, then its
direct deps, then their deps, until either ``depth`` is exhausted or
the cumulative body length exceeds ``budget_chars``.

If the seed slug has no Flatfile in the corpus, returns an empty list.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable, Mapping

from fars.substrate.flatfile import Flatfile


def walk(seed: str, *,
         by_slug: Mapping[str, list[Flatfile]],
         depends_on: Mapping[str, Iterable[str]],
         depth: int = 2,
         budget_chars: int = 8000,
         ) -> list[Flatfile]:
    visited: set[str] = set()
    out: list[Flatfile] = []
    used_chars = 0
    queue: deque[tuple[str, int]] = deque([(seed, 0)])
    while queue:
        slug, d = queue.popleft()
        if slug in visited:
            continue
        visited.add(slug)
        notes = by_slug.get(slug, [])
        if not notes:
            continue
        n = notes[0]
        body_len = len(n.body)
        if used_chars and used_chars + body_len > budget_chars:
            break
        out.append(n)
        used_chars += body_len
        if d >= depth:
            continue
        for dep in depends_on.get(slug, ()) or ():
            if dep not in visited:
                queue.append((dep, d + 1))
    return out
