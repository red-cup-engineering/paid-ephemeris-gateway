"""A typed graph edge between notes.

Sourced from either a frontmatter relation key (``source='fm'``, with ``kind``
naming the predicate — depends-on, see-also, ...) or a body markdown link
(``source='body'``, ``kind='link'``). The destination is the raw target as
written; resolution to a real note is the consumer's job.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Predication:
    src: str
    dst: str
    kind: str
    source: Literal["fm", "body"]
    line: int | None = None
