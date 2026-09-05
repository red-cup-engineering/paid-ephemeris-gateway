"""Shared pytest fixtures for the corpus test suite.

``fixture_root`` builds a small but realistic corpus under ``tmp_path``
and returns the path. Tests across ``test_load``, ``test_workspace``,
``test_api``, ``test_cli_smoke``, and ``test_lint`` consume it instead
of each rebuilding the same scaffold.
"""
from __future__ import annotations

from pathlib import Path

import pytest


def _build(tmp_path: Path) -> Path:
    (tmp_path / "concepts").mkdir()
    (tmp_path / "theorems").mkdir()
    (tmp_path / "examples").mkdir()
    (tmp_path / "questions").mkdir()
    (tmp_path / "concepts" / "alpha.md").write_text(
        "---\nkind: concept\ntitle: Alpha\n---\n\nAlpha body.\n",
        encoding="utf-8",
    )
    (tmp_path / "concepts" / "beta.md").write_text(
        "---\nkind: concept\ntitle: Beta\ndepends-on: [alpha]\n---\n\n"
        "Beta cites [alpha](alpha.md).\n",
        encoding="utf-8",
    )
    (tmp_path / "theorems" / "alpha-property.md").write_text(
        "---\nkind: theorem\nstatus: proved\ndepends-on: [alpha]\n---\n\n"
        "Theorem about alpha.\n\n## Proof\n\n$\\square$\n",
        encoding="utf-8",
    )
    (tmp_path / "examples" / "alpha-example.md").write_text(
        "---\nkind: example\ninstantiates: [alpha]\n---\n\nAn example.\n",
        encoding="utf-8",
    )
    (tmp_path / "questions" / "open-question.md").write_text(
        "---\nkind: question\nstatus: open\nexplores: [alpha]\n---\n\nQ?\n",
        encoding="utf-8",
    )
    return tmp_path


@pytest.fixture
def fixture_root(tmp_path: Path) -> Path:
    """Small corpus with one concept depended on by a proved theorem,
    an example instantiating it, and an open question exploring it.
    """
    return _build(tmp_path)
