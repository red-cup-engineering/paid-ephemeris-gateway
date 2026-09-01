from pathlib import Path

from fars.substrate.index.by_slug import build as build_by_slug
from fars.substrate.index.depends_on import build as build_depends_on
from fars.substrate.index.dependents import build as build_dependents
from fars.substrate.index.in_edges import build as build_in_edges
from fars.substrate.index.out_edges import build as build_out_edges
from fars.substrate.predication import Predication
from fars.substrate.flatfile import Flatfile


def _note(slug: str, **fm) -> Flatfile:
    return Flatfile(slug=slug, dir="concepts", kind="concept",
                fm=fm, body="", path=Path(f"concepts/{slug}.md"), mtime=0.0)


def test_by_slug_groups_multivalued():
    a = _note("foo")
    b = _note("foo")
    idx = build_by_slug([a, b])
    assert idx == {"foo": [a, b]}


def test_by_slug_single_value():
    a = _note("foo")
    b = _note("bar")
    idx = build_by_slug([a, b])
    assert idx["foo"] == [a]
    assert idx["bar"] == [b]


def _fm_edge(src, dst, kind="depends-on"):
    return Predication(src=src, dst=dst, kind=kind, source="fm")


def test_in_out_edges_partitioning():
    edges = [_fm_edge("a", "b"), _fm_edge("c", "b"), _fm_edge("a", "d")]
    out = build_out_edges(edges)
    in_idx = build_in_edges(edges)
    assert {e.dst for e in out["a"]} == {"b", "d"}
    assert {e.src for e in in_idx["b"]} == {"a", "c"}


def test_depends_on_filters_to_kind():
    edges = [
        _fm_edge("a", "b", "depends-on"),
        _fm_edge("a", "c", "see-also"),
    ]
    deps = build_depends_on(edges)
    assert deps["a"] == ["b"]


def test_dependents_inverts_depends_on():
    edges = [_fm_edge("a", "b"), _fm_edge("c", "b")]
    rev = build_dependents(edges)
    assert sorted(rev["b"]) == ["a", "c"]
