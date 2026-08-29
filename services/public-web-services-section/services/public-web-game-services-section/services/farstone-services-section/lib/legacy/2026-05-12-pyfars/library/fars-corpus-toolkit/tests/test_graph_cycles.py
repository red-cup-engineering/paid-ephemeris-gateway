from fars.operator.traversal.cycles import detect


def test_no_cycles_in_dag():
    deps = {"a": ["b"], "b": ["c"], "c": []}
    assert detect(deps) == []


def test_self_loop_detected():
    deps = {"a": ["a"]}
    cycles = detect(deps)
    assert cycles == [["a"]]


def test_two_node_cycle_detected():
    deps = {"a": ["b"], "b": ["a"]}
    cycles = detect(deps)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"a", "b"}


def test_three_node_cycle():
    deps = {"a": ["b"], "b": ["c"], "c": ["a"]}
    cycles = detect(deps)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"a", "b", "c"}


def test_cycle_plus_dag():
    deps = {"a": ["b"], "b": ["a"], "c": ["d"], "d": []}
    cycles = detect(deps)
    assert len(cycles) == 1
    assert set(cycles[0]) == {"a", "b"}
