"""Tests for pyfars.kernel.witness."""
import json
from pathlib import Path

from pyfars.kernel.witness import (
    Witness, hash_content, hash_path,
    make_diagnosis_witness, make_lesson_witness, make_witness, now_iso,
)


def test_witness_bilattice_round_trip():
    w = make_witness("dispatch", "msg-1", None, "h",
                     truth=0.7, evidence=0.4)
    d = w.to_dict()
    assert d["truth"] == 0.7
    assert d["evidence"] == 0.4
    w2 = Witness.from_dict(d)
    assert w2.truth == 0.7
    assert w2.evidence == 0.4
    assert w2 == w


def test_make_lesson_witness_evidence_grows_with_count():
    one = make_lesson_witness(pattern="p", suggested_action="a",
                              evidence_count=1)
    nine = make_lesson_witness(pattern="p", suggested_action="a",
                               evidence_count=9)
    # Evidence saturates monotonically toward 1.0.
    assert one.evidence < nine.evidence < 1.0
    assert one.channel == "learning"
    assert one.operator == "lesson"
    assert one.details["pattern"] == "p"


def test_witness_channel_origin_round_trip():
    w = make_witness(
        operator="dispatch",
        target="msg-1",
        before_hash=None,
        after_hash="h",
        channel="dispatch",
        origin="hook:pre-tool-use",
    )
    d = w.to_dict()
    assert d["channel"] == "dispatch"
    assert d["origin"] == "hook:pre-tool-use"
    assert Witness.from_dict(d) == w


def test_witness_omits_none_routing_fields_in_wire_form():
    """Backward-compat: a witness without channel/origin must not
    introduce new keys into the JSON, so old replays diff cleanly."""
    w = make_witness(
        operator="fm_add", target="x.md",
        before_hash=None, after_hash="h",
    )
    d = w.to_dict()
    assert "channel" not in d
    assert "origin" not in d


def test_diagnosis_witness_detail_schema_is_pinned():
    """Contract test: downstream consumers (ledger bindings, learning-
    loop indexers) depend on these exact detail keys. Renames are
    breaking changes — assert the schema explicitly."""
    w = make_diagnosis_witness(
        target="x.md", cause="why", failed_operator="op",
        suggested_response="resp", related={"task": "t1"},
    )
    assert w.operator == "diagnose"
    assert w.channel == "learning"
    assert set(w.details.keys()) == {
        "failed_operator", "diagnosed_cause",
        "suggested_response", "related",
    }


def test_make_diagnosis_witness_records_cause():
    w = make_diagnosis_witness(
        target="task/t1.md",
        cause="precondition unsatisfied: depends-on points at retired note",
        failed_operator="dispatch",
        suggested_response="re-target onto current revision",
    )
    assert w.operator == "diagnose"
    assert w.channel == "learning"
    assert w.details["failed_operator"] == "dispatch"
    assert "precondition" in w.details["diagnosed_cause"]
    assert w.details["suggested_response"]


def test_hash_content_str():
    h = hash_content("hello")
    assert isinstance(h, str)
    assert len(h) == 64  # SHA-256 hex


def test_hash_content_bytes():
    assert hash_content(b"hello") == hash_content("hello")


def test_hash_content_none():
    assert hash_content(None) is None


def test_hash_path(tmp_path):
    p = tmp_path / "x.md"
    p.write_text("content")
    assert hash_path(p) == hash_content("content")


def test_hash_path_missing(tmp_path):
    assert hash_path(tmp_path / "absent.md") is None


def test_now_iso_format():
    s = now_iso()
    # ISO-8601 UTC, ends with Z
    assert s.endswith("Z")
    assert "T" in s


def test_witness_round_trip():
    w = make_witness(
        operator="fm_add",
        target=Path("notes/foo.md"),
        before_hash="a" * 64,
        after_hash="b" * 64,
        details={"key": "depends-on", "value": "bar"},
        agent="claude-code",
    )
    d = w.to_dict()
    w2 = Witness.from_dict(d)
    assert w2 == w


def test_witness_json_round_trip():
    w = make_witness(
        operator="fm_rm",
        target="notes/foo.md",
        before_hash="x" * 64,
        after_hash=None,
        details={"key": "see-also", "value": "removed"},
    )
    js = w.to_json()
    parsed = json.loads(js)
    w2 = Witness.from_dict(parsed)
    assert w2 == w


def test_witness_default_details_empty():
    w = make_witness("noop", "x", None, None)
    assert dict(w.details) == {}


def test_witness_target_normalizes_to_str():
    w = make_witness("op", Path("a/b.md"), None, None)
    assert isinstance(w.target, str)
    assert "b.md" in w.target
