"""Tests for the witness-emitting operator wrappers.

Covers fars.operator.{insertion,retraction,relocation} — the
high-level operators that wrap the pure edit/* primitives with
substrate I/O and witness emission.
"""
import pytest

from fars.operator.insertion import insert_fm_item, insert_flatfile, set_fm_field
from fars.operator.relocation import (
    move_flatfile, rename_fm_key, rewrite_body_link,
)
from fars.operator.retraction import (
    delete_flatfile, remove_fm_item, remove_fm_key,
)
from fars.substrate.parse.frontmatter import parse as parse_fm


def _make_note(tmp_path, name="n.md", fm_text="kind: theorem\ndepends-on:\n- alpha\n", body="\n\n# N\n\nbody.\n"):
    p = tmp_path / name
    p.write_text(f"---\n{fm_text}---{body}", encoding="utf-8")
    return p


# ---------- insertion ----------

def test_insert_fm_item_appends(tmp_path):
    p = _make_note(tmp_path)
    w = insert_fm_item(p, "depends-on", "beta", agent="claude-code")
    assert w.operator == "insert_fm_item"
    assert w.agent == "claude-code"
    assert w.before_hash != w.after_hash
    fm, _ = parse_fm(p.read_text(encoding="utf-8"))
    assert fm["depends-on"] == ["alpha", "beta"]


def test_insert_fm_item_idempotent(tmp_path):
    p = _make_note(tmp_path)
    w1 = insert_fm_item(p, "depends-on", "alpha")  # already present
    assert w1.before_hash == w1.after_hash


def test_set_fm_field(tmp_path):
    p = _make_note(tmp_path)
    w = set_fm_field(p, "status", "proved", agent="claude-code")
    assert w.operator == "set_fm_field"
    fm, _ = parse_fm(p.read_text(encoding="utf-8"))
    assert fm["status"] == "proved"
    assert w.details == {"key": "status", "value": "proved"}


def test_insert_flatfile_creates_new(tmp_path):
    new_path = tmp_path / "new.md"
    w = insert_flatfile(new_path, {"kind": "concept", "title": "X"}, "# X\n\nbody.\n")
    assert w.operator == "insert_flatfile"
    assert w.before_hash is None
    assert w.after_hash is not None
    assert new_path.exists()
    fm, body = parse_fm(new_path.read_text(encoding="utf-8"))
    assert fm["kind"] == "concept"
    assert "# X" in body


def test_insert_flatfile_refuses_existing(tmp_path):
    p = _make_note(tmp_path)
    with pytest.raises(FileExistsError):
        insert_flatfile(p, {}, "")


# ---------- retraction ----------

def test_remove_fm_item_drops_value(tmp_path):
    p = _make_note(tmp_path)
    w = remove_fm_item(p, "depends-on", "alpha")
    assert w.operator == "remove_fm_item"
    fm, _ = parse_fm(p.read_text(encoding="utf-8"))
    # remove on a 1-list: list emptied; fm_rm removes the key when list empties
    assert fm.get("depends-on") in (None, [])


def test_remove_fm_key(tmp_path):
    p = _make_note(tmp_path)
    w = remove_fm_key(p, "depends-on")
    assert w.operator == "remove_fm_key"
    fm, _ = parse_fm(p.read_text(encoding="utf-8"))
    assert "depends-on" not in fm


def test_delete_flatfile(tmp_path):
    p = _make_note(tmp_path)
    w = delete_flatfile(p, agent="ci")
    assert w.operator == "delete_flatfile"
    assert w.before_hash is not None
    assert w.after_hash is None
    assert not p.exists()
    assert w.agent == "ci"


# ---------- relocation ----------

def test_move_flatfile(tmp_path):
    p = _make_note(tmp_path, "old.md")
    new = tmp_path / "subdir" / "new.md"
    w = move_flatfile(p, new)
    assert w.operator == "move_flatfile"
    assert not p.exists()
    assert new.exists()
    assert w.details["from"].endswith("old.md")
    assert w.details["to"].endswith("new.md")


def test_move_flatfile_refuses_missing(tmp_path):
    with pytest.raises(FileNotFoundError):
        move_flatfile(tmp_path / "absent.md", tmp_path / "x.md")


def test_move_flatfile_refuses_overwrite(tmp_path):
    p1 = _make_note(tmp_path, "a.md")
    p2 = _make_note(tmp_path, "b.md")
    with pytest.raises(FileExistsError):
        move_flatfile(p1, p2)


def test_rename_fm_key(tmp_path):
    p = _make_note(tmp_path)
    w = rename_fm_key(p, "depends-on", "depends_on")
    assert w.operator == "rename_fm_key"
    fm, _ = parse_fm(p.read_text(encoding="utf-8"))
    assert "depends_on" in fm
    assert "depends-on" not in fm


def test_rewrite_body_link(tmp_path):
    p = tmp_path / "n.md"
    p.write_text("---\nkind: x\n---\n\nSee [foo](old.md) here.\n", encoding="utf-8")
    w = rewrite_body_link(p, "old.md", "new.md")
    assert w.operator == "rewrite_body_link"
    assert "[foo](new.md)" in p.read_text(encoding="utf-8")
    assert w.details["count"] >= 1
