---
title: "Author the MCP `append_witness` write tool on `pyfars-substrate` server"
type: task
area: engineering
status: complete
completed: 2026-05-09
horizon: doing
milestone: m5-agential-self-generation
goal: claude-as-pyfars-runtime
plan: ship-mcp-write-tool-surface
depends-on: []
requires-capabilities: [python-editing, mcp-server-development, witness-emission]
theory-basis: [witness-emission-is-surface-invariant, surface-invariant-codepath, witness-as-increment, dispatch-composes-authorization, normative-operational-layering]
derives-from-claim: witness-emission-is-surface-invariant
derives-from-spec: "event-log-append:2026.05.09+event-log-append"
satisfies-requirements: [R1, R2, R3, R4, R5, R6]
---


## Description

This task realizes specification [`event-log-append`](../../../governance/specifications/event-log-append.md) requirements R1–R6 by adding the MCP `append_witness` write tool.
The MCP server at [`pyfars/src/pyfars/mcp/tools.py`](../../../src/pyfars/mcp/tools.py) presently registers four read-only tools: `list_records`, `show_record`, `polity_facts`, `list_offices`.
Its module docstring is explicit: *"First cut: read-only substrate operations.
Write operations come once the operator-UI side of Arc D is settled and the bilateral-grant model between user-account principals and substrate-write authorization is wired through."* This task lifts that hold for the simplest write verb — `append_witness` — leaving the bilateral-grant authority model out of scope per the [`ship-mcp-write-tool-surface`](../../plans/ship-mcp-write-tool-surface.md) plan's permissive-append disposition.

Per spec R1–R3, the MCP tool MUST terminate at the canonical call site `pyfars.runtime.event_log.
EventLog.append`, not open the event-log file directly.
Per R4–R5, the tool MUST construct a `Witness` instance via the schema's Pydantic validators (which enforce `truth`/`evidence` axes in $[0, 1]$).
Per R6, the tool MUST accept `channel`, `origin`, `agent` parameters that flow into the witness payload as filterable surface-identity fields.

Add the tool by extending `register_substrate_tools(server, *, root)` in `tools.py`.
The contract:

```python
@server.tool(
    name="append_witness",
    description=(
        "Author a Witness record and append it to the polity's event log. "
        "Required: operator (slug), target (substrate path or cell-coordinate). "
        "Optional: details (str), channel (str), origin (str), "
        "truth (float in [0,1], default 1.0), evidence (float in [0,1], default 1.0). "
        "Returns the witness's hash and the event-log path it appended to."
    ),
)
def append_witness(
    operator: str,
    target: str,
    details: str = "",
    channel: str = "session",
    origin: str = "",
    truth: float = 1.0,
    evidence: float = 1.0,
) -> dict:
    ...
```

The tool's body constructs a `Witness` from the supplied fields (calling the existing `pyfars.entities.witness.
Witness` constructor so the `[0,1]` validators fire), computes the witness's `before_hash`/`after_hash` if applicable from the existing event-log tip, appends it to `.fars/event-log/<date>.jsonl` via the same path the hook dispatcher currently uses, and returns `{"hash": ..., "path": ..., "truth": ..., "evidence": ...}
`.

The tool calls *one* underlying append routine — the same routine the hook dispatcher will be re-routed to call in the follow-on task.
Concretely, factor the append logic out of wherever it currently lives (most likely `pyfars/runtime/event_log.py`) into a single public function `pyfars.runtime.event_log.append_witness(witness, *, root)` that both this MCP tool and the hook dispatcher's `pyfars hook-dispatch <slug>` codepath invoke.
If that single-codepath factoring already exists, this task only adds the MCP-side registration.

The tool is *permissive*: no office-authority check at write-time.
Every append produces a witness whose `origin` field names the caller; an after-the-fact audit detects ultra-vires appends from origin-field analysis.
The authority gate is deferred to a later plan (after [`delegable-powers-distinct-from-full-powers`](../../../questions/delegable-powers-distinct-from-full-powers.md) resolves and Phase 2 lands office-bound MCP authority).

The tool's parameter list carries `truth` and `evidence` only, not a cost-quantale payload.
If [`in-session-cost-axis-grading`](../../../questions/in-session-cost-axis-grading.md) later resolves toward per-call cost grading, a migration adds the field; the present contract does not pre-empt the question.

## Acceptance

Acceptance criteria are derived from spec [`event-log-append`](../../../governance/specifications/event-log-append.md) §6.
Each criterion below cites the spec section it operationalizes.

- [ ] **(spec §6.1 + R1)** `register_substrate_tools()` in `pyfars/src/pyfars/mcp/tools.py` registers an `append_witness` tool with the parameter list and return shape specified in the description above.
- [ ] **(spec R1)** The tool's body terminates at `pyfars.runtime.event_log.
  EventLog.append`.
  A grep over `pyfars/src/` for `path.open(<event-log-path>, "a")` (or equivalent) returns exactly one match in `event_log.py`; the MCP tool does not add a second match.
- [ ] **(spec §6.3 + R4–R5)** The tool constructs a `Witness` via `pyfars.entities.witness.
  Witness(...)
  ` so the `truth`/`evidence` validators (range $[0,1]$) fire on caller-supplied values; out-of-range inputs return `{"error": ...}
  ` rather than appending a malformed cell.
- [ ] **(spec R6)** Optional parameters `channel`, `origin`, `agent` flow through to the `Witness` payload as authored.
  When omitted, the witness is surface-anonymous (consistent with the spec's MAY clause for these fields).
- [ ] **(operates over math example via code-example fixture)** An end-to-end test under `tools/platform/pyfars/tests/test_event_log_append.py` (authored as part of the implementation-chain step 3): start a `pyfars-substrate` MCP server against a temporary polity root; via an MCP client (FastMCP's in-process test client), call `append_witness(operator="test", target="cells/test", truth=0.7, evidence=0.5, channel="test")`; assert the resulting `<event-log-dir>/<date>.jsonl` contains a record with the supplied fields.
  The test loads its expected payload from a code-example fixture under `examples/event-log-append/`, not from inline data.
- [ ] **(negative test, spec §6.3)** A second test asserts that `append_witness(..., truth=2.0)` returns an `{"error": ...}
  ` payload rather than appending.
  Loads its fixture from `examples/event-log-append/witness-payload-validation.py` (or equivalent).
- [ ] The module docstring at `tools.py` lines 9–13 is updated to reflect that the read-only hold is partially lifted: `append_witness` is the first write tool; further writes await Phase 2's office-authority wiring.
  The docstring cites this task's spec for the new hold posture.

## Progress cells

- 2026-05-09 — Implemented.
  `append_witness` tool registered in `pyfars/src/pyfars/mcp/tools.py` (lines added inside `register_substrate_tools`).
  Constructor uses `make_witness` so the bilattice-axis validators fire; out-of-range or malformed payloads return `{"error": ...}
  ` rather than appending.
  Module docstring updated to reflect partial lift of read-only hold and to cite spec `event-log-append:2026.05.09+event-log-append`.
  R1–R6 satisfied.
- 2026-05-09 — `pyfars.mcp.server` gained `build_server(*, root)` convenience for in-process FastMCP testing alongside the existing `build_mcp_app`.
- 2026-05-09 — `tests/test_event_log_append.py` is green: 9 passed, 2 skipped (R11–R12 audit deferral per `ship-mcp-write-tool-surface` §"What this plan does NOT claim").
  End-to-end §6.5 test exercises both surfaces against a temp polity using `fastmcp.
  Client` in-process.
- 2026-05-09 — Spec §6.5 test was authored speculatively with a byte-equivalence assertion that overshot what the spec requires (the spec only requires codepath-uniqueness + well-formed witnesses on both surfaces).
  Test brought into line with spec; the byte-equivalence-under-matching-inputs claim is a stronger property the spec does not assert and a follow-on cycle would need to add it (or not — the surface-identity fields per R6 are *intentionally* allowed to differ across surfaces).
