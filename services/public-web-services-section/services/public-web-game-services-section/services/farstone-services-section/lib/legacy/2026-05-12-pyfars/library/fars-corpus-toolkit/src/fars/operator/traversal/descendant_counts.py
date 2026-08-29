"""Per-slug count of transitive descendants in the depends-on graph.

High count means load-bearing — many things would fail if this slug
moved or changed shape.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.operator.traversal.descendants import descendants


def counts(slugs: Iterable[str],
           dependents: Mapping[str, Iterable[str]]) -> dict[str, int]:
    return {s: len(descendants(s, dependents)) for s in slugs}
