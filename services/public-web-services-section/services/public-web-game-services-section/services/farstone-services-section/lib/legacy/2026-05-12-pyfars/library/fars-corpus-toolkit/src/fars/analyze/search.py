"""Rank-and-filter notes against a query string.

Each match earns a score by where it landed:

    title=10 · description=4 · slug=8 · body=1

Multiple hits in the same field accumulate. Filters (``kind``, ``domain``,
``path_contains``) prune candidates before scoring. Returns
``[(score, note, hit_summary), ...]`` sorted descending by score.
"""
from __future__ import annotations

import re
from typing import Iterable

from fars.substrate.flatfile import Flatfile


def find(notes: list[Flatfile], pattern: str, *,
         kind: str | None = None,
         domain: str | None = None,
         path_contains: str | None = None,
         use_regex: bool = False,
         limit: int = 30,
         ) -> list[tuple[int, Flatfile, dict[str, int]]]:
    if use_regex:
        rx = re.compile(pattern, re.IGNORECASE)
        match_count = lambda s: len(rx.findall(s)) if s else 0  # noqa: E731
    else:
        needle = pattern.lower()
        match_count = lambda s: s.lower().count(needle) if s else 0  # noqa: E731

    out: list[tuple[int, Flatfile, dict[str, int]]] = []
    for n in notes:
        if kind and n.kind != kind:
            continue
        if domain and n.dir != domain:
            continue
        if path_contains and path_contains not in str(n.path).replace("\\", "/"):
            continue

        title = n.fm.get("title") or n.fm.get("name") or ""
        description = n.fm.get("description") or ""
        hits = {
            "title": match_count(str(title)),
            "description": match_count(str(description)),
            "slug": match_count(n.slug),
            "body": match_count(n.body),
        }
        score = hits["title"] * 10 + hits["description"] * 4 + hits["slug"] * 8 + hits["body"]
        if score == 0:
            continue
        out.append((score, n, hits))

    out.sort(key=lambda r: -r[0])
    return out[:limit]
