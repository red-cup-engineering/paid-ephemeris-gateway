"""Smoke tests for every CLI verb against a fixture fars.

Each test invokes the verb's ``main(argv)`` with realistic args and
asserts on the return code. Stdout/stderr are captured and inspected
for known-content substrings — enough to catch import errors,
unhandled exceptions, and gross output regressions, without being
brittle on cosmetic changes.

The shared ``fixture_root`` lives in ``conftest.py``.
"""
from __future__ import annotations

import io
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from typing import Callable


def _run(fn: Callable, argv: list[str]) -> tuple[int, str, str]:
    """Invoke a CLI main, return (exit_code, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    try:
        with redirect_stdout(out), redirect_stderr(err):
            code = fn(argv)
    except SystemExit as e:
        code = int(e.code) if e.code is not None else 0
    return code, out.getvalue(), err.getvalue()


# Read-only verbs: invoke against the fixture, expect exit 0 (or 1 for
# verbs that report problems via exit code), expect non-empty stdout.

def test_validate(fixture_root: Path):
    from fars.cli import validate
    code, out, _ = _run(validate.main, [str(fixture_root)])
    assert code in (0, 1)
    assert "fars validate" in out or "diagnostics" in out.lower()


def test_stats(fixture_root: Path):
    from fars.cli import stats
    code, out, _ = _run(stats.main, ["--root", str(fixture_root)])
    assert code == 0
    assert "Notes" in out


def test_list(fixture_root: Path):
    from fars.cli import list as list_cli
    code, out, _ = _run(list_cli.main, ["--root", str(fixture_root)])
    assert code == 0
    assert "alpha" in out


def test_show(fixture_root: Path):
    from fars.cli import show
    code, out, _ = _run(show.main, ["alpha", "--root", str(fixture_root)])
    assert code == 0
    assert "alpha" in out


def test_search(fixture_root: Path):
    from fars.cli import search
    code, out, _ = _run(search.main, ["alpha", "--root", str(fixture_root)])
    assert code in (0, 1)
    assert "alpha" in out.lower() or "alpha" in out


def test_search_bm25(fixture_root: Path):
    from fars.cli import search
    code, _, _ = _run(search.main, ["alpha", "--bm25", "--root", str(fixture_root)])
    assert code in (0, 1)


def test_context(fixture_root: Path):
    from fars.cli import context
    code, out, _ = _run(context.main, ["beta", "--root", str(fixture_root)])
    assert code == 0
    assert "beta" in out


def test_ramp(fixture_root: Path):
    from fars.cli import ramp
    code, out, _ = _run(ramp.main, ["beta", "--root", str(fixture_root)])
    assert code == 0
    assert "alpha" in out
    assert "beta" in out


def test_impact(fixture_root: Path):
    from fars.cli import impact
    code, out, _ = _run(impact.main, ["alpha", "--root", str(fixture_root)])
    assert code == 0
    assert "descendants" in out.lower()


def test_where(fixture_root: Path):
    from fars.cli import where
    code, _, err = _run(where.main, ["theorem", "--root", str(fixture_root)])
    assert code == 0


def test_fm_keys(fixture_root: Path):
    from fars.cli import fm_keys
    code, out, _ = _run(fm_keys.main, ["--root", str(fixture_root)])
    assert code == 0
    assert "kind" in out


def test_audit(fixture_root: Path):
    from fars.cli import audit
    code, _, _ = _run(audit.main, [str(fixture_root),
                                    "--out", str(fixture_root / "audit.md")])
    assert code == 0


def test_plan(fixture_root: Path):
    from fars.cli import plan
    code, _, _ = _run(plan.main, [str(fixture_root),
                                   "--out", str(fixture_root / "plan.md")])
    assert code == 0


def test_check(fixture_root: Path):
    from fars.cli import check
    target = fixture_root / "concepts" / "alpha.md"
    code, _, _ = _run(check.main, [str(target), "--root", str(fixture_root)])
    assert code in (0, 1)


def test_lint(fixture_root: Path):
    from fars.cli import lint
    code, _, _ = _run(lint.main, ["--root", str(fixture_root)])
    assert code == 0


def test_cite(fixture_root: Path):
    from fars.cli import cite
    code, _, _ = _run(cite.main, [str(fixture_root), "--check"])
    assert code in (0, 1)


def test_help_unknown_verb():
    from fars.cli import help as help_cli
    code, _, err = _run(help_cli.main, ["nonexistent"])
    assert code == 2
    assert "unknown verb" in err.lower()


def test_help_known_verb():
    from fars.cli import help as help_cli
    code, out, _ = _run(help_cli.main, ["validate"])
    assert code == 0
    assert "validate" in out


# Edit verbs: dry-run mode should be safe to invoke and not mutate.

def test_move_dry_run(fixture_root: Path):
    from fars.cli import move
    code, _, _ = _run(move.main, ["alpha", "objects/alpha.md",
                                   "--root", str(fixture_root)])
    # Dry-run by default; should succeed and not move the file.
    assert code == 0
    assert (fixture_root / "concepts" / "alpha.md").exists()


def test_rename_fm_key_dry_run(fixture_root: Path):
    from fars.cli import rename_fm_key
    code, _, _ = _run(rename_fm_key.main,
                      ["title", "headline", "--root", str(fixture_root)])
    assert code == 0
    # Dry-run; the original key should still be there.
    assert (fixture_root / "concepts" / "alpha.md").read_text(encoding="utf-8") \
        .find("title:") >= 0


def test_new_concept(tmp_path: Path):
    from fars.cli import new
    code, _, _ = _run(new.main, ["concept", "widget",
                                  "--root", str(tmp_path), "--stdout"])
    assert code == 0


def test_fm_read(fixture_root: Path):
    from fars.cli import fm
    code, out, _ = _run(fm.main, ["alpha", "--root", str(fixture_root)])
    assert code == 0
    assert "kind" in out


def test_compose_flat(fixture_root: Path):
    from fars.cli import compose
    out_path = fixture_root / "monograph.md"
    code, _, _ = _run(compose.main, [str(fixture_root), "--out", str(out_path)])
    assert code == 0
    assert out_path.exists()


def test_snapshot_fs_mode(fixture_root: Path):
    from fars.cli import snapshot
    code, _, _ = _run(snapshot.main, ["--root", str(fixture_root),
                                       "--no-git", "--label", "t1"])
    assert code == 0
    assert (fixture_root / ".fars" / "snapshots" / "t1").is_dir()


def test_snapshot_list(fixture_root: Path):
    from fars.cli import snapshot
    _run(snapshot.main, ["--root", str(fixture_root), "--no-git", "--label", "t1"])
    code, out, _ = _run(snapshot.main, ["--root", str(fixture_root), "--list"])
    assert code == 0


def test_index_build(fixture_root: Path):
    from fars.cli import index
    code, _, _ = _run(index.main, ["--root", str(fixture_root)])
    assert code == 0
    assert (fixture_root / ".fars" / "cache.sqlite").is_file()
