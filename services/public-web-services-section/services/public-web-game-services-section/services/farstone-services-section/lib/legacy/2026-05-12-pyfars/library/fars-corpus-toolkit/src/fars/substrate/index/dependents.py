"""Reverse depends-on adjacency: ``slug -> [slugs that depend on it]``."""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.predication import Predication


def build(edges: list[Predication]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e.source == "fm" and e.kind == "depends-on":
            out[e.dst].append(e.src)
    return dict(out)
