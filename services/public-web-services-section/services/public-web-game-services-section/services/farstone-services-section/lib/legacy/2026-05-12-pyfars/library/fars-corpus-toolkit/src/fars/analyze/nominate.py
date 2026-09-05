"""Rank library notes by hand-curation leverage.

Composite score:
    inbound × (broken_outbound + 1) × no_description_factor × thinness_factor

  - inbound:               raw count, the volume term.
  - broken_outbound + 1:   broken neighborhoods are visible to readers.
  - no_description:        1.0 when fm.description is empty, else 0.4.
  - thinness:              1.0 if body < 500 chars, 0.7 if < 1500, else 0.4.

High score ⇒ many readers, broken neighborhoods, thin content, missing
meta description — the single page most worth hand-curating.
"""
from __future__ import annotations

from fars.closure.valuation.broken_outbound import score as broken_outbound
from fars.closure.valuation.has_description import score as has_description
from fars.closure.valuation.inbound import score as inbound_count
from fars.substrate.flatfile import Flatfile


def _thinness(body: str) -> float:
    n = len(body.strip())
    if n < 500:
        return 1.0
    if n < 1500:
        return 0.7
    return 0.4


def find(notes: list[Flatfile], *,
         in_edges, out_edges, known_slugs,
         path_prefix: str | None = "library",
         limit: int = 15,
         ) -> list[dict]:
    out: list[dict] = []
    for n in notes:
        if path_prefix and not str(n.path).startswith(path_prefix):
            continue
        in_n = inbound_count(n.slug, in_edges)
        if in_n == 0:
            continue
        out_b = broken_outbound(n.slug, out_edges, known_slugs)
        no_desc = 1.0 if not has_description(n.fm) else 0.4
        thin = _thinness(n.body)
        score = in_n * (out_b + 1) * no_desc * thin
        out.append({
            "score": score,
            "slug": n.slug,
            "path": n.path,
            "inbound": in_n,
            "broken_outbound": out_b,
            "body_chars": len(n.body.strip()),
            "has_description": has_description(n.fm),
        })
    out.sort(key=lambda r: -r["score"])
    return out[:limit]
