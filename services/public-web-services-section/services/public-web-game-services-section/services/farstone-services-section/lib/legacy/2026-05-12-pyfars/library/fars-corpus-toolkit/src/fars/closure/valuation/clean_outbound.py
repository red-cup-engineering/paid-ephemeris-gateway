"""Fraction of this slug's outbound edges that resolve to known slugs.

Returns 1.0 when there are no outbound edges (vacuously clean).
"""
from __future__ import annotations

from typing import Container, Iterable, Mapping

from fars.substrate.predication import Predication


def score(slug: str,
          out_edges: Mapping[str, Iterable[Predication]],
          known_slugs: Container[str]) -> float:
    edges = list(out_edges.get(slug, ()))
    if not edges:
        return 1.0
    resolved = sum(1 for e in edges if e.dst in known_slugs)
    return resolved / len(edges)
