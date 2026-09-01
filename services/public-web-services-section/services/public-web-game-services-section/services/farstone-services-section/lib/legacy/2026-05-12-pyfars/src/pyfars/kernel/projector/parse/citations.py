"""Find pandoc-style ``[@key]`` citations in a markdown body.

Returns a list of ``(key, line)`` tuples — one per match.
"""
from __future__ import annotations

import re

_CITE_RE = re.compile(r"\[@([a-z][a-z0-9\-]*\d{4}[a-z]?)\]")


def parse(body: str) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    for line_idx, line in enumerate(body.split("\n"), start=1):
        for m in _CITE_RE.finditer(line):
            out.append((m.group(1), line_idx))
    return out
