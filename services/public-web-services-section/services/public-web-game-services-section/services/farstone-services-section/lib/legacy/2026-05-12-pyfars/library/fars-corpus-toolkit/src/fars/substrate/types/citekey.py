"""A pandoc-style citation reference in a note body: ``[@key]``."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CiteKey:
    key: str
    line: int
