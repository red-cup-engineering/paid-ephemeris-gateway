"""Flatten every note's frontmatter into ``Claim`` rows (the EAVT view).

One row per scalar assertion. Nested predicates emit a ``flat=False``
marker row at the key — useful for "this predicate has nested bodies"
diagnostics without losing track that the key was present.
"""
from __future__ import annotations

from fars.substrate.index._fm_walk import walk
from fars.substrate.types.claim import Claim
from fars.substrate.flatfile import Flatfile


def build(notes: list[Flatfile]) -> list[Claim]:
    out: list[Claim] = []
    for n in notes:
        for key, val, flat in walk(n.fm):
            out.append(Claim(
                entity=n.slug,
                attribute=".".join(key),
                value=None if val is None else str(val),
                mtime=n.mtime,
                source_path=n.path,
                flat=flat,
            ))
    return out
