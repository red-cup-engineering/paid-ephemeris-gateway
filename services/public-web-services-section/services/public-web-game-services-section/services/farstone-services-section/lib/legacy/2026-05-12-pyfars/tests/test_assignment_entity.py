"""Tests for the Assignment entity — the minimal (workitem, agent) pairing.

The Assignment entity carries *only* ``workitem`` and ``agent``;
status state machine, priority, routing provenance, and deadlines
all live in cells around the workitem. These tests verify that:

  - The Pydantic shape rejects field-stuffing.
  - ``load_one`` hydrates an Assignment from cells in a PredicationStore.
"""
from __future__ import annotations

import pytest
from pypredcalc.predication import PredicationCell, PredicationStore

from pyfars.sdk.entities import Assignment, load_one


def _cell(subject: str, predicate: str, obj: str) -> PredicationCell:
    return PredicationCell(subject=subject, predicate=predicate, object=obj)


def _store(*cells: PredicationCell) -> PredicationStore:
    store = PredicationStore.empty()
    for c in cells:
        store = store.insert(c)
    return store


def test_assignment_shape_is_minimal():
    a = Assignment(slug="a1", workitem="task-1", agent="claude")
    assert a.slug == "a1"
    assert a.workitem == "task-1"
    assert a.agent == "claude"


def test_assignment_extra_fields_ignored():
    """Extra fields like status/priority/from-sender drop out — they
    are not part of the Assignment entity. The cells live on the
    workitem, not the Assignment."""
    a = Assignment(
        slug="a1", workitem="task-1", agent="claude",
        status="open", priority=5, **{"from-sender": "captain"},
    )
    dumped = a.model_dump()
    assert set(dumped.keys()) == {"slug", "workitem", "agent"}


def test_assignment_load_from_cells():
    store = _store(
        _cell("a1", "type", "assignment"),
        _cell("a1", "workitem", "task-1"),
        _cell("a1", "agent", "claude"),
    )
    a = load_one(Assignment, store, "a1")
    assert a == Assignment(slug="a1", workitem="task-1", agent="claude")


def test_assignment_load_returns_none_when_no_cells():
    store = PredicationStore.empty()
    assert load_one(Assignment, store, "missing") is None


def test_assignment_load_unaffected_by_workitem_status():
    """An Assignment's identity does not depend on the workitem's
    status cells — those are read by the dispatch tick, not folded
    into the Assignment record."""
    store = _store(
        _cell("a1", "type", "assignment"),
        _cell("a1", "workitem", "task-1"),
        _cell("a1", "agent", "claude"),
        _cell("task-1", "status", "settled"),
        _cell("task-1", "priority", "9"),
    )
    a = load_one(Assignment, store, "a1")
    assert a.workitem == "task-1"
    assert a.agent == "claude"
