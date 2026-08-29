"""Remove H2 sections whose heading starts with ``Lean``.

Lean mechanization is internal bookkeeping — not part of the published
monograph prose. Returns the body with Lean sections excised and a
trailing newline restored.
"""
from __future__ import annotations

import re

_LEAN_SECTION_RE = re.compile(
    r"^## +Lean\b.*?(?=^#{1,2} |\Z)",
    re.MULTILINE | re.DOTALL,
)


def strip(body: str) -> str:
    return _LEAN_SECTION_RE.sub("", body).rstrip() + "\n"
