"""A single markdown note: parsed frontmatter plus body."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Flatfile:
    slug: str
    dir: str
    kind: str
    fm: dict
    body: str
    path: Path
    mtime: float
