"""The JSON-document projector.

Like ``yaml_doc`` but for JSON: extract / create cells over a JSON
top-level object. Same shape (``(subject, key, value)`` per scalar
or per list element); nested objects deferred.

Distinct from ``yaml_doc`` so each format's quirks (formatting,
key-quoting, trailing-newline conventions) stay in their own modules.
"""
from __future__ import annotations

import json
from typing import Any, Iterable

from pypredcalc.predication import PredicationCell


class JsonError(Exception):
    """Raised when a JSON document is present but won't parse."""


def _flatten_value(value: Any) -> tuple[Any, ...]:
    if value is None or value == "":
        return ()
    if isinstance(value, list):
        return tuple(
            v for v in value
            if v is not None and v != ""
            and not isinstance(v, (list, dict))
        )
    if isinstance(value, dict):
        return ()
    return (value,)


class JsonDocProjector:
    """JSON document ↔ ``PredicationCell``."""

    name = "json-doc"
    vocabulary: tuple[str, ...] = ()  # open vocabulary

    def extract(self, data: str, *, subject: str) -> Iterable[PredicationCell]:
        if not isinstance(data, str) or not data.strip():
            return
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError as e:
            raise JsonError(f"JSON error: {e}") from e
        if not isinstance(parsed, dict):
            return
        for key, value in parsed.items():
            for obj in _flatten_value(value):
                yield PredicationCell(
                    subject=subject,
                    predicate=key,
                    object=obj,
                )

    def create(self, cells: Iterable[PredicationCell]) -> str:
        cells = list(cells)
        if not cells:
            return ""
        order: list[str] = []
        groups: dict[str, list[Any]] = {}
        for cell in cells:
            key = str(cell.predicate)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(cell.object)
        doc: dict[str, Any] = {}
        for key in order:
            values = groups[key]
            doc[key] = values[0] if len(values) == 1 else values
        return json.dumps(doc, indent=2) + "\n"


PROJECTOR = JsonDocProjector()


__all__ = ["JsonDocProjector", "JsonError", "PROJECTOR"]
