"""An EAVT cell: one frontmatter assertion flattened to (entity, attribute, value).

``flat`` is False for nested or non-scalar values (lists of dicts, deep maps);
``value`` is None in that case. Top-level scalars and lists-of-scalars become
``flat=True`` rows.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Claim:
    entity: str
    attribute: str
    value: str | None
    mtime: float
    source_path: Path
    flat: bool
