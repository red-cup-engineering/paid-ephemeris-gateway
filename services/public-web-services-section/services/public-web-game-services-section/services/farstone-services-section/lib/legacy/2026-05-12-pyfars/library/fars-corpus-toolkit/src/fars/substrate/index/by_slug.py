"""Group notes by slug. Multi-valued: same slug across multiple files is normal."""
from __future__ import annotations

from collections import defaultdict

from fars.substrate.flatfile import Flatfile


def build(notes: list[Flatfile]) -> dict[str, list[Flatfile]]:
    out: dict[str, list[Flatfile]] = defaultdict(list)
    for n in notes:
        out[n.slug].append(n)
    return dict(out)
