"""Cycles in the depends-on graph — corruption signal.

Each detected cycle becomes one Diagnostic. Self-loops carry the
offending slug's path; multi-node SCCs have ``path=None`` because no
single file owns the cycle.
"""
from __future__ import annotations

from typing import Iterable, Iterator, Mapping

from fars.operator.traversal.cycles import detect
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.flatfile import Flatfile


def check(depends_on: Mapping[str, Iterable[str]],
          by_slug: Mapping[str, list[Flatfile]]) -> Iterator[Diagnostic]:
    for cycle in detect(depends_on):
        if len(cycle) == 1:
            slug = cycle[0]
            notes = by_slug.get(slug, [])
            yield Diagnostic(
                code="cycle",
                severity="error",
                message=f"`{slug}` lists itself in depends-on (self-loop)",
                path=notes[0].path if notes else None,
                extra={"slugs": cycle},
            )
        else:
            yield Diagnostic(
                code="cycle",
                severity="error",
                message="cycle in depends-on: " + " → ".join(f"`{s}`" for s in cycle),
                extra={"slugs": cycle},
            )
