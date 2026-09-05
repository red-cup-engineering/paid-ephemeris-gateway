"""Operation-kind taxonomy for witnesses.

Every witness carries one of seven kinds: ``observation``, ``guard``,
``accounting``, ``query``, ``mutation``, ``analysis``, ``learning``.

The classifier resolves operator → kind via a two-tier registry:

  1. The active registry (``OPERATOR_KIND`` / ``CHANNEL_KIND``) —
     starts as a copy of the floor pyfars ships, extended by substrate
     records at engine boot via :func:`discover_active_operator_kinds`
     and :func:`register_operator_kinds`.
  2. Channel fallback when the operator isn't classified.
  3. ``mutation`` as the conservative default when neither matches.

The substrate authoring path: a polity that wants to register a new
operator-classification authors a record like::

    kind: operator-classification
    operator: my_custom_op
    kind: analysis

The engine discovers these at boot and merges them into the active
registry. No code change needed to teach pyfars about polity-specific
operators.
"""
from __future__ import annotations

from collections.abc import Mapping
from typing import Literal


OperationKind = Literal[
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
]


OPERATION_KINDS: tuple[OperationKind, ...] = (
    "observation",
    "guard",
    "accounting",
    "query",
    "mutation",
    "analysis",
    "learning",
)


# Floor — the minimum classifications pyfars ships. Polities extend the
# active registries via discover_active_operator_kinds + register.
FLOOR_OPERATOR_KIND: dict[str, OperationKind] = {
    "commit": "observation",
    "tick": "observation",
    "session": "observation",
    "dispatch": "guard",
    "command_ship": "mutation",
    "fm_add": "mutation",
    "fm_rm": "mutation",
    "fm_set": "mutation",
    "insert_fm_item": "mutation",
    "remove_fm_item": "mutation",
    "insertion": "mutation",
    "retraction": "mutation",
    "relocation": "mutation",
    "move_flatfile": "mutation",
    "rename_fm_key": "mutation",
    "rewrite_body_link": "mutation",
    "rewrite_fm_slug": "mutation",
    "diagnose": "learning",
    "lesson": "learning",
}


FLOOR_CHANNEL_KIND: dict[str, OperationKind] = {
    "learning": "learning",
    "heartbeat": "observation",
    "session": "observation",
    "substrate": "mutation",
    "command": "mutation",
    "dispatch": "guard",
    "governance": "guard",
    "ledger": "accounting",
    "audit": "analysis",
}


# Active registries — start equal to the floor; extended at engine boot.
OPERATOR_KIND: dict[str, OperationKind] = dict(FLOOR_OPERATOR_KIND)
CHANNEL_KIND: dict[str, OperationKind] = dict(FLOOR_CHANNEL_KIND)


def classify(operator: str, channel: str | None = None) -> OperationKind:
    if operator in OPERATOR_KIND:
        return OPERATOR_KIND[operator]
    if channel and channel in CHANNEL_KIND:
        return CHANNEL_KIND[channel]
    return "mutation"


def is_valid_kind(value: str) -> bool:
    return value in OPERATION_KINDS


def register_operator_kinds(
    *,
    operator_kinds: Mapping[str, OperationKind] | None = None,
    channel_kinds: Mapping[str, OperationKind] | None = None,
) -> None:
    """Extend the active registries with discovered substrate classifications.

    Engines call this at boot after :func:`discover_active_operator_kinds`.
    Tests can reset to the floor via :func:`reset_operator_kinds`.
    """
    if operator_kinds:
        OPERATOR_KIND.update(operator_kinds)
    if channel_kinds:
        CHANNEL_KIND.update(channel_kinds)


def reset_operator_kinds() -> None:
    """Reset both active registries to the floor."""
    OPERATOR_KIND.clear()
    OPERATOR_KIND.update(FLOOR_OPERATOR_KIND)
    CHANNEL_KIND.clear()
    CHANNEL_KIND.update(FLOOR_CHANNEL_KIND)


def discover_active_operator_kinds(
    store,
) -> tuple[dict[str, OperationKind], dict[str, OperationKind]]:
    """Walk ``kind: operator-classification`` records, return ``(ops, channels)``.

    Each record may carry ``operator: <name>`` and/or ``channel: <name>``
    and SHALL carry ``classifies-as: <kind>`` (one of the seven). Records
    whose classification is unrecognized are skipped. The ``classifies-as``
    predicate avoids clashing with the record's own ``kind: operator-
    classification`` cell.
    """
    from pyfars.kernel import query

    op_map: dict[str, OperationKind] = {}
    ch_map: dict[str, OperationKind] = {}
    for slug in query.subjects_of_type(store, ("operator-classification",)):
        slug_s = str(slug)
        kind_objs = list(query.objects_under(store, slug_s, ("classifies-as",)))
        if not kind_objs:
            continue
        kind = str(next(iter(kind_objs)))
        if not is_valid_kind(kind):
            continue
        for op in query.objects_under(store, slug_s, ("operator",)):
            op_map[str(op)] = kind  # type: ignore[assignment]
        for ch in query.objects_under(store, slug_s, ("channel",)):
            ch_map[str(ch)] = kind  # type: ignore[assignment]
    return op_map, ch_map


__all__ = [
    "CHANNEL_KIND",
    "FLOOR_CHANNEL_KIND",
    "FLOOR_OPERATOR_KIND",
    "OPERATION_KINDS",
    "OPERATOR_KIND",
    "OperationKind",
    "classify",
    "discover_active_operator_kinds",
    "is_valid_kind",
    "register_operator_kinds",
    "reset_operator_kinds",
]
