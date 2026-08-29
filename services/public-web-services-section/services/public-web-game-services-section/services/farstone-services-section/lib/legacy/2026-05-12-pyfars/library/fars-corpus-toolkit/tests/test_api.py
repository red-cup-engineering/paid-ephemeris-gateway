"""Programmatic API tests — verify the public Python entry points work."""
from pathlib import Path

import pytest

from fars import api


@pytest.fixture
def fixture_root(tmp_path: Path) -> Path:
    (tmp_path / "concepts").mkdir()
    (tmp_path / "theorems").mkdir()
    (tmp_path / "concepts" / "foo.md").write_text(
        "---\nkind: concept\ntitle: Foo\n---\n\nFoo prose. See [bar](bar.md).\n",
        encoding="utf-8",
    )
    (tmp_path / "theorems" / "bar.md").write_text(
        "---\nkind: theorem\nstatus: proved\ndepends-on: [foo]\n---\n\nBar.\n\n## Proof\n\n$\\square$\n",
        encoding="utf-8",
    )
    return tmp_path


def test_workspace_helper(fixture_root: Path):
    ws = api.workspace(fixture_root)
    assert {n.slug for n in ws.notes} == {"foo", "bar"}


def test_validate_returns_diagnostics(fixture_root: Path):
    diags = api.validate(fixture_root)
    assert isinstance(diags, list)


def test_search_substring(fixture_root: Path):
    rows = api.search(fixture_root, "Foo")
    assert any(n.slug == "foo" for _, n, _ in rows)


def test_search_bm25(fixture_root: Path):
    rows = api.search(fixture_root, "bar prose proof", bm25=True)
    assert all(len(row) == 2 for row in rows)


def test_show_resolves_slug(fixture_root: Path):
    matches = api.show(fixture_root, "foo")
    assert matches is not None
    note, ins, outs = matches[0]
    assert note.slug == "foo"


def test_show_unknown_returns_none(fixture_root: Path):
    assert api.show(fixture_root, "nonexistent") is None


def test_list_filters_by_kind(fixture_root: Path):
    out = api.list_notes(fixture_root, kind="theorem")
    assert {n.slug for n in out} == {"bar"}


def test_stats_keys(fixture_root: Path):
    s = api.stats(fixture_root)
    assert s["n_notes"] == 2
    assert "by_kind" in s
    assert "edges" in s
    assert "health" in s


def test_impact_unknown_slug_returns_none(fixture_root: Path):
    assert api.impact(fixture_root, "nonexistent") is None


def test_impact_proved_theorem_at_risk(fixture_root: Path):
    out = api.impact(fixture_root, "foo")
    assert out is not None
    assert "bar" in out["proved_theorems"]


def test_ramp_topo_order(fixture_root: Path):
    out = api.ramp(fixture_root, "bar")
    assert out is not None
    slugs = [n.slug for n in out]
    assert slugs.index("foo") < slugs.index("bar")


def test_context_within_budget(fixture_root: Path):
    out = api.context(fixture_root, "bar", depth=1, budget_chars=10_000)
    slugs = {n.slug for n in out}
    assert "bar" in slugs


def test_fm_keys_contains_known_keys(fixture_root: Path):
    rows = api.fm_keys(fixture_root)
    keys = {k for k, _, _, _ in rows}
    assert {"kind", "title", "status", "depends-on"} & keys
