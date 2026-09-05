"""Tests for fars.runtime.dispatch."""
from fars.runtime.dispatch import DispatchTable


def test_register_and_handlers_for():
    dt = DispatchTable()
    f = lambda x: x + 1
    dt.register("inc", f)
    assert dt.handlers_for("inc") == [f]
    assert dt.handlers_for("absent") == []


def test_dispatch_invokes_all_handlers():
    dt = DispatchTable()
    calls = []
    dt.register("p", lambda x: calls.append(("a", x)))
    dt.register("p", lambda x: calls.append(("b", x)))
    dt.dispatch("p", 42)
    assert calls == [("a", 42), ("b", 42)]


def test_dispatch_returns_handler_results():
    dt = DispatchTable()
    dt.register("p", lambda x: x * 2)
    dt.register("p", lambda x: x * 3)
    assert dt.dispatch("p", 5) == [10, 15]


def test_dispatch_no_handler_returns_empty():
    dt = DispatchTable()
    assert dt.dispatch("nope") == []


def test_unregister():
    dt = DispatchTable()
    f = lambda: 1
    g = lambda: 2
    dt.register("p", f)
    dt.register("p", g)
    dt.unregister("p", f)
    assert dt.handlers_for("p") == [g]
    dt.unregister("p", g)
    assert dt.handlers_for("p") == []
    assert "p" not in dt.predicates()


def test_unregister_absent_is_noop():
    dt = DispatchTable()
    dt.unregister("p", lambda: None)  # no exception


def test_predicates():
    dt = DispatchTable()
    dt.register("a", lambda: 1)
    dt.register("b", lambda: 2)
    assert set(dt.predicates()) == {"a", "b"}
