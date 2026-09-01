"""Turn a note's frontmatter relation keys into ``Predication`` records.

The default ``RELATION_KEYS`` set is the canonical list of typed relations
used across the fars. Callers may pass a different tuple to widen or
narrow the predicate set.
"""
from __future__ import annotations

from typing import Iterable, Mapping

from fars.substrate.parse._slug_target import slug_of
from fars.convention import RELATION_KEYS
from fars.substrate.predication import Predication


def parse(fm: Mapping, *, slug: str,
          keys: Iterable[str] = RELATION_KEYS) -> list[Predication]:
    out: list[Predication] = []
    for k in keys:
        v = fm.get(k)
        items = v if isinstance(v, list) else [v] if isinstance(v, str) else []
        for item in items:
            if not isinstance(item, str):
                continue
            dst = slug_of(item)
            if dst is None:
                continue
            out.append(Predication(src=slug, dst=dst, kind=k, source="fm"))
    return out
