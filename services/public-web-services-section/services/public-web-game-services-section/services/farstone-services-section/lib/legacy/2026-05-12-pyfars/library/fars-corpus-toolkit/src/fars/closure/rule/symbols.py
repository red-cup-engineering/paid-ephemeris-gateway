"""Two or more notes claiming the same ``symbol:`` — canonical-notation collision.

Soft warning: in research-program contexts the same symbol shouldn't denote
two distinct objects, but in the wider library a symbol like ``X`` may
legitimately reappear in unrelated domains.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable, Iterator

from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile], *,
          relevant_dirs: Iterable[str] = (
              "concepts", "objects", "morphisms", "theorems",
          ),
          ) -> Iterator[Diagnostic]:
    relevant = set(relevant_dirs)
    by_symbol: dict[str, list[str]] = defaultdict(list)
    for n in notes:
        if n.dir not in relevant:
            continue
        sym = n.fm.get("symbol")
        if not sym:
            continue
        by_symbol[str(sym)].append(n.slug)
    for sym, slugs in sorted(by_symbol.items()):
        if len(slugs) < 2:
            continue
        slugs = sorted(slugs)
        yield Diagnostic(
            code="symbol-collision",
            severity="warning",
            message=f"`{sym}` claimed by " + ", ".join(f"`{s}`" for s in slugs),
            extra={"symbol": sym, "slugs": slugs},
        )
