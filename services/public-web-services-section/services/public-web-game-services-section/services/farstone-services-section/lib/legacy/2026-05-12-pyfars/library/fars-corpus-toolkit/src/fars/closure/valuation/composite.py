"""Combine per-slug score maps into one composite map.

Each input is a ``dict[slug, float]`` produced by an individual scorer.
Slugs missing from a map default to ``default`` (1.0 for product, 0.0
for sum). The combine callable reduces an iterable of factors to a
single number — defaults to product, which is the right shape for
"this note is good iff it is good across every dimension."

Callers are responsible for clamping factors to ``[0, 1]`` (or whatever
range makes sense) before passing in. ``composite`` is just the reducer.
"""
from __future__ import annotations

import math
from typing import Callable, Iterable


def score(*signals: dict[str, float],
          combine: Callable[[Iterable[float]], float] = math.prod,
          default: float = 1.0,
          ) -> dict[str, float]:
    slugs: set[str] = set().union(*(s.keys() for s in signals))
    return {
        s: combine(sig.get(s, default) for sig in signals)
        for s in slugs
    }
