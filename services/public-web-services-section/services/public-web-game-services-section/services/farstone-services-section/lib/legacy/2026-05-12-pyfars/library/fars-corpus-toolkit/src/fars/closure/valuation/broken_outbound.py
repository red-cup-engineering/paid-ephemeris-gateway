"""How many of this slug's outbound edges target slugs that don't exist."""
from __future__ import annotations

from typing import Container, Iterable, Mapping

from fars.substrate.predication import Predication


def score(slug: str,
          out_edges: Mapping[str, Iterable[Predication]],
          known_slugs: Container[str]) -> int:
    return sum(1 for e in out_edges.get(slug, ()) if e.dst not in known_slugs)
