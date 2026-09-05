from pathlib import Path

from fars.substrate.index.sqlite_cache import is_fresh, read, write
from fars.substrate.flatfile import Flatfile


def _note(slug: str, **fm) -> Flatfile:
    return Flatfile(slug=slug, dir="concepts", kind="concept",
                fm=fm, body="body", path=Path(f"concepts/{slug}.md"), mtime=1.0)


def test_write_then_read_roundtrip(tmp_path: Path):
    notes = [_note("a", title="A"), _note("b", title="B", deps=["x"])]
    n = write(tmp_path, notes)
    assert n == 2
    out = read(tmp_path)
    assert out is not None
    by_slug = {n.slug: n for n in out}
    assert by_slug["a"].fm == {"title": "A"}
    assert by_slug["b"].fm == {"title": "B", "deps": ["x"]}


def test_read_returns_none_when_no_cache(tmp_path: Path):
    assert read(tmp_path) is None


def test_is_fresh_false_when_no_cache(tmp_path: Path):
    assert is_fresh(tmp_path) is False


def test_is_fresh_true_when_cache_matches(tmp_path: Path):
    (tmp_path / "concepts").mkdir()
    md = tmp_path / "concepts" / "foo.md"
    md.write_text("---\nkind: concept\n---\n\nbody\n", encoding="utf-8")
    note = Flatfile(
        slug="foo", dir="concepts", kind="concept",
        fm={"kind": "concept"}, body="\nbody\n",
        path=Path("concepts/foo.md"), mtime=md.stat().st_mtime,
    )
    write(tmp_path, [note])
    assert is_fresh(tmp_path) is True


def test_is_fresh_false_when_disk_changes(tmp_path: Path):
    (tmp_path / "concepts").mkdir()
    md = tmp_path / "concepts" / "foo.md"
    md.write_text("---\nkind: concept\n---\n\nbody\n", encoding="utf-8")
    note = Flatfile(
        slug="foo", dir="concepts", kind="concept",
        fm={"kind": "concept"}, body="\nbody\n",
        path=Path("concepts/foo.md"), mtime=md.stat().st_mtime,
    )
    write(tmp_path, [note])
    # touch the file to bump mtime
    import time
    time.sleep(0.05)
    md.write_text("---\nkind: concept\n---\n\nbody changed\n", encoding="utf-8")
    assert is_fresh(tmp_path) is False
