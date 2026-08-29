"""What an agent (or reader) needs to know before reading a slug.

Returns the slug's transitive ancestors via ``depends-on``, topo-sorted
so dependencies appear before dependents. Suitable for "give me a
linearized reading list to ramp up on this theorem."
"""
from __future__ import annotations

from typing import Mapping

from fars.operator.traversal.ancestors import ancestors
from fars.operator.traversal.topo_sort import sort as topo_sort
from fars.substrate.flatfile import Flatfile


def gather(slug: str, *,
           by_slug: Mapping[str, list[Flatfile]],
           depends_on: Mapping[str, list[str]],
           ) -> list[Flatfile]:
    anc = ancestors(slug, depends_on)
    if not anc:
        return list(by_slug.get(slug, [])[:1])
    universe = anc | {slug}
    order = topo_sort(universe, depends_on)
    out: list[Flatfile] = []
    for s in order:
        cand = by_slug.get(s, [])
        if cand:
            out.append(cand[0])
    return out
