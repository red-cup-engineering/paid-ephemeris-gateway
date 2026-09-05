from fars.operator.traversal.topo_sort import sort


def test_simple_chain_ordered():
    items = ["c", "a", "b"]
    deps = {"c": ["b"], "b": ["a"], "a": []}
    order = sort(items, deps)
    assert order.index("a") < order.index("b") < order.index("c")


def test_independent_items_alphabetical():
    items = ["c", "a", "b"]
    deps = {"a": [], "b": [], "c": []}
    order = sort(items, deps)
    assert order == ["a", "b", "c"]


def test_just_in_time_ordering():
    # `prim` is only used by `theorem`; should appear right before `theorem`.
    items = ["intro", "prim", "theorem", "preface"]
    deps = {"intro": [], "prim": [], "theorem": ["prim"], "preface": []}
    order = sort(items, deps)
    assert order.index("prim") + 1 == order.index("theorem")
