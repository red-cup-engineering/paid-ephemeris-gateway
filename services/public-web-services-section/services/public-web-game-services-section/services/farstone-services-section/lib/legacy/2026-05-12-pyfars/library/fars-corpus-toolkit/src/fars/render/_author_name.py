"""Normalize a single author name to BibTeX ``Lastname, Firstnames`` form.

Already-comma form is left as-is. Single-word names are left as-is.
``First M. Last`` and ``First Last`` are reordered to ``Last, First M.``.
"""
from __future__ import annotations


def normalize(name: str) -> str:
    s = name.strip()
    if not s or "," in s:
        return s
    parts = s.split()
    if len(parts) <= 1:
        return s
    return f"{parts[-1]}, {' '.join(parts[:-1])}"
