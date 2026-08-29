"""Shift every markdown heading level down by ``by`` steps."""
from __future__ import annotations

import re

_HEADING_RE = re.compile(r"^(#+)(?=\s)", re.MULTILINE)


def demote(body: str, by: int) -> str:
    if by <= 0:
        return body
    return _HEADING_RE.sub(lambda m: "#" * (len(m.group(1)) + by), body)
