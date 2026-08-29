"""Tests for the kind field on Witness / make_witness — Round 14 / WOAH #5."""
from __future__ import annotations

import pytest

from pyfars.kernel.witness import Witness, make_witness


# -- field & validation --------------------------------------------------


def test_kind_default_is_mutation():
    """Default kind is mutation (conservative-shape default).

    Direct ``Witness(...)`` construction with no ``kind=`` uses the
    field default. ``make_witness`` always sets it via classify, so
    in practice this default only fires for ad-hoc constructions
    (mostly tests and from_dict on a payload missing the field)."""
    w = Witness(operator="custom", target="x",
                before_hash=None, after_hash=None)
    assert w.kind == "mutation"


@pytest.mark.parametrize("kind", [
    "observation", "guard", "accounting", "query",
    "mutation", "analysis", "learning",
])
def test_witness_accepts_each_canonical_kind(kind):
    w = Witness(operator="x", target="t",
                before_hash=None, after_hash=None, kind=kind)
    assert w.kind == kind


def test_witness_rejects_invalid_kind():
    """Typos / drift caught at construction time."""
    # Pydantic's Literal validator catches invalid kind before the
    # custom field_validator fires; its error mentions the seven
    # canonical values explicitly.
    with pytest.raises(ValueError, match="observation"):
        Witness(operator="x", target="t",
                before_hash=None, after_hash=None, kind="Observation")
    with pytest.raises(ValueError, match="observation"):
        Witness(operator="x", target="t",
                before_hash=None, after_hash=None, kind="audit")


# -- make_witness auto-classification ------------------------------------


def test_make_witness_classifies_known_operator():
    """Known operators get their canonical kind without an explicit pass."""
    w = make_witness("commit", "abc", before_hash=None, after_hash="abc")
    assert w.kind == "observation"
    w2 = make_witness("set_fm_field", "x", before_hash=None, after_hash=None)
    assert w2.kind == "mutation"
    w3 = make_witness("dispatch", "x", before_hash=None, after_hash=None,
                      channel="dispatch")
    assert w3.kind == "guard"


def test_make_witness_uses_channel_fallback_for_unknown_operator():
    w = make_witness("future_op", "x", before_hash=None, after_hash=None,
                     channel="learning")
    assert w.kind == "learning"


def test_make_witness_explicit_kind_overrides_classifier():
    """Passing kind= explicitly overrides the registry — escape hatch."""
    w = make_witness("commit", "x", before_hash=None, after_hash=None,
                     kind="learning")
    assert w.kind == "learning"


def test_make_diagnosis_witness_is_learning():
    """Failure-diagnosis helper — implicit via channel='learning'."""
    from pyfars.kernel.witness import make_diagnosis_witness
    w = make_diagnosis_witness("x", cause="oom", failed_operator="fm_set")
    assert w.kind == "learning"


def test_make_lesson_witness_is_learning():
    from pyfars.kernel.witness import make_lesson_witness
    w = make_lesson_witness("retry-on-oom", suggested_action="reduce batch")
    assert w.kind == "learning"


# -- wire form & round-trip ---------------------------------------------


def test_to_dict_always_includes_kind():
    """Wire form always carries kind — audit/cost tooling depends on it."""
    w = make_witness("commit", "x", before_hash=None, after_hash="x")
    d = w.to_dict()
    assert "kind" in d
    assert d["kind"] == "observation"


def test_from_dict_uses_explicit_kind_when_present():
    payload = {
        "operator": "x", "target": "t",
        "before_hash": None, "after_hash": None,
        "kind": "guard",
    }
    w = Witness.from_dict(payload)
    assert w.kind == "guard"


def test_round_trip_preserves_kind():
    w = make_witness("dispatch", "x", before_hash=None, after_hash=None,
                     channel="dispatch")
    w2 = Witness.from_dict(w.to_dict())
    assert w2.kind == w.kind == "guard"
