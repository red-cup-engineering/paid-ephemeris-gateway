"""Tests for the edit operations exposed by ``fars.api``.

Covers ``move``, ``rename_fm_key``, ``snapshot``, ``undo`` against
the shared fixture corpus from ``conftest.py``.
"""
from __future__ import annotations

from pathlib import Path

from fars import api


# --- move -------------------------------------------------------------------

def test_move_dry_run_does_not_touch_filesystem(fixture_root: Path):
    summary = api.move(fixture_root, "alpha", "objects/alpha.md", apply=False)
    assert summary is not None
    assert summary["moved"] is False
    assert (fixture_root / "concepts" / "alpha.md").exists()
    assert not (fixture_root / "objects" / "alpha.md").exists()


def test_move_apply_relocates_and_rewrites(fixture_root: Path):
    summary = api.move(fixture_root, "alpha", "objects/alpha.md", apply=True)
    assert summary is not None
    assert summary["moved"] is True
    assert not (fixture_root / "concepts" / "alpha.md").exists()
    assert (fixture_root / "objects" / "alpha.md").exists()
    # body link in beta.md should now resolve to ../objects/alpha.md
    beta_text = (fixture_root / "concepts" / "beta.md").read_text(encoding="utf-8")
    assert "../objects/alpha.md" in beta_text


def test_move_unknown_slug_returns_none(fixture_root: Path):
    assert api.move(fixture_root, "nonexistent", "objects/x.md") is None


# --- rename_fm_key ----------------------------------------------------------

def test_rename_fm_key_dry_run_counts_affected(fixture_root: Path):
    n = api.rename_fm_key(fixture_root, "title", "headline", apply=False)
    # `title` is in alpha and beta (concept notes)
    assert n >= 2


def test_rename_fm_key_apply_writes_files(fixture_root: Path):
    written = api.rename_fm_key(fixture_root, "title", "headline", apply=True)
    assert written >= 2
    alpha = (fixture_root / "concepts" / "alpha.md").read_text(encoding="utf-8")
    assert "headline:" in alpha
    assert "title:" not in alpha


def test_rename_fm_key_no_op_for_absent_key(fixture_root: Path):
    n = api.rename_fm_key(fixture_root, "nonexistent_key", "x", apply=True)
    assert n == 0


# --- snapshot / undo --------------------------------------------------------

def test_snapshot_fs_mode_saves_files(fixture_root: Path):
    result = api.snapshot(fixture_root, label="t1", use_git=False)
    assert result["mode"] == "fs"
    assert result["label"] == "t1"
    snap = fixture_root / ".fars" / "snapshots" / "t1"
    assert (snap / "concepts" / "alpha.md").is_file()


def test_undo_fs_mode_restores(fixture_root: Path):
    api.snapshot(fixture_root, label="t1", use_git=False)
    alpha = fixture_root / "concepts" / "alpha.md"
    alpha.write_text("changed\n", encoding="utf-8")
    result = api.undo(fixture_root, "t1", use_git=False)
    assert result["ok"]
    assert "Alpha body" in alpha.read_text(encoding="utf-8")


def test_undo_unknown_label_fails(fixture_root: Path):
    result = api.undo(fixture_root, "nonexistent", use_git=False)
    assert result["ok"] is False
