"""Detect LLM-output marker phrases in a body.

Returns True when any well-known "I'm an AI" boilerplate phrase appears,
which indicates the body wasn't fully cleaned up after generation.
"""
from __future__ import annotations

import re

_SLOP_RE = re.compile(
    r"(?:^|\n)\s*(?:As an AI|I cannot|Here's a|As a language model|I apologize)\b",
    re.IGNORECASE,
)


def score(body: str) -> bool:
    return bool(_SLOP_RE.search(body))
