"""Body length excluding heading lines and blank lines.

This is the "real prose" measurement — heading scaffolding doesn't count
toward whether a note has substantive content.
"""
from __future__ import annotations


def score(body: str) -> int:
    return sum(
        len(line) for line in body.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )
