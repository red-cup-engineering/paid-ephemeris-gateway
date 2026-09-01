"""System — the kernel's query handle over a predication store.

A System is a query handle over a :class:`PredicationStore` — not a
directory-walker. The normal operational entry point is
:meth:`System.from_scopes`: the caller declares which substrate scopes
(directory sub-regions) it needs; the system loads only those paths,
applies closure, and returns the handle. Scoped loading is O(cells in
scope), not O(corpus).

:meth:`System.from_root` is a bootstrap-only escape hatch that walks
the entire ``root``. Use it only when you genuinely need the full
corpus (e.g. migrations, validation tools). Materializer programs
should always use ``from_scopes``.

Surface::

    s = System.from_scopes(root, ["governance/offices"])
    # or bootstrap-only:
    s = System.from_root(root)

    s.value(subject, predicate, object)
    s.holds(subject, predicate, object)
    s.cells_at(subject)
    s.t_cells()
    s.subjects_with(predicate, object)
    s.objects_under(subject, predicates)
    s.predicates_of(subject)
    s.in_edges(slug, predicates=...)
    s.out_edges(slug, predicates=...)
    s.relation_map(predicate, direction=...)
    s.all_subjects()
    s.all_entities()
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Hashable, Iterable, Iterator

from pypredcalc.predication import PredicationStore

from pyfars.kernel import query


@dataclass
class System:
    root: Path
    store: PredicationStore = field(default_factory=PredicationStore.empty)

    @classmethod
    def from_scopes(
        cls,
        root: Path | str,
        scopes: list[str],
        *,
        env: dict[str, str] | None = None,
    ) -> "System":
        """Load only the declared substrate scopes and return a System.

        Each entry in ``scopes`` is a substrate-relative directory path
        (e.g. ``"governance/offices"``). Resolution follows the lookup
        chain in :mod:`pyfars.kernel.scope`: env var override →
        local ``.envrc`` → ``~/.envrc`` → default ``root/scope``.

        Scoped loading is O(cells in scope). When ``scopes`` is empty
        the filter is None and the full root is walked — callers that
        want that behaviour should pass an explicit empty list and accept
        the cost.
        """
        from pyfars.kernel.projector.compound import extract_tree
        from pyfars.kernel.closure import apply_active_rules
        from pyfars.kernel.scope import make_path_filter
        path_filter = make_path_filter(Path(root), scopes, env=env)
        raw = PredicationStore.from_cells(extract_tree(Path(root), path_filter=path_filter))
        closed, _changed = apply_active_rules(store=raw)
        return cls(root=Path(root), store=closed)

    @classmethod
    def from_root(
        cls,
        root: Path | str,
        *,
        path_filter: Callable[[Path], bool] | None = None,
    ) -> "System":
        """Bootstrap-only: walk all of ``root`` and return a System.

        Use :meth:`from_scopes` for operational code. This method walks
        the entire corpus — O(all cells) — and is only appropriate for
        migration tools, full-corpus validation, or other cases where
        the full substrate is genuinely needed.
        """
        from pyfars.kernel.projector.compound import extract_tree
        from pyfars.kernel.closure import apply_active_rules
        raw = PredicationStore.from_cells(extract_tree(Path(root), path_filter=path_filter))
        closed, _changed = apply_active_rules(store=raw)
        return cls(root=Path(root), store=closed)

    # ---- query (proxy to pyfars.kernel.query) -----------------------

    def value(self, subject: Hashable, predicate: Hashable, obj: Hashable):
        return query.value(self.store, subject, predicate, obj)

    def holds(self, subject, predicate, obj) -> bool:
        return query.holds(self.store, subject, predicate, obj)

    def t_cells(self) -> Iterator:
        return query.t_cells(self.store)

    def cells_with_value(self, value) -> Iterator:
        return query.cells_with_value(self.store, value)

    def subjects_with(self, predicate, obj) -> set:
        return query.subjects_with(self.store, predicate, obj)

    def objects_under(self, subject, predicates: Iterable) -> set:
        return query.objects_under(self.store, subject, predicates)

    def predicates_of(self, subject) -> set:
        return query.predicates_of(self.store, subject)

    def cells_at(self, subject) -> Iterator:
        return query.cells_at(self.store, subject)

    def subjects_of_type(self, types: Iterable) -> set:
        return query.subjects_of_type(self.store, types)

    def all_subjects(self) -> set:
        return query.all_subjects(self.store)

    def all_entities(self) -> tuple:
        return query.all_entities(self.store)

    def relation_map(self, predicate, *, direction: str = "subject-keyed") -> dict:
        return query.relation_map(self.store, predicate, direction=direction)

    def in_edges(self, slug, *, predicates: Iterable | None = None) -> Iterator:
        return query.in_edges(self.store, slug, predicates=predicates)

    def out_edges(self, slug, *, predicates: Iterable | None = None) -> Iterator:
        return query.out_edges(self.store, slug, predicates=predicates)
