from pathlib import Path

import pytest

from fars.closure.lint.compose_lint import run as run_lint
from fars.closure.lint.depends_on_completeness import find as find_deps
from fars.closure.lint.empty_description import find as find_empty_desc
from fars.closure.lint.fm_key_casing import find as find_casing
from fars.closure.lint.trailing_newline import find as find_newline
from fars.substrate.flatfile import Flatfile


def _note(slug: str, body: str = "", **fm) -> Flatfile:
    return Flatfile(slug=slug, dir="concepts", kind="concept",
                fm=fm, body=body, path=Path(f"concepts/{slug}.md"), mtime=0.0)


def test_depends_on_completeness_finds_missing(tmp_path: Path):
    a = _note("a", body="see [b](b.md)", **{"depends-on": []})
    b = _note("b")
    by_slug = {"a": [a], "b": [b]}
    suggestions = find_deps([a, b], by_slug=by_slug, root=tmp_path)
    assert any(s.code == "depends-on-missing-body-cite" for s in suggestions)
    assert any("b" in s.message for s in suggestions)


def test_depends_on_completeness_clean_when_in_deps(tmp_path: Path):
    a = _note("a", body="see [b](b.md)", **{"depends-on": ["b"]})
    b = _note("b")
    by_slug = {"a": [a], "b": [b]}
    suggestions = find_deps([a, b], by_slug=by_slug, root=tmp_path)
    assert suggestions == []


def test_empty_description_flagged(tmp_path: Path):
    a = _note("a", description="")
    suggestions = find_empty_desc([a], root=tmp_path)
    assert len(suggestions) == 1
    assert suggestions[0].code == "empty-description"


def test_empty_description_skipped_when_present(tmp_path: Path):
    a = _note("a", description="real text")
    assert find_empty_desc([a], root=tmp_path) == []


def test_fm_key_casing_flags_uppercase(tmp_path: Path):
    a = _note("a", **{"Date-Created": "2024"})
    suggestions = find_casing([a], root=tmp_path)
    assert any(s.code == "fm-key-casing" for s in suggestions)
