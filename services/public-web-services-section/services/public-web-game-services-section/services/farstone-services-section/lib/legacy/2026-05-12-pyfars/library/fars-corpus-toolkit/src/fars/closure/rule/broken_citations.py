"""Body ``[@key]`` citations whose key isn't in the known bib-key set."""
from __future__ import annotations

from typing import Container, Iterator

from fars.substrate.parse.citations import parse as parse_citations
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(notes: list[Flatfile], bib_keys: Container[str]) -> Iterator[Diagnostic]:
    for n in notes:
        for c in parse_citations(n.body):
            if c.key in bib_keys:
                continue
            yield Diagnostic(
                code="broken-citation",
                severity="error",
                message=f"cites missing bib key `{c.key}`",
                path=n.path,
                line=c.line,
                extra={"slug": n.slug, "key": c.key},
            )
