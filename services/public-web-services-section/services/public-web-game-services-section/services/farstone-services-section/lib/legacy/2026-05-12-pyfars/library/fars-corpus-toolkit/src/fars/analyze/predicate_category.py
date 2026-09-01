"""Classify a frontmatter predicate as META, SCALAR_CONFIG, or EDGE.

  - **META**: file-about-itself fields (title, description, authors,
    layout, dates, …). Not graph edges.
  - **SCALAR_CONFIG**: literal scalar values (LLM parameters, version
    numbers, ordering keys). Not entity references.
  - **EDGE**: typed graph relations (default for unknowns).

The default sets live in ``fars.convention``. Pass custom ``meta`` /
``scalar_config`` sets to override per-call.
"""
from __future__ import annotations

from typing import Container, Literal

from fars.convention import META, SCALAR_CONFIG

Category = Literal["META", "SCALAR_CONFIG", "EDGE"]


def category(predicate: str, *,
             meta: Container[str] = META,
             scalar_config: Container[str] = SCALAR_CONFIG) -> Category:
    if predicate in meta:
        return "META"
    if predicate in scalar_config:
        return "SCALAR_CONFIG"
    return "EDGE"
