"""Number of H2 headings in a body — a structural-completeness proxy."""
from __future__ import annotations

import re

_H2_RE = re.compile(r"(?m)^##\s+\S")


def score(body: str) -> int:
    return len(_H2_RE.findall(body))
