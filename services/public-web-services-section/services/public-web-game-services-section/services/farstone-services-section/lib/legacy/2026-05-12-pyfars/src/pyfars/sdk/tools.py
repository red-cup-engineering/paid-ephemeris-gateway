"""Shared tool surface — substrate operations callable from any program.

These functions are the per-operation primitives that bridges and
harnesses expose to their callers. Each operation:

  - Takes the polity ``root`` (the engine's UDS lives under it).
  - Takes the operation's own arguments.
  - Returns a :class:`ToolResult` (``ok``, ``data``, optional ``error``).

The functions themselves don't authorize. Callers (``McpBridge`` via
``programs/mcp/tools.py``, the agentic ``HarnessProgram``) wrap them in
``BridgeProgram.authorize_bearer`` or equivalent gates before invoking.

Every operation reaches the live engine via ``pyfars.client.uds`` — no
filesystem reads, no kernel projector calls. The engine is the source
of truth; these functions are clients.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pyfars.client import uds
from pyfars.kernel.witness import make_witness
from pyfars.sdk.entities.session import MEMORY_BANK_SECTIONS, Session


@dataclass
class ToolResult:
    """Outcome of one tool invocation."""
    ok: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


def _engine_error(exc: uds.EngineNotRunning) -> ToolResult:
    return ToolResult(ok=False, error=f"engine not running: {exc}")


def show_subject(*, root: Path, subject: str) -> ToolResult:
    """Read all cells for one substrate subject."""
    try:
        rows = uds.cells(subject, start=root)
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    return ToolResult(ok=True, data={
        "subject": subject, "cells": rows, "count": len(rows),
    })


def polity_facts(*, root: Path) -> ToolResult:
    """Polity identity facts — title, office and personnel counts, cells."""
    try:
        polity_subjects = uds.subjects_of_type(["polity"], start=root)
        polity = polity_subjects[0] if polity_subjects else None
        facts: dict[str, Any] = {"polity": polity}
        if polity:
            facts["cells"] = uds.cells(polity, start=root)
        facts["office_count"] = len(
            uds.subjects_of_type(["office"], start=root),
        )
        facts["personnel_count"] = len(
            uds.subjects_of_type(["personnel"], start=root),
        )
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    return ToolResult(ok=True, data=facts)


def list_offices(*, root: Path) -> ToolResult:
    """List all chartered offices with their cells."""
    try:
        slugs = uds.subjects_of_type(["office"], start=root)
        offices = [
            {"slug": s, "cells": uds.cells(s, start=root)} for s in slugs
        ]
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    return ToolResult(
        ok=True, data={"offices": offices, "count": len(offices)},
    )


def read_assignments(*, root: Path, agent: str) -> ToolResult:
    """Assignments naming this agent, with workitem context.

    The Assignment entity is the minimal pairing ``(workitem, agent)``;
    everything else lives in cells around the workitem. This tool walks
    Assignments where ``agent`` matches, then reads the workitem's cells
    for the rich context an agentic loop needs (status, priority,
    title, etc.). Only workitems whose ``(workitem, status, V)`` is
    ``open``, ``active``, or unset are returned; settled/escalated/
    abandoned workitems drop out.
    """
    if not agent or not isinstance(agent, str):
        return ToolResult(
            ok=False, error="agent required (non-empty string)",
        )
    try:
        assignment_slugs = uds.subjects_of_type(["assignment"], start=root)
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    assignments: list[dict[str, Any]] = []
    for slug in assignment_slugs:
        rows = uds.cells(slug, start=root)
        fm = {r["predicate"]: r.get("object")
              for r in rows if "predicate" in r}
        if fm.get("agent") != agent:
            continue
        workitem = fm.get("workitem")
        if not workitem:
            continue
        workitem_rows = uds.cells(str(workitem), start=root)
        wfm = {r["predicate"]: r.get("object")
               for r in workitem_rows if "predicate" in r}
        status = wfm.get("status")
        if status not in (None, "", "open", "active"):
            continue
        assignments.append({
            "assignment": slug,
            "workitem": str(workitem),
            "title": wfm.get("title", str(workitem)),
            "status": status,
            "priority": wfm.get("priority", 0),
            "from_sender": wfm.get("from-sender"),
            "sent_at": wfm.get("sent-at"),
        })
    assignments.sort(key=lambda a: -int(a.get("priority") or 0))
    return ToolResult(ok=True, data={
        "agent": agent,
        "assignments": assignments,
        "count": len(assignments),
    })


def append_witness(
    *,
    root: Path,
    operator: str,
    target: str,
    details: dict[str, Any] | None = None,
    channel: str | None = "session",
    origin: str | None = None,
    agent: str | None = None,
    acting_office: str | None = None,
    truth: float = 1.0,
    evidence: float = 1.0,
) -> ToolResult:
    """Author a Witness and POST it to the engine."""
    from pydantic import ValidationError

    try:
        witness = make_witness(
            operator=operator,
            target=target,
            before_hash=None,
            after_hash=None,
            details=details or {},
            agent=agent,
            acting_office=acting_office,
            channel=channel,
            origin=origin,
            truth=truth,
            evidence=evidence,
        )
    except (ValidationError, ValueError) as exc:
        return ToolResult(
            ok=False, error=f"witness validation failed: {exc}",
        )
    try:
        result = uds.post_witness(
            witness.model_dump(mode="json"), start=root,
        )
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    return ToolResult(ok=True, data=result)


def _session_path(root: Path, session_id: str) -> Path:
    """Resolve a session's on-disk JSON path under the polity's ``.pyfars/``."""
    return Path(root) / ".pyfars" / "sessions" / f"{session_id}.json"


def read_memory(*, root: Path, session_id: str, section: str) -> ToolResult:
    """Read one Memory-Bank section from a session.

    Session state lives at ``<root>/.pyfars/sessions/<session_id>.json``
    as JSON (per :class:`Session`). The named ``section`` must be one of
    :data:`MEMORY_BANK_SECTIONS` or ``"custom"``. Returns the section
    value; an empty string is the canonical "not yet written" marker.
    """
    if section not in MEMORY_BANK_SECTIONS and section != "custom":
        return ToolResult(
            ok=False,
            error=(
                f"unknown memory-bank section {section!r}; "
                f"valid: {MEMORY_BANK_SECTIONS + ('custom',)}"
            ),
        )
    path = _session_path(root, session_id)
    if not path.is_file():
        return ToolResult(ok=True, data={
            "session_id": session_id,
            "section": section,
            "content": "" if section != "custom" else {},
            "exists": False,
        })
    try:
        session = Session.load(path, strict=False)
    except (ValueError, OSError) as exc:
        return ToolResult(
            ok=False, error=f"session load failed: {exc}",
        )
    return ToolResult(ok=True, data={
        "session_id": session_id,
        "section": section,
        "content": session.sections.get(section, ""),
        "exists": True,
    })


def update_memory_section(
    *,
    root: Path,
    session_id: str,
    section: str,
    content: Any,
    agent: str | None = None,
    acting_office: str | None = None,
) -> ToolResult:
    """Update one Memory-Bank section on a session.

    Two coupled writes:

      1. Mutate ``<root>/.pyfars/sessions/<session_id>.json`` — the
         canonical session state. :class:`Session` validates the
         section name and the JSON shape.
      2. Post a ``memory_section_updated`` witness through UDS — the
         audit trail for the mutation. Polities can author closure
         rules over this channel to project memory changes into
         system-frame cells.

    A new session file is created if none exists; this is the natural
    "first save" path.
    """
    if section not in MEMORY_BANK_SECTIONS and section != "custom":
        return ToolResult(
            ok=False,
            error=(
                f"unknown memory-bank section {section!r}; "
                f"valid: {MEMORY_BANK_SECTIONS + ('custom',)}"
            ),
        )
    path = _session_path(root, session_id)
    try:
        if path.is_file():
            session = Session.load(path, strict=False)
        else:
            session = Session(id=session_id)
            session.start()
        session.update_section(section, content)
        session.save(path)
    except (ValueError, TypeError, KeyError, OSError) as exc:
        return ToolResult(
            ok=False, error=f"session update failed: {exc}",
        )
    try:
        witness = make_witness(
            operator="memory_section_updated",
            target=f"session/{session_id}",
            before_hash=None,
            after_hash=None,
            details={
                "session_id": session_id,
                "section": section,
                "size": len(content) if hasattr(content, "__len__") else None,
            },
            agent=agent,
            acting_office=acting_office,
            channel="memory",
            origin="sdk.tools.update_memory_section",
            kind="mutation",
        )
        result = uds.post_witness(
            witness.model_dump(mode="json"), start=root,
        )
    except uds.EngineNotRunning:
        result = {"engine_running": False}
    return ToolResult(ok=True, data={
        "session_id": session_id,
        "section": section,
        "witness": result,
    })


def recent_events(*, root: Path, n: int = 50) -> ToolResult:
    """Last N witnesses from the polity's event log."""
    try:
        events = uds.events(n=n, start=root)
    except uds.EngineNotRunning as exc:
        return _engine_error(exc)
    return ToolResult(
        ok=True, data={"events": events, "count": len(events)},
    )


__all__ = [
    "ToolResult",
    "append_witness",
    "list_offices",
    "polity_facts",
    "read_assignments",
    "read_memory",
    "recent_events",
    "show_subject",
    "update_memory_section",
]
