"""Whether the note's frontmatter declares a non-empty ``description:``."""
from __future__ import annotations

from typing import Mapping


def score(fm: Mapping) -> bool:
    v = fm.get("description")
    return isinstance(v, str) and bool(v.strip())
