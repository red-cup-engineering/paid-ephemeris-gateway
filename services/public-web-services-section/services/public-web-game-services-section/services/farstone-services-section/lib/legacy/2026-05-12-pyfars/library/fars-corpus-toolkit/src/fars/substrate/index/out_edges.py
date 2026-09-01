"""Group edges by source slug. Preserves edge kind and source."""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.predication import Predication


def build(edges: list[Predication]) -> dict[str, list[Predication]]:
    out: dict[str, list[Predication]] = defaultdict(list)
    for e in edges:
        out[e.src].append(e)
    return dict(out)
