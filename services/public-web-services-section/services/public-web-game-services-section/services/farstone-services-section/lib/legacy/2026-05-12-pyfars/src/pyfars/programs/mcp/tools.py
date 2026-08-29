"""MCP-bridge wrappers around the shared SDK tool surface.

Each tool here is a thin adapter:

  1. Authorize the inbound Bearer token via the bridge's
     :meth:`BridgeProgram.authorize_bearer` gate.
  2. Call the shared SDK function in :mod:`pyfars.sdk.tools`.
  3. Return either ``ToolResult.data`` (on admit) or a denial dict.

The shared SDK functions are also used directly by the agentic
``HarnessProgram`` — same operations, different transport.
"""
from __future__ import annotations

from typing import Any

from fastmcp.server.context import Context

from pyfars.programs.bridge import BridgeProgram, CallOutcome
from pyfars.sdk import tools as sdk_tools


def _authorize(bridge: BridgeProgram, ctx: Context, tool: str) -> CallOutcome:
    """Authorize one MCP tool call via the inbound Bearer token."""
    rc = ctx.request_context if ctx else None
    request = getattr(rc, "request", None) if rc else None
    auth_header = (
        request.headers.get("authorization") if request is not None else None
    )
    return bridge.authorize_bearer(auth_header, f"mcp.{tool}")


def _denied(outcome: CallOutcome) -> dict[str, Any]:
    return {
        "error": "authorization denied",
        "decision": outcome.decision,
        "reason": outcome.reason,
    }


def _result_or_error(result: sdk_tools.ToolResult) -> dict[str, Any]:
    if result.ok:
        return result.data
    return {"error": result.error}


def register_system_tools(server, *, bridge: BridgeProgram) -> None:
    """Register system-frame tools on a ``FastMCP`` instance.

    Tools registered (each authorized per-call via the bridge):

    - ``show_subject(subject)`` — cells for one subject
    - ``polity_facts()``        — identity facts (composite)
    - ``list_offices()``        — chartered offices
    - ``read_assignments(agent)`` — open assignments naming this agent
    - ``append_witness(...)``   — POST a witness to the engine
    - ``recent_events(n)``      — last N witnesses from the event log
    """
    root = bridge.root

    @server.tool(
        name="show_subject",
        description=(
            "Read all cells for one system subject. Returns rows of "
            "(subject, predicate, object, value) tuples — the full fiber "
            "over that subject."
        ),
    )
    def show_subject(subject: str, ctx: Context) -> dict:
        outcome = _authorize(bridge, ctx, "show_subject")
        if not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.show_subject(
            root=root, subject=subject,
        ))

    @server.tool(
        name="polity_facts",
        description=(
            "Return the polity's identity facts: title, ship, captain, "
            "office count, populace count. Composite over the system."
        ),
    )
    def polity_facts(ctx: Context) -> dict:
        outcome = _authorize(bridge, ctx, "polity_facts")
        if not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.polity_facts(root=root))

    @server.tool(
        name="list_offices",
        description=(
            "List all chartered offices in the polity, with their cells."
        ),
    )
    def list_offices(ctx: Context) -> dict:
        outcome = _authorize(bridge, ctx, "list_offices")
        if not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.list_offices(root=root))

    @server.tool(
        name="read_assignments",
        description=(
            "Read the open assignments naming this agent. Returns each "
            "assignment's workitem context (title, status, priority, "
            "sender)."
        ),
    )
    def read_assignments(agent: str, ctx: Context) -> dict:
        outcome = _authorize(bridge, ctx, "read_assignments")
        if not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.read_assignments(
            root=root, agent=agent,
        ))

    @server.tool(
        name="append_witness",
        description=(
            "Author a Witness and POST it to the engine. The engine writes "
            "it to the event log; closure rules in the system decide what "
            "it means."
        ),
    )
    def append_witness(
        operator: str,
        target: str,
        ctx: Context,
        details: dict | None = None,
        channel: str = "session",
        origin: str = "",
        agent: str = "",
        truth: float = 1.0,
        evidence: float = 1.0,
    ) -> dict:
        outcome = _authorize(bridge, ctx, "append_witness")
        if not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.append_witness(
            root=root,
            operator=operator,
            target=target,
            details=details,
            channel=channel or None,
            origin=origin or None,
            agent=agent or outcome.subject,
            truth=truth,
            evidence=evidence,
        ))

    @server.tool(
        name="recent_events",
        description=(
            "Read the last N witnesses from the polity's event log. "
            "Use to inspect recent system activity for context."
        ),
    )
    def recent_events(n: int = 50, ctx: Context | None = None) -> dict:
        outcome = _authorize(bridge, ctx, "recent_events") if ctx else None
        if outcome is not None and not outcome.admitted:
            return _denied(outcome)
        return _result_or_error(sdk_tools.recent_events(root=root, n=n))
