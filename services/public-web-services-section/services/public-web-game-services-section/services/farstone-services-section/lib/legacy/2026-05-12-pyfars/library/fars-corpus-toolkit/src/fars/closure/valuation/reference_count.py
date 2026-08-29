"""Number of citation entries declared in frontmatter ``references:``."""
from __future__ import annotations

from typing import Mapping


def score(fm: Mapping) -> int:
    refs = fm.get("references")
    if not isinstance(refs, list):
        return 0
    return sum(1 for r in refs if isinstance(r, dict) or isinstance(r, str))
