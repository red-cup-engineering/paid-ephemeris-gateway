from pathlib import Path

from fars.analyze.bm25_search import find
from fars.substrate.flatfile import Flatfile


def _note(slug: str, body: str = "", **fm) -> Flatfile:
    return Flatfile(slug=slug, dir="concepts", kind="concept",
                fm=fm, body=body, path=Path(f"concepts/{slug}.md"), mtime=0.0)


def test_bm25_ranks_title_above_body():
    a = _note("a", title="bilattice algebra", body="random other prose")
    b = _note("b", title="something else", body="this mentions bilattice once")
    rows = find([a, b], "bilattice")
    assert rows[0][1].slug == "a"


def test_bm25_kind_filter():
    a = _note("a", title="bilattice")
    b = Flatfile(slug="b", dir="theorems", kind="theorem",
             fm={"title": "bilattice"}, body="", path=Path("theorems/b.md"),
             mtime=0.0)
    rows = find([a, b], "bilattice", kind="theorem")
    assert {n.slug for _, n in rows} == {"b"}


def test_bm25_no_match_returns_empty():
    a = _note("a", title="something")
    rows = find([a], "nonexistent")
    assert rows == []


def test_bm25_empty_query_returns_empty():
    a = _note("a", title="bilattice")
    rows = find([a], "")
    assert rows == []
