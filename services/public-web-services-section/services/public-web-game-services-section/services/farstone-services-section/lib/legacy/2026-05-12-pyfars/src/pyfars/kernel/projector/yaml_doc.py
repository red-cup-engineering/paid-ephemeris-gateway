"""The YAML-document projector.

Extracts and creates predication cells from a free-standing YAML
document (one whose contents *aren't* prefixed by markdown). Each
top-level ``key: value`` becomes ``(subject, key, value)``; lists
fan out one cell per item; nested mappings are deferred (a
``yaml-nested`` projector can layer on top later).

This projector shares its key/value handling with
``markdown_frontmatter`` — the markdown projector is essentially
``yaml_doc`` plus a ``---`` delimiter and a body. The two stay in
separate modules so the predicate-shape rules each format cares
about can diverge over time.
"""
from __future__ import annotations

from typing import Any, Iterable

import yaml
from pypredcalc.predication import PredicationCell


class YamlError(Exception):
    """Raised when a YAML document is present but won't parse."""


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


class YamlDocProjector:
    """Free-standing YAML document ↔ ``PredicationCell``."""

    name = "yaml-doc"
    vocabulary: tuple[str, ...] = ()  # open vocabulary

    def extract(self, data: str, *, subject: str) -> Iterable[PredicationCell]:
        """Parse ``data`` (full YAML text) and yield cells.

        Empty documents and documents whose top-level isn't a mapping
        produce zero cells (no ValueError — the projector is total
        on text input).
        """
        if not isinstance(data, str) or not data.strip():
            return
        try:
            parsed = yaml.safe_load(data)
        except yaml.YAMLError as e:
            raise YamlError(f"YAML error: {e}") from e
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
        """Render cells back to a YAML document.

        Cells with the same predicate collapse to a list (preserving
        emit order); distinct predicates become distinct top-level
        keys. Empty input returns the empty string.
        """
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
        return yaml.safe_dump(doc, sort_keys=False, default_flow_style=False)


PROJECTOR = YamlDocProjector()


__all__ = ["PROJECTOR", "YamlDocProjector", "YamlError"]
