"""A loaded-fars context with lazily-built indexes.

Most CLIs start the same way: load notes, build by_slug, build edges,
build depends_on / dependents / in_edges / out_edges, maybe also a
claims index. ``Substrate`` consolidates that pattern with cached
properties — the first access to ``.by_slug`` parses notes; subsequent
accesses are free; ``.edges`` is built once and shared with everything
that needs it.

A ``Substrate`` is a thin handle: holds the root path and the parse
diagnostics, then computes everything on demand. Use it from CLI mains
to avoid the load-+-build boilerplate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Callable

from fars.substrate.types.claim import Claim
from fars.substrate.types.diagnostic import Diagnostic
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


@dataclass
class Substrate:
    root: Path
    path_filter: Callable[[Path], bool] | None = None
    _parse_diags_storage: list[Diagnostic] = field(default_factory=list, init=False)

    @cached_property
    def notes(self) -> list[Flatfile]:
        from fars.substrate.load._path_filter import keep
        from fars.substrate.load.notes import load
        notes, diags = load(self.root, path_filter=self.path_filter or keep)
        self._parse_diags_storage = list(diags)
        return notes

    @property
    def parse_diagnostics(self) -> list[Diagnostic]:
        _ = self.notes  # force load
        return self._parse_diags_storage

    @cached_property
    def by_slug(self) -> dict[str, list[Flatfile]]:
        from fars.substrate.index.by_slug import build
        return build(self.notes)

    @cached_property
    def by_kind(self) -> dict[str, list[Flatfile]]:
        from fars.substrate.index.by_kind import build
        return build(self.notes)

    @cached_property
    def by_dir(self) -> dict[str, list[Flatfile]]:
        from fars.substrate.index.by_dir import build
        return build(self.notes)

    @cached_property
    def by_domain(self) -> dict[str, list[Flatfile]]:
        from fars.substrate.index.by_domain import build
        return build(self.notes)

    @cached_property
    def edges(self) -> list[Predication]:
        from fars.substrate.index.edges import build
        return build(self.notes)

    @cached_property
    def fm_edges(self) -> list[Predication]:
        from fars.substrate.index.edges import build
        return build(self.notes, sources=("fm",))

    @cached_property
    def in_edges(self) -> dict[str, list[Predication]]:
        from fars.substrate.index.in_edges import build
        return build(self.edges)

    @cached_property
    def out_edges(self) -> dict[str, list[Predication]]:
        from fars.substrate.index.out_edges import build
        return build(self.edges)

    @cached_property
    def depends_on(self) -> dict[str, list[str]]:
        from fars.substrate.index.depends_on import build
        return build(self.fm_edges)

    @cached_property
    def dependents(self) -> dict[str, list[str]]:
        from fars.substrate.index.dependents import build
        return build(self.fm_edges)

    @cached_property
    def claims(self) -> list[Claim]:
        from fars.substrate.index.claims import build
        return build(self.notes)

    @cached_property
    def known_slugs(self) -> set[str]:
        return set(self.by_slug.keys())
