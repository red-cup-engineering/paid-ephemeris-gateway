"""The markdown-frontmatter projector.

Extracts and creates predication cells from a markdown document's
YAML frontmatter block. Each ``(key, value)`` pair becomes one cell
``(subject, key, value)`` with bilattice value ``T``. List values
emit one cell per item; the body of the markdown document is left
untouched on ``create``.

Vocabulary: every predicate the projector emits is a frontmatter key.
Because PyFARS's frontmatter vocabulary is open (any cell author can
introduce a new key), this projector reports its emitted predicates
dynamically — its declared ``vocabulary`` is the set of
*predicate-shape-discipline* keys (relational + state-flag + event-
record), but extraction does not refuse unknown keys.
"""
from __future__ import annotations

import re
from typing import Any, Iterable

import yaml
from pypredcalc.predication import PredicationCell


_FM_RE = re.compile(r"\A---\n(.*?)\n?---\n?(.*)\Z", re.DOTALL)


class FrontmatterError(Exception):
    """Raised when a frontmatter block exists but won't parse."""


def _split(text: str) -> tuple[dict | None, str]:
    """Return ``(fm_dict_or_None, body)``. Identical to legacy parser."""
    m = _FM_RE.match(text)
    if not m:
        return None, text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        raise FrontmatterError(f"YAML error: {e}") from e
    if not isinstance(fm, dict):
        raise FrontmatterError("frontmatter must be a YAML mapping")
    return fm, m.group(2)


def _flatten_value(value: Any) -> tuple[Any, ...]:
    """Yield each *hashable scalar* object for a leaf frontmatter value.

    Lists fan out to one cell per scalar element. Empty / None values
    produce zero cells. Nested structures (dicts, list-of-dict) are
    handled at a higher level by :func:`_flatten_pairs`.
    """
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


def _flatten_pairs(
    prefix: str, value: Any,
) -> tuple[tuple[str, Any], ...]:
    """Lower a (possibly-nested) frontmatter value to ``(predicate, object)`` pairs.

    A nested YAML map ``{nix-package: {builds-with: foo,
    depends-on: [bar, baz]}}`` lowers to:

      (nix-package.builds-with, foo)
      (nix-package.depends-on, bar)
      (nix-package.depends-on, baz)

    The math: nested keys are equivalent to dotted-path predicates over
    the same subject. List elements that are themselves dicts recurse
    under the same parent prefix — they fan out by index-free union, so
    a list of homogeneously-shaped sub-records still flattens cleanly.
    """
    if isinstance(value, dict):
        out: list[tuple[str, Any]] = []
        for sub_key, sub_value in value.items():
            child_pred = f"{prefix}.{sub_key}" if prefix else str(sub_key)
            out.extend(_flatten_pairs(child_pred, sub_value))
        return tuple(out)
    if isinstance(value, list):
        out: list[tuple[str, Any]] = []
        for element in value:
            if isinstance(element, dict):
                out.extend(_flatten_pairs(prefix, element))
            else:
                if element is None or element == "":
                    continue
                if isinstance(element, list):
                    continue
                out.append((prefix, element))
        return tuple(out)
    if value is None or value == "":
        return ()
    return ((prefix, value),)


class MarkdownFrontmatterProjector:
    """Markdown frontmatter ↔ ``PredicationCell``."""

    name = "markdown-frontmatter"
    vocabulary: tuple[str, ...] = ()  # open vocabulary

    def extract(self, data: str, *, subject: str) -> Iterable[PredicationCell]:
        """Parse ``data`` (the full markdown text) and yield cells.

        Cells are emitted in document order: by frontmatter key
        order, then by list-element order within multi-value keys.
        Cell objects are the raw YAML-parsed values (strings, numbers,
        bools). Nested mappings lower to dotted-path predicates via
        :func:`_flatten_pairs`.
        """
        fm, _body = _split(data)
        if fm is None:
            return
        for key, value in fm.items():
            for predicate, obj in _flatten_pairs(str(key), value):
                yield PredicationCell(
                    subject=subject,
                    predicate=predicate,
                    object=obj,
                )

    def create(self, cells: Iterable[PredicationCell],
               *, body: str = "") -> str:
        """Render cells back to a markdown document.

        Cells with the same ``predicate`` collapse to a list value
        (preserving emit order). Dotted-path predicates lift back into
        nested YAML mappings — ``(s, a.b.c, X) = T`` renders as
        ``a: { b: { c: X } }``. Cells with distinct predicate prefixes
        become distinct frontmatter keys.

        Cells whose ``subject`` differs are silently grouped under
        whichever subject appears first — this projector renders
        *one* document at a time. The compound projector handles
        per-file dispatch.

        ``body`` is appended verbatim after the closing ``---``.
        Defaults to empty.
        """
        cells = list(cells)
        if not cells:
            return body
        order: list[str] = []
        groups: dict[str, list[Any]] = {}
        for cell in cells:
            key = str(cell.predicate)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(cell.object)
        fm_dict: dict[str, Any] = {}
        for key in order:
            values = groups[key]
            value = values[0] if len(values) == 1 else values
            _nest(fm_dict, key.split("."), value)
        fm_text = yaml.safe_dump(fm_dict, sort_keys=False,
                                 default_flow_style=False).rstrip()
        out = f"---\n{fm_text}\n---\n"
        if body:
            out = out + body
        return out


def _nest(target: dict, path: list[str], value: Any) -> None:
    """Insert ``value`` at the dotted path inside ``target``.

    The inverse of :func:`_flatten_pairs`: walks the path segment by
    segment, creating intermediate dicts on the way; the final
    segment receives the value.
    """
    cursor = target
    for segment in path[:-1]:
        nxt = cursor.get(segment)
        if not isinstance(nxt, dict):
            nxt = {}
            cursor[segment] = nxt
        cursor = nxt
    cursor[path[-1]] = value


# Module-level instance — the projector itself is stateless.
PROJECTOR = MarkdownFrontmatterProjector()


__all__ = [
    "FrontmatterError",
    "MarkdownFrontmatterProjector",
    "PROJECTOR",
]
