"""A parsed BibTeX entry — what we read out of a .bib file."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class BibEntry:
    entry_type: str
    key: str
    fields: dict[str, Any] = field(default_factory=dict)
