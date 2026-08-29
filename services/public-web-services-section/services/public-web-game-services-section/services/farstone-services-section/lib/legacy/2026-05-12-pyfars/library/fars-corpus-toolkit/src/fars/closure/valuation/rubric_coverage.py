"""Fraction of canonical rubric H2 headings present in the body.

A rubric is a list of compiled regex patterns, each matching one
H2-heading family ("Etymology / Lineage / Origins", "Examples", ...).
``score`` returns the fraction of rubric items that have at least one
match in the body. Pass ``rubric=DEFAULT_RUBRIC`` for the standard set
or any list of patterns for a custom one.
"""
from __future__ import annotations

import re
from typing import Iterable

DEFAULT_RUBRIC: tuple[re.Pattern, ...] = (
    re.compile(r"(?im)^##\s+(etymology|conceptual sources|lineage|conceptual lineage|origins?)\b"),
    re.compile(r"(?im)^##\s+(definitional structure|what.*is|definition)\b"),
    re.compile(r"(?im)^##\s+examples?\b"),
    re.compile(r"(?im)^##\s+(adjacent|distinguished|distinctions|related concepts)\b"),
    re.compile(r"(?im)^##\s+(open questions|questions|unresolved)\b"),
    re.compile(r"(?im)^##\s+(see also|further reading|cross.references)\b"),
)


def score(body: str, *,
          rubric: Iterable[re.Pattern] = DEFAULT_RUBRIC) -> float:
    rubric = tuple(rubric)
    if not rubric:
        return 0.0
    hits = sum(1 for pat in rubric if pat.search(body))
    return hits / len(rubric)
