"""How many edges land on this slug — the volume / popularity term."""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.substrate.predication import Predication


def score(slug: str, in_edges: Mapping[str, Iterable[Predication]]) -> int:
    return sum(1 for _ in in_edges.get(slug, ()))
