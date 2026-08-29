"""Forward depends-on adjacency: ``slug -> [slugs it depends on]``.

A kind-filtered convenience view over an edge list. The graph algorithms
(ancestors, cycles, foundation_distance, topo_sort) consume this shape.
"""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.predication import Predication


def build(edges: list[Predication]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e.source == "fm" and e.kind == "depends-on":
            out[e.src].append(e.dst)
    return dict(out)
