from pathlib import Path

import pytest

from fars.substrate.store import Substrate


@pytest.fixture
def fixture_root(tmp_path: Path) -> Path:
    (tmp_path / "concepts").mkdir()
    (tmp_path / "theorems").mkdir()
    (tmp_path / "concepts" / "foo.md").write_text(
        "---\nkind: concept\ntitle: Foo\n---\n\nFoo body.\n",
        encoding="utf-8",
    )
    (tmp_path / "theorems" / "bar.md").write_text(
        "---\nkind: theorem\nstatus: proved\ndepends-on: [foo]\n---\n\nBar body.\n",
        encoding="utf-8",
    )
    return tmp_path


def test_workspace_lazy_load(fixture_root: Path):
    ws = Substrate(root=fixture_root)
    # Notes property triggers load.
    assert {n.slug for n in ws.notes} == {"foo", "bar"}


def test_workspace_caches_indexes(fixture_root: Path):
    ws = Substrate(root=fixture_root)
    a = ws.by_slug
    b = ws.by_slug
    assert a is b  # cached_property returns same object


def test_workspace_indexes_consistent(fixture_root: Path):
    ws = Substrate(root=fixture_root)
    assert "foo" in ws.by_slug
    assert "bar" in ws.by_slug
    assert ws.by_kind["theorem"][0].slug == "bar"
    assert any(e.kind == "depends-on" for e in ws.edges)
    assert ws.depends_on.get("bar") == ["foo"]
    assert "bar" in ws.dependents.get("foo", [])


def test_workspace_known_slugs(fixture_root: Path):
    ws = Substrate(root=fixture_root)
    assert ws.known_slugs == {"foo", "bar"}


def test_workspace_parse_diagnostics_empty_for_clean_corpus(fixture_root: Path):
    ws = Substrate(root=fixture_root)
    _ = ws.notes
    assert ws.parse_diagnostics == []
