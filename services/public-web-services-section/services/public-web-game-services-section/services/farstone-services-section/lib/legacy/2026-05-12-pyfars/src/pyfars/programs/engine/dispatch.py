"""One dispatch tick as a LangGraph: load → read assignments → spawn.

The polity-authored closure rules in the system produce Assignment
records — one ``type: assignment`` subject per chosen ``(workitem,
agent)`` pairing. PyFARS does not implement selection logic in
Python; the polity's closure rules in the system do. This module is
the scheduler: detect assignment births, spawn the right program-
frame class per assignment, witness the spawn.

Routing by agent kind:

  - ``Agent.type == "automated-process"`` → spawn :class:`ScriptProgram`
  - any LLM-driven agent (``ai-model`` / ``hybrid`` / unset) →
    spawn :class:`HarnessProgram`
  - ``Agent.type == "human"`` → emit a ``human_assignment`` witness
    (no spawn — humans are notified, not invoked)

The dispatch tick never calls ``pydantic_ai`` directly. LLM-driven
work runs in :class:`HarnessProgram` where every tool call passes
through :func:`check_authorization`.
"""
from __future__ import annotations

from typing import Any

from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, ConfigDict, Field

from pyfars.kernel import query
from pyfars.kernel.store import System
from pyfars.kernel.witness import Witness, make_witness
from pyfars.sdk.entities import Agent, Assignment, load_one


ASSIGNMENT_TYPES: tuple[str, ...] = ("assignment",)


class DispatchState(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    system: System
    root: Any  # pathlib.Path — kept loose to avoid pulling Path into BaseModel
    tick: int | None = None
    spawn: bool = False
    previous_assignment_slugs: list[str] = Field(default_factory=list)

    current_assignment_slugs: list[str] = Field(default_factory=list)
    assignments: list[Assignment] = Field(default_factory=list)
    spawn_requests: list[dict[str, Any]] = Field(default_factory=list)
    witnesses: list[Witness] = Field(default_factory=list)


def _birth_death_witnesses(
    *, previous: list[str], current: list[str], tick: int | None,
) -> list[Witness]:
    prev = set(previous)
    cur = set(current)
    out: list[Witness] = []
    for born in sorted(cur - prev):
        details: dict[str, Any] = {"assignment_slug": born}
        if tick is not None:
            details["tick"] = tick
        out.append(make_witness(
            operator="assignment_birth",
            target=f"assignment/{born}",
            before_hash=None, after_hash=None,
            details=details, channel="dispatch",
            kind="observation", origin="dispatch",
        ))
    for died in sorted(prev - cur):
        details = {"assignment_slug": died}
        if tick is not None:
            details["tick"] = tick
        out.append(make_witness(
            operator="assignment_death",
            target=f"assignment/{died}",
            before_hash=None, after_hash=None,
            details=details, channel="dispatch",
            kind="observation", origin="dispatch",
        ))
    return out


async def load_node(state: DispatchState) -> dict[str, Any]:
    """Read assignment subjects from the closed system store."""
    store = state.system.store
    current = sorted(
        str(s) for s in query.subjects_of_type(store, ASSIGNMENT_TYPES)
    )
    return {
        "current_assignment_slugs": current,
        "witnesses": _birth_death_witnesses(
            previous=state.previous_assignment_slugs,
            current=current,
            tick=state.tick,
        ),
    }


async def read_assignments_node(state: DispatchState) -> dict[str, Any]:
    """Load each new assignment as a typed view."""
    store = state.system.store
    previous = set(state.previous_assignment_slugs)
    new_slugs = [s for s in state.current_assignment_slugs if s not in previous]
    assignments: list[Assignment] = []
    for slug in new_slugs:
        record = load_one(Assignment, store, slug)
        if record is not None:
            assignments.append(record)
    return {"assignments": assignments}


def _is_workitem_open(store, workitem: str) -> bool:
    """Cell-driven gate: dispatch only opens-status workitems."""
    for obj in query.objects_under(store, workitem, ("status",)):
        if str(obj) in ("open", "active"):
            return True
        return False
    return True  # no status cell ⇒ assume open (polity hasn't authored a state machine)


def _agent_kind(store, agent_slug: str) -> str:
    """Resolve which program-class enacts this agent.

    Reads the agent record's ``type`` cell. Returns one of:
    ``"script"`` (automated-process), ``"harness"`` (ai-model / hybrid
    / unset), ``"human"`` (human).
    """
    agent_record = load_one(Agent, store, agent_slug)
    if agent_record is None:
        return "harness"
    kind = agent_record.type
    if kind == "automated-process":
        return "script"
    if kind == "human":
        return "human"
    return "harness"


async def spawn_node(state: DispatchState) -> dict[str, Any]:
    """For each new assignment, request a child program spawn."""
    store = state.system.store
    new_witnesses = list(state.witnesses)
    spawn_requests: list[dict[str, Any]] = []
    for a in state.assignments:
        if not _is_workitem_open(store, a.workitem):
            continue
        kind = _agent_kind(store, a.agent)
        if kind == "human":
            new_witnesses.append(make_witness(
                operator="human_assignment",
                target=f"assignment/{a.slug}",
                before_hash=None, after_hash=None,
                details={
                    "assignment": a.slug,
                    "workitem": a.workitem,
                    "agent": a.agent,
                    "tick": state.tick,
                },
                channel="dispatch", kind="observation", origin="dispatch",
            ))
            continue
        spawn_requests.append({
            "kind": kind,
            "assignment": a.slug,
            "workitem": a.workitem,
            "agent": a.agent,
        })
        new_witnesses.append(make_witness(
            operator="program_spawn_requested",
            target=f"assignment/{a.slug}",
            before_hash=None, after_hash=None,
            details={
                "assignment": a.slug,
                "workitem": a.workitem,
                "agent": a.agent,
                "program_kind": kind,
                "tick": state.tick,
            },
            channel="dispatch", kind="guard", origin="dispatch",
        ))
    return {"witnesses": new_witnesses, "spawn_requests": spawn_requests}


def _after_read(state: DispatchState) -> str:
    return "spawn" if state.spawn and state.assignments else "end"


def build_dispatch_graph():
    g = StateGraph(DispatchState)
    g.add_node("load", load_node)
    g.add_node("read_assignments", read_assignments_node)
    g.add_node("spawn", spawn_node)
    g.add_edge(START, "load")
    g.add_edge("load", "read_assignments")
    g.add_conditional_edges(
        "read_assignments", _after_read,
        {"spawn": "spawn", "end": END},
    )
    g.add_edge("spawn", END)
    return g.compile()


_GRAPH = None


async def run_tick(
    system: System,
    *,
    root,
    tick: int | None = None,
    spawn: bool = False,
    previous_assignment_slugs: list[str] | None = None,
) -> DispatchState:
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_dispatch_graph()
    final = await _GRAPH.ainvoke(DispatchState(
        system=system,
        root=root,
        tick=tick,
        spawn=spawn,
        previous_assignment_slugs=previous_assignment_slugs or [],
    ))
    if isinstance(final, dict):
        return DispatchState.model_validate(final)
    return final


__all__ = [
    "ASSIGNMENT_TYPES",
    "DispatchState",
    "build_dispatch_graph",
    "load_node",
    "read_assignments_node",
    "run_tick",
    "spawn_node",
]
