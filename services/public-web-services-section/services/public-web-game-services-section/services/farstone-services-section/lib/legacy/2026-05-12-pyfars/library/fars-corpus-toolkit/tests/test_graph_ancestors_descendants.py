from fars.operator.traversal.ancestors import ancestors
from fars.operator.traversal.descendants import descendants


def test_ancestors_walk_outward():
    deps = {"c": ["b"], "b": ["a"], "a": []}
    assert ancestors("c", deps) == {"a", "b"}


def test_ancestors_does_not_include_self():
    deps = {"a": ["b"], "b": []}
    assert "a" not in ancestors("a", deps)


def test_descendants_walk_via_dependents():
    revdeps = {"a": ["b"], "b": ["c"]}
    assert descendants("a", revdeps) == {"b", "c"}


def test_cycle_safe():
    deps = {"a": ["b"], "b": ["a"]}
    # Should terminate, not loop forever.
    out = ancestors("a", deps)
    assert "b" in out
