"""Same slug declared by more than one note.

Whether collisions matter depends on the corpus: research programs use a
flat slug namespace and any collision is an error; the wider library
deliberately reuses slugs across domains. This rule emits a Diagnostic
per collision; the consumer decides whether to treat it as fatal.
"""
from __future__ import annotations

from typing import Iterator, Mapping

from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(by_slug: Mapping[str, list[Flatfile]]) -> Iterator[Diagnostic]:
    for slug, notes in by_slug.items():
        if len(notes) < 2:
            continue
        paths = sorted(str(n.path) for n in notes)
        yield Diagnostic(
            code="slug-collision",
            severity="warning",
            message=f"`{slug}` declared by {len(notes)} files: " + ", ".join(f"`{p}`" for p in paths),
            extra={"slug": slug, "paths": paths},
        )
