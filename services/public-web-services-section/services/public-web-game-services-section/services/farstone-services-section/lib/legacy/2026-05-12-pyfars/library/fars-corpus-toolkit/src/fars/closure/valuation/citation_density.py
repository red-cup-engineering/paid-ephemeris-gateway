"""Number of cited-or-cross-referenced things in a body.

Counts pandoc citations ``[@key]`` plus markdown links to ``.md`` targets.
A proxy for how much this note's prose is doing the work of *connecting*
versus *standing alone*.
"""
from __future__ import annotations

from fars.substrate.parse.citations import parse as parse_citations
from fars.substrate.parse.markdown_links import parse as parse_links


def score(body: str) -> int:
    cites = len(parse_citations(body))
    refs = sum(1 for link in parse_links(body)
               if link.kind in ("relative", "absolute"))
    return cites + refs
