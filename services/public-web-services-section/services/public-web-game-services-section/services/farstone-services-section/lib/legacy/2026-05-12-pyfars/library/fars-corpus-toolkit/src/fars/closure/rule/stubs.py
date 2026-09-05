"""Notes whose body is below a character threshold.

Excludes ``narrative`` notes by default — those are positional/structural
and may legitimately be short. Pass ``exclude_kinds`` to widen or narrow.
"""
from __future__ import annotations

from typing import Iterable, Iterator

from fars.closure.valuation.body_chars import score as body_chars
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile], *,
          min_chars: int = 200,
          exclude_kinds: Iterable[str] = ("narrative",),
          ) -> Iterator[Diagnostic]:
    exclude = set(exclude_kinds)
    for n in notes:
        if n.kind in exclude:
            continue
        chars = body_chars(n.body)
        if chars < min_chars:
            yield Diagnostic(
                code="stub",
                severity="warning",
                message=f"`{n.slug}` ({n.kind}, {chars} chars)",
                path=n.path,
                extra={"slug": n.slug, "kind": n.kind, "chars": chars},
            )
