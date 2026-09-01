"""Tests for pyfars.kernel.operator.kind — the seven operation-kinds typology
and the operator → kind classifier.

Round 14 / WOAH #5. The classifier is load-bearing: every witness
in the FARS codebase derives its ``kind`` field through it, and the
event-log filter (``read_all(kind=...)``) routes on the result.
A misclassified operator silently understates kind-aware audit and
cost coverage, so the registry is exhaustively pinned down here:
every operator the FARS codebase actually emits has a test that
asserts its kind.
"""
from __future__ import annotations

import pytest

from pyfars.kernel.operator.kind import (
    CHANNEL_KIND,
    OPERATION_KINDS,
    OPERATOR_KIND,
    classify,
    is_valid_kind,
)


# -- the typology --------------------------------------------------------


def test_seven_kinds_present():
    """The seven canonical kinds match operation-kinds-completeness."""
    assert OPERATION_KINDS == (
        "observation", "guard", "accounting", "query",
        "mutation", "analysis", "learning",
    )


def test_canonical_order_is_stable_and_deduped():
    """Iteration order is fixed (consumers rely on it for display)."""
    assert len(OPERATION_KINDS) == 7
    assert len(set(OPERATION_KINDS)) == 7


@pytest.mark.parametrize("kind", OPERATION_KINDS)
def test_is_valid_kind_accepts_each_canonical(kind):
    assert is_valid_kind(kind) is True


@pytest.mark.parametrize("bogus", [
    "Observation", "MUTATION", "obs", "", "fork", "audit", None, 0,
])
def test_is_valid_kind_rejects_drift(bogus):
    """Typos and casing variants are rejected — typology is exact."""
    assert is_valid_kind(bogus) is False


# -- registry coverage: every emitted operator has a kind ----------------


# This list mirrors the operator inventory done at the top of Round 14.
# If a future PR adds a new operator emission site, add an entry here
# AND in OPERATOR_KIND, or the corresponding witness will silently
# default to "mutation" via the conservative fallback.
EMITTED_OPERATORS = [
    # observation
    ("commit", "observation"),
    ("tick", "observation"),
    ("session", "observation"),
    # guard
    ("dispatch", "guard"),
    # mutation — substrate operators (operator/insertion|relocation|retraction)
    ("set_fm_field", "mutation"),
    ("insert_fm_item", "mutation"),
    ("insert_flatfile", "mutation"),
    ("remove_fm_item", "mutation"),
    ("remove_fm_key", "mutation"),
    ("delete_flatfile", "mutation"),
    ("move_flatfile", "mutation"),
    ("rename_fm_key", "mutation"),
    ("rewrite_body_link", "mutation"),
    # mutation — runtime emission sites
    ("command_ship", "mutation"),
    ("receive_message", "mutation"),
    # mutation — ledger-binding operator names (used by ledger DEFAULT_BINDINGS
    # and as runtime labels in some sites)
    ("fm_add", "mutation"),
    ("fm_set", "mutation"),
    ("fm_remove", "mutation"),
    ("insertion", "mutation"),
    ("retraction", "mutation"),
    ("relocation", "mutation"),
    # learning
    ("diagnose", "learning"),
    ("lesson", "learning"),
]


@pytest.mark.parametrize("operator,expected_kind", EMITTED_OPERATORS)
def test_every_emitted_operator_classifies_correctly(operator, expected_kind):
    assert classify(operator) == expected_kind, (
        f"operator {operator!r} expected kind {expected_kind!r}, "
        f"got {classify(operator)!r}"
    )


def test_registry_does_not_promise_kinds_outside_typology():
    """Every value in OPERATOR_KIND is a canonical kind."""
    for op, k in OPERATOR_KIND.items():
        assert is_valid_kind(k), f"OPERATOR_KIND[{op!r}] = {k!r} not canonical"


def test_channel_kind_does_not_promise_kinds_outside_typology():
    for ch, k in CHANNEL_KIND.items():
        assert is_valid_kind(k), f"CHANNEL_KIND[{ch!r}] = {k!r} not canonical"


# -- channel fallback ----------------------------------------------------


def test_unknown_operator_classifies_via_channel_when_known():
    """A future learning-channel operator inherits learning from the channel."""
    assert classify("future_self_modify_op", channel="learning") == "learning"
    assert classify("custom_heartbeat", channel="heartbeat") == "observation"
    assert classify("policy_check", channel="governance") == "guard"
    assert classify("ledger_post", channel="ledger") == "accounting"


def test_unknown_operator_with_unknown_channel_defaults_to_mutation():
    """The conservative-default discipline: unknown → mutation, never silent.

    Mutation has the strictest audit shape (before-hash, after-hash,
    witness emission), so a wrong "mutation" tag fails an audit loud
    rather than understating cost as a wrong "query" tag would."""
    assert classify("brand_new_op") == "mutation"
    assert classify("brand_new_op", channel="brand_new_channel") == "mutation"


def test_registered_operator_wins_over_channel():
    """Operator registry takes precedence over channel fallback.

    A ``commit`` operator on a non-observation channel is still an
    observation — the operator name carries the canonical kind, the
    channel only adds context."""
    assert classify("commit", channel="learning") == "observation"
    assert classify("dispatch", channel="heartbeat") == "guard"


def test_no_channel_no_operator_match_defaults_to_mutation():
    assert classify("xyzzy") == "mutation"
    assert classify("xyzzy", channel=None) == "mutation"


# -- internal consistency ------------------------------------------------


def test_no_operator_collisions_in_inventory():
    """The EMITTED_OPERATORS test list has no duplicate keys.

    A duplicate would mean two parametrize cases asserting different
    expected kinds for the same operator — that should error here
    rather than silently letting the last one win."""
    seen: dict[str, str] = {}
    for op, k in EMITTED_OPERATORS:
        assert op not in seen, f"duplicate {op!r} in EMITTED_OPERATORS"
        seen[op] = k
