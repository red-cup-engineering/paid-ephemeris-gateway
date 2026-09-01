"""Tests for the FOUR-residuation authorization gate.

``check_authorization(working_fiber, action)`` is the gate every
HarnessProgram tool call passes through. The working-fiber is computed
once per session from polity-authored office cells + personnel
holdings; ``check_authorization`` reads the fiber and the action's
required predicates, runs the FOUR residuation, and returns
``(decision, guard-witness)``. Decision is one of ``admit``, ``deny``,
``contested``, ``unknown``.

These tests build the working fiber from a hand-rolled
PredicationStore — exactly the path HarnessProgram takes at runtime.
"""
from __future__ import annotations

from pypredcalc.predication import PredicationCell, PredicationStore

from pyfars.kernel.operator.auth.check_authorization import (
    Action,
    RequiredPredicate,
    check_authorization,
)
from pyfars.kernel.operator.auth.compute_working_fiber import (
    compute_working_fiber,
)


def _cell(s: str, p: str, o: str) -> PredicationCell:
    return PredicationCell(subject=s, predicate=p, object=o)


def _store(*cells: PredicationCell) -> PredicationStore:
    store = PredicationStore.empty()
    for c in cells:
        store = store.insert(c)
    return store


def _fiber_with_office(*, holder: str, office: str, powers: list[str]):
    cells = [
        _cell(office, "type", "office"),
        _cell(office, "of-polity", "polity:561"),
        _cell(holder, "holds-offices", office),
    ]
    for power in powers:
        cells.append(_cell(office, "powers", power))
    store = _store(*cells)
    return compute_working_fiber(store, agent=holder, office=office)


def test_admit_when_required_power_held():
    fiber = _fiber_with_office(
        holder="alice", office="office:xo",
        powers=["harness.append_witness"],
    )
    action = Action(
        name="harness.append_witness",
        required_predicates=(
            RequiredPredicate(
                kind="power", scope_action="harness.append_witness",
            ),
        ),
    )
    decision, witness = check_authorization(fiber, action)
    assert decision == "admit"
    assert witness.kind == "guard"
    assert witness.channel == "guard"
    assert witness.agent == "alice"
    assert witness.acting_office == "office:xo"


def test_unknown_when_required_power_not_in_fiber():
    """No cell ⇒ fiber returns BOT ⇒ decision is unknown."""
    fiber = _fiber_with_office(
        holder="alice", office="office:xo",
        powers=["harness.read"],  # different action
    )
    action = Action(
        name="harness.append_witness",
        required_predicates=(
            RequiredPredicate(
                kind="power", scope_action="harness.append_witness",
            ),
        ),
    )
    decision, witness = check_authorization(fiber, action)
    assert decision == "unknown"
    assert witness.details["decision"] == "unknown"


def test_empty_requirements_admits():
    """An action with no required predicates is vacuously admissible."""
    fiber = _fiber_with_office(
        holder="alice", office="office:xo", powers=[],
    )
    action = Action(name="noop", required_predicates=())
    decision, _w = check_authorization(fiber, action)
    assert decision == "admit"


def test_witness_carries_action_hash_and_flagged_cells():
    fiber = _fiber_with_office(
        holder="alice", office="office:xo", powers=[],
    )
    action = Action(
        name="harness.x",
        required_predicates=(
            RequiredPredicate(kind="power", scope_action="harness.x"),
        ),
    )
    _decision, witness = check_authorization(fiber, action)
    assert "action_hash" in witness.details
    assert "restriction_result_hash" in witness.details
    flagged = witness.details["flagged_cells"]
    assert flagged
    assert flagged[0][0] == "power"
    assert flagged[0][1] == "harness.x"


def test_working_fiber_scopes_to_office():
    """When ``office`` is passed, only relations sourced from that office
    contribute. A power held in office A does not unlock action B
    when the session's office is B."""
    store = _store(
        _cell("office:a", "type", "office"),
        _cell("office:a", "powers", "do-thing"),
        _cell("office:a", "of-polity", "p"),
        _cell("office:b", "type", "office"),
        _cell("office:b", "of-polity", "p"),
        _cell("alice", "holds-offices", "office:a"),
        _cell("alice", "holds-offices", "office:b"),
    )
    fiber_b = compute_working_fiber(
        store, agent="alice", office="office:b",
    )
    action = Action(
        name="do-thing",
        required_predicates=(
            RequiredPredicate(kind="power", scope_action="do-thing"),
        ),
    )
    decision, _w = check_authorization(fiber_b, action)
    assert decision == "unknown"

    fiber_a = compute_working_fiber(
        store, agent="alice", office="office:a",
    )
    decision_a, _w_a = check_authorization(fiber_a, action)
    assert decision_a == "admit"
