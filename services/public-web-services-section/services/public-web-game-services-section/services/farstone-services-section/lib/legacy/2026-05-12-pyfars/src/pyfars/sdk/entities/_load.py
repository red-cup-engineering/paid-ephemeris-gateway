"""System-cell → Pydantic-typed-view loader.

The one path from cells to a typed entity. No file walks. No
markdown re-parsing. The system store carries every cell already
(including the body, projected by the markdown-body projector); this
module just gathers the cells for a subject and hands them to the
entity's Pydantic constructor.
"""
from __future__ import annotations

from typing import Any, Iterable, TypeVar

from pydantic import BaseModel
from pypredcalc.predication import PredicationStore

from pyfars.kernel import query


T = TypeVar("T", bound=BaseModel)


_STRUCTURAL_PREDICATES: frozenset[str] = frozenset({
    "projected-from-path",
    "has-heading",
    "has-code-fence",
    "links-to",
    "imports",
    "defines-function",
    "defines-class",
    "decorated-by",
})


def gather_fm(store: PredicationStore, subject: str) -> dict[str, Any] | None:
    cells = list(query.cells_at(store, subject))
    if not cells:
        return None
    out: dict[str, Any] = {"slug": subject}
    for (_s, p, o) in cells:
        if p in _STRUCTURAL_PREDICATES:
            continue
        if p in out and p != "slug":
            existing = out[p]
            if isinstance(existing, list):
                if o not in existing:
                    existing.append(o)
            else:
                if o != existing:
                    out[p] = [existing, o]
        else:
            out[p] = o
    return out


def load_one(
    cls: type[T],
    store: PredicationStore,
    subject: str,
) -> T | None:
    fm = gather_fm(store, subject)
    if fm is None:
        return None
    if "type" in cls.model_fields:
        field = cls.model_fields["type"]
        if field.annotation is not str and isinstance(fm.get("type"), str):
            fm.pop("type", None)
    try:
        return cls(**fm)
    except Exception:
        return None


def load_all(
    cls: type[T],
    store: PredicationStore,
    *,
    types: Iterable[str],
) -> list[T]:
    out: list[T] = []
    for subject in sorted(query.subjects_of_type(store, types), key=str):
        record = load_one(cls, store, str(subject))
        if record is not None:
            out.append(record)
    return out


__all__ = ["gather_fm", "load_all", "load_one"]
