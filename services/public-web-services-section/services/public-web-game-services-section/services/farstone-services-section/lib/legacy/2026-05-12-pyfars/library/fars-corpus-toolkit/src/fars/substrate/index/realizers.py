"""Index ``realizes:`` and ``instantiates:`` relations.

Returns ``{concept_slug: [realizer_slugs]}`` where realizers are notes
declaring a ``realizes:`` (definitions / morphisms) or ``instantiates:``
(examples) pointing at the concept.
"""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.flatfile import Flatfile


def build(notes: list[Flatfile]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for n in notes:
        if n.kind in ("definition", "morphism"):
            rs = n.fm.get("realizes") or []
        elif n.kind == "example":
            rs = n.fm.get("instantiates") or []
        else:
            continue
        if isinstance(rs, str):
            rs = [rs]
        for r in rs:
            if isinstance(r, str):
                out[r].append(n.slug)
    return dict(out)
