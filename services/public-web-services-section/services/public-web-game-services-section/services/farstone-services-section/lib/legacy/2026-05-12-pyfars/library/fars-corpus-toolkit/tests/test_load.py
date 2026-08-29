from pathlib import Path

import pytest

from fars.substrate.load.notes import load


@pytest.fixture
def fixture_corpus(tmp_path: Path) -> Path:
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
    (tmp_path / "concepts" / "no_fm.md").write_text("just prose, no frontmatter\n",
                                                    encoding="utf-8")
    return tmp_path


def test_load_finds_notes_with_frontmatter(fixture_corpus):
    notes, diags = load(fixture_corpus)
    slugs = {n.slug for n in notes}
    assert "foo" in slugs
    assert "bar" in slugs
    assert "no_fm" not in slugs
    assert diags == []


def test_load_returns_kinds_from_fm(fixture_corpus):
    notes, _ = load(fixture_corpus)
    by = {n.slug: n for n in notes}
    assert by["foo"].kind == "concept"
    assert by["bar"].kind == "theorem"


def test_load_emits_diagnostic_on_yaml_error(tmp_path: Path):
    (tmp_path / "broken.md").write_text(
        '---\ntitle: "unclosed\nkind: concept\n---\nbody\n',
        encoding="utf-8",
    )
    notes, diags = load(tmp_path)
    assert notes == []
    assert any(d.code == "frontmatter-parse" for d in diags)


def test_load_skips_readme(tmp_path: Path):
    (tmp_path / "README.md").write_text(
        "---\nkind: doc\n---\n\ntext\n", encoding="utf-8",
    )
    notes, _ = load(tmp_path)
    assert notes == []
