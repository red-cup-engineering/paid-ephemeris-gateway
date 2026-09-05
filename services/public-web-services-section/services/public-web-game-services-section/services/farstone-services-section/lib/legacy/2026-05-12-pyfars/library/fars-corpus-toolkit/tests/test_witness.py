"""Tests for fars.operator.witness."""
import json
from pathlib import Path

from fars.operator.witness import (
    Witness, hash_content, hash_path, make_witness, now_iso,
)


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
