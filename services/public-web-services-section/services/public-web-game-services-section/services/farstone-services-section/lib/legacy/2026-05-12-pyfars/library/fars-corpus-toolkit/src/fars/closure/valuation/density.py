"""Body-length density curve — peaks at 4–10k characters.

Tries to capture "this note is the right size to read":

  - 0..800:    ramps up linearly to 0.5 (under-developed)
  - 800..4k:   ramps up to 1.0 (depth without bloat)
  - 4k..10k:   1.0 (the sweet spot)
  - 10k..18k:  ramps down to 0.7 (long but not yet excessive)
  - 18k+:      0.7 floor (sprawling, but still useful)
"""
from __future__ import annotations


def score(body: str) -> float:
    n = len(body.strip())
    if n < 800:
        return n / 800.0 * 0.5
    if n < 4000:
        return 0.5 + (n - 800) / 3200 * 0.5
    if n < 10000:
        return 1.0
    if n < 18000:
        return 1.0 - (n - 10000) / 8000 * 0.3
    return 0.7
