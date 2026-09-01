from fars.substrate.parse.fm_relations import parse


def test_parses_list_relation():
    fm = {"depends-on": ["a", "b"]}
    edges = parse(fm, slug="x")
    assert len(edges) == 2
    assert {e.dst for e in edges} == {"a", "b"}
    assert all(e.src == "x" and e.kind == "depends-on" and e.source == "fm" for e in edges)


def test_parses_scalar_relation():
    fm = {"component-of": "math"}
    edges = parse(fm, slug="algebra")
    assert len(edges) == 1
    assert edges[0].dst == "math"


def test_normalizes_pathy_value():
    fm = {"see-also": ["../foo/bar.md", "baz.md", "qux"]}
    edges = parse(fm, slug="x")
    assert {e.dst for e in edges} == {"bar", "baz", "qux"}


def test_skips_non_string_items():
    fm = {"depends-on": ["a", 42, None, "b"]}
    edges = parse(fm, slug="x")
    assert {e.dst for e in edges} == {"a", "b"}


def test_only_listed_keys_become_edges():
    fm = {"depends-on": ["a"], "title": "Hello", "year": 2020}
    edges = parse(fm, slug="x")
    assert len(edges) == 1
    assert edges[0].kind == "depends-on"
