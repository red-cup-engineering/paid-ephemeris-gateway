"""Group notes by their declared (or inferred) kind."""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.flatfile import Flatfile


def build(notes: list[Flatfile]) -> dict[str, list[Flatfile]]:
    out: dict[str, list[Flatfile]] = defaultdict(list)
    for n in notes:
        out[n.kind].append(n)
    return dict(out)
