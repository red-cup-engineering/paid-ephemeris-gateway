"""Tests for the engine's dispatch tick (programs/engine/dispatch.py).

The dispatch tick is a pure scheduler: load → read_assignments → spawn.
It reads Assignment subjects from the closed store, diffs against the
previous tick's set, emits ``assignment_birth`` / ``assignment_death``
witnesses, and (with ``spawn=True``) emits one ``program_spawn_requested``
witness per Assignment whose workitem is open. Routing-by-agent-type
sends ``automated-process`` agents to ScriptProgram, ``human`` agents to
a notification witness, and everything else to HarnessProgram.

These tests exercise the tick logic without spawning real children —
the tick records spawn-requests, the EngineProgram is what actually
launches asyncio tasks from those requests.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from pypredcalc.predication import PredicationCell, PredicationStore

from pyfars.kernel.store import System
from pyfars.programs.engine.dispatch import run_tick


def _cell(s: str, p: str, o: str) -> PredicationCell:
    return PredicationCell(subject=s, predicate=p, object=o)


def _system(*cells: PredicationCell, root: Path) -> System:
    store = PredicationStore.empty()
    for c in cells:
        store = store.insert(c)
    return System(root=root, store=store)


def _assignment(slug: str, workitem: str, agent: str):
    return (
        _cell(slug, "type", "assignment"),
        _cell(slug, "workitem", workitem),
        _cell(slug, "agent", agent),
    )


@pytest.mark.anyio
async def test_empty_store_yields_no_witnesses(tmp_path: Path):
    system = _system(root=tmp_path)
    state = await run_tick(system, root=tmp_path, tick=0)
    assert state.witnesses == []
    assert state.assignments == []
    assert state.spawn_requests == []


@pytest.mark.anyio
async def test_new_assignment_emits_birth_witness(tmp_path: Path):
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=1)
    births = [w for w in state.witnesses if w.operator == "assignment_birth"]
    assert len(births) == 1
    assert births[0].target == "assignment/a1"
    assert births[0].channel == "dispatch"
    assert births[0].kind == "observation"
    assert births[0].details["tick"] == 1


@pytest.mark.anyio
async def test_assignment_death_witness_on_removal(tmp_path: Path):
    """A slug present in previous_assignment_slugs but absent from the
    current store produces an ``assignment_death`` witness."""
    system = _system(root=tmp_path)
    state = await run_tick(
        system, root=tmp_path, tick=2,
        previous_assignment_slugs=["a1"],
    )
    deaths = [w for w in state.witnesses if w.operator == "assignment_death"]
    assert len(deaths) == 1
    assert deaths[0].target == "assignment/a1"


@pytest.mark.anyio
async def test_existing_assignment_yields_no_birth(tmp_path: Path):
    """An Assignment present in both previous and current ticks does
    not trigger birth/death witnesses on the second tick."""
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        root=tmp_path,
    )
    state = await run_tick(
        system, root=tmp_path, tick=2,
        previous_assignment_slugs=["a1"],
    )
    assert [w for w in state.witnesses if w.operator == "assignment_birth"] == []
    assert [w for w in state.witnesses if w.operator == "assignment_death"] == []


@pytest.mark.anyio
async def test_spawn_disabled_emits_no_spawn_requests(tmp_path: Path):
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=0, spawn=False)
    assert state.spawn_requests == []


@pytest.mark.anyio
async def test_spawn_request_per_new_assignment(tmp_path: Path):
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=0, spawn=True)
    assert len(state.spawn_requests) == 1
    req = state.spawn_requests[0]
    assert req["assignment"] == "a1"
    assert req["workitem"] == "task-1"
    assert req["agent"] == "alice"
    assert req["kind"] in ("harness", "script", "human")


@pytest.mark.anyio
async def test_settled_workitem_not_dispatched(tmp_path: Path):
    """A workitem cell ``(W, status, settled) = T`` blocks dispatch."""
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        _cell("task-1", "status", "settled"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=0, spawn=True)
    assert state.spawn_requests == []


@pytest.mark.anyio
async def test_open_status_dispatches(tmp_path: Path):
    system = _system(
        *_assignment("a1", "task-1", "alice"),
        _cell("alice", "type", "agent"),
        _cell("task-1", "status", "open"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=0, spawn=True)
    assert len(state.spawn_requests) == 1


@pytest.mark.anyio
async def test_two_new_assignments_each_produce_a_spawn_request(tmp_path: Path):
    system = _system(
        *_assignment("a1", "t1", "alice"),
        *_assignment("a2", "t2", "bob"),
        _cell("alice", "type", "agent"),
        _cell("bob", "type", "agent"),
        root=tmp_path,
    )
    state = await run_tick(system, root=tmp_path, tick=0, spawn=True)
    assert {r["assignment"] for r in state.spawn_requests} == {"a1", "a2"}
