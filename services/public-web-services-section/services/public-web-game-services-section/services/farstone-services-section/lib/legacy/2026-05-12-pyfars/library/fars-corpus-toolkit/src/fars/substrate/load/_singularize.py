"""Crude singularization for kind defaults: drop trailing 's' if present."""
from __future__ import annotations


def singularize(s: str) -> str:
    if len(s) > 1 and s.endswith("s"):
        return s[:-1]
    return s
