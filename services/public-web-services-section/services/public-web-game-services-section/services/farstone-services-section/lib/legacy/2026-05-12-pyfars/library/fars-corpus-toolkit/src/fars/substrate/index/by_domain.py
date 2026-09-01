"""Index domain notes (``_index.md`` files) by their slug.

A domain note's slug is the parent directory name (set by ``load.note``).
Multi-valued: the same domain name may appear in multiple branches of the
hierarchy (e.g., ``math/algebra`` and ``applied-math/algebra``).
"""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.flatfile import Flatfile


def build(notes: list[Flatfile]) -> dict[str, list[Flatfile]]:
    out: dict[str, list[Flatfile]] = defaultdict(list)
    for n in notes:
        if n.path.name == "_index.md":
            out[n.slug].append(n)
    return dict(out)
