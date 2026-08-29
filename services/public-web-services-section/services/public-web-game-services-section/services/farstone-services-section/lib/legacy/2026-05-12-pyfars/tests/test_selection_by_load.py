"""Tests for the selection-by-load closure rule.

Among agents A for which W is T-eligible-by-capabilities, the agent
currently named in the fewest ``(_, agent, A) = T`` assignment cells
wins (lex tiebreak on slug). The rule emits a ``StoreRule`` per
workitem; antecedents reference the eligibility cell, consequents
write a fresh ``consequent-predicate`` cell.

These tests verify:
  - the rule honors AGENT_TYPES (which is just ``{"agent"}`` now)
  - load is counted by ``(_, agent, A) = T`` cells
  - lex tiebreak when load is equal
  - no rule emitted when there are no eligible candidates
"""
from __future__ import annotations

from pypredcalc.predication import PredicationCell, PredicationStore

from pyfars.kernel.closure import (
    AGENT_TYPES,
    WORKITEM_TYPES,
    instantiate_selection_by_load,
)


def _cell(s: str, p: str, o: str) -> PredicationCell:
    return PredicationCell(subject=s, predicate=p, object=o)


def _store(*cells: PredicationCell) -> PredicationStore:
    store = PredicationStore.empty()
    for c in cells:
        store = store.insert(c)
    return store


def test_constants():
    assert AGENT_TYPES == frozenset({"agent"})
    assert WORKITEM_TYPES == frozenset({"task", "workitem"})


def test_single_eligible_agent_selected():
    store = _store(
        _cell("task-1", "type", "task"),
        _cell("task-1", "requires-capabilities", "review"),
        _cell("alice", "type", "agent"),
        _cell("alice", "provides-capabilities", "review"),
    )
    rules = instantiate_selection_by_load(
        store, {"consequent-predicate": "selected-agent"},
    )
    assert len(rules) == 1
    rule = rules[0]
    assert rule.consequents == (
        (("task-1", "selected-agent", "alice"),
         rule.consequents[0][1]),
    )


def test_lex_tiebreak_when_load_equal():
    store = _store(
        _cell("task-1", "type", "task"),
        _cell("task-1", "requires-capabilities", "review"),
        _cell("alice", "type", "agent"),
        _cell("alice", "provides-capabilities", "review"),
        _cell("bob", "type", "agent"),
        _cell("bob", "provides-capabilities", "review"),
    )
    rules = instantiate_selection_by_load(
        store, {"consequent-predicate": "selected-agent"},
    )
    assert len(rules) == 1
    chosen = rules[0].consequents[0][0][2]
    assert chosen == "alice"  # lex tiebreak


def test_higher_loaded_agent_passed_over():
    """alice has one existing assignment cell; bob has none.
    Bob wins despite alex losing the lex tiebreak."""
    store = _store(
        _cell("task-2", "type", "task"),
        _cell("task-2", "requires-capabilities", "review"),
        _cell("alice", "type", "agent"),
        _cell("alice", "provides-capabilities", "review"),
        _cell("bob", "type", "agent"),
        _cell("bob", "provides-capabilities", "review"),
        # Existing assignment loading alice
        _cell("existing-a", "type", "assignment"),
        _cell("existing-a", "agent", "alice"),
        _cell("existing-a", "workitem", "task-other"),
    )
    rules = instantiate_selection_by_load(
        store, {"consequent-predicate": "selected-agent"},
    )
    assert len(rules) == 1
    chosen = rules[0].consequents[0][0][2]
    assert chosen == "bob"


def test_no_eligible_agent_yields_no_rule():
    store = _store(
        _cell("task-x", "type", "task"),
        _cell("task-x", "requires-capabilities", "nuclear"),
        _cell("alice", "type", "agent"),
        _cell("alice", "provides-capabilities", "review"),
    )
    rules = instantiate_selection_by_load(
        store, {"consequent-predicate": "selected-agent"},
    )
    assert rules == []


def test_no_workitems_yields_no_rules():
    store = _store(
        _cell("alice", "type", "agent"),
        _cell("alice", "provides-capabilities", "review"),
    )
    rules = instantiate_selection_by_load(
        store, {"consequent-predicate": "selected-agent"},
    )
    assert rules == []
