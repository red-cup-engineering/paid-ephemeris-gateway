"""Pull the first H1 out of a body. Returns ``(title, rest_of_body)``.

Strips trailing ``{#anchor}`` syntax from the heading text. If no H1 is
found, returns ``("", body)``.
"""
from __future__ import annotations

import re

_H1_RE = re.compile(r"^# (.+?)(?:\s*\{#[^}]+\})?\s*$", re.MULTILINE)


def extract(body: str) -> tuple[str, str]:
    m = _H1_RE.search(body)
    if not m:
        return "", body.strip()
    title = m.group(1).strip()
    rest = body[: m.start()] + body[m.end():]
    return title, rest.strip()
