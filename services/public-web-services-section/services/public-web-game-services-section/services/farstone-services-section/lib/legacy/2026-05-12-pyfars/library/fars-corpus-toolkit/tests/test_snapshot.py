from pathlib import Path

from fars.operator.edit.snapshot import list_snapshots, restore, save


def test_fs_save_copies_md_files(tmp_path: Path):
    (tmp_path / "concepts").mkdir()
    (tmp_path / "concepts" / "foo.md").write_text("hello", encoding="utf-8")
    (tmp_path / "concepts" / "bar.md").write_text("world", encoding="utf-8")
    result = save(tmp_path, label="t1", use_git=False)
    assert result["mode"] == "fs"
    assert result["label"] == "t1"
    assert result["n_files"] == 2
    snap_dir = tmp_path / ".fars" / "snapshots" / "t1"
    assert (snap_dir / "concepts" / "foo.md").read_text(encoding="utf-8") == "hello"


def test_fs_restore_overwrites(tmp_path: Path):
    (tmp_path / "concepts").mkdir()
    md = tmp_path / "concepts" / "foo.md"
    md.write_text("original", encoding="utf-8")
    save(tmp_path, label="t1", use_git=False)
    md.write_text("changed", encoding="utf-8")
    result = restore(tmp_path, "t1", use_git=False)
    assert result["ok"]
    assert md.read_text(encoding="utf-8") == "original"


def test_fs_list_snapshots(tmp_path: Path):
    (tmp_path / "concepts").mkdir()
    (tmp_path / "concepts" / "foo.md").write_text("x", encoding="utf-8")
    save(tmp_path, label="a", use_git=False)
    save(tmp_path, label="b", use_git=False)
    snaps = list_snapshots(tmp_path)
    fs_labels = {s["label"] for s in snaps if s["mode"] == "fs"}
    assert {"a", "b"}.issubset(fs_labels)


def test_fs_restore_missing_label(tmp_path: Path):
    result = restore(tmp_path, "nonexistent", use_git=False)
    assert result["ok"] is False
