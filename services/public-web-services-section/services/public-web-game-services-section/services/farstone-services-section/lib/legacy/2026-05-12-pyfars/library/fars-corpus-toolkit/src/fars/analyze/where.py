"""Propose a canonical directory for a new note based on existing convention.

Frequency-counts the parent-directory names of every note matching the
target ``kind``, and ranks them. The most common dir is the convention
for that kind. Returns ``[(dir, count, sample_paths), ...]``.
"""
from __future__ import annotations

from collections import Counter
from typing import Iterable

from fars.substrate.flatfile import Flatfile


def propose(notes: Iterable[Flatfile], *, kind: str
            ) -> list[tuple[str, int, list[str]]]:
    matching = [n for n in notes if n.kind == kind]
    if not matching:
        return []
    by_dir: dict[str, list[Flatfile]] = {}
    for n in matching:
        parent = str(n.path.parent).replace("\\", "/")
        by_dir.setdefault(parent, []).append(n)
    counts = Counter({d: len(ns) for d, ns in by_dir.items()})
    out: list[tuple[str, int, list[str]]] = []
    for d, c in counts.most_common(10):
        sample = [n.slug for n in by_dir[d][:3]]
        out.append((d, c, sample))
    return out
