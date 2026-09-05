---
title: "MCP server endpoint exposes dispatchable workitems"
type: goal
milestone: m8-inbound-participation-mcp-clients
status: open
horizon: captured
theory-basis: [boundary-as-fiber, dispatch-readiness, office-as-fuzzy-cell]
tasks:
  - implement-mcp-list-tools-endpoint
  - implement-mcp-call-tool-endpoint
  - implement-mcp-list-resources-endpoint
---


After this goal, a FastAPI sub-app at the engine's UDS-bound API exposes MCP-protocol-compatible endpoints (`list-tools`, `call-tool`, `list-resources`) backed by substrate workitems.
A cloud agent (e.g., Claude on Android) can call these endpoints, authenticate per the boundary's auth scheme, and operate on the substrate's workitems within the boundary's exposed scope.

This is the *wire-protocol* counterpart to [`inbound-only-boundary-records`](inbound-only-boundary-records.md): the boundary records declare what's exposed; the MCP server is what actually exposes it.

## Why

The MCP (Model Context Protocol) is the standard for LLM-to-tool interaction; cloud-hosted Claude, ChatGPT plugins, and other LLM frontends speak it.
Exposing PyFARS via MCP means the captain's own cloud-Claude session (or Claude on Android) can call PyFARS's workitems as MCP tools — without PyFARS needing to dial out to the LLM.

Per the FARS [`mcp-client-as-swarm-participant`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md) question, the cloud agent is an inbound-only swarm participant: it dials in; PyFARS does not dial it.
The MCP server is what makes "dialing in" admissible.

## Theory grounding

**1.
Workitems-as-tools mapping** (FARS dispatch pattern).
Per [dispatch-readiness](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/dispatch-readiness.md), a workitem is dispatchable when its eligibility cells settle to T.
The MCP `list-tools` endpoint returns the *currently-dispatchable* workitems (within the boundary's exposed scope). **This is a per-call substrate query, not a static configuration.** A cloud agent calling `list-tools` sees the substrate's current dispatchable population, modulo what the boundary admits.

**2.
`call-tool` as substrate-mediated dispatch** (per [`cloud-agent-admission-via-dispatch`](cloud-agent-admission-via-dispatch.md), the next goal).
When a cloud agent calls `call-tool/<tool-name>` with arguments, the MCP server creates a workitem, dispatches it via the boundary's office, returns the result. **The dispatch path is the same as in-process dispatch** — no special-case routing for inbound calls.

**3.
`list-resources` as substrate read** (FARS read-discipline).
Per the cost-discipline's "reads are free; only settling pays" reading: `list-resources` is a substrate read; it returns substrate cells the boundary's office is authorized to read.
The endpoint is cheap (no settle-action, no closure-rule firing); the response is a projection of substrate state.

### Design constraints from this grounding

- **The MCP server runs as a FastAPI sub-app at the engine's UDS-bound API** per [wiring-protocols.md](../../governance/specifications/wiring-protocols.md).
  It composes with the existing engine endpoints (lifecycle, federation [from M6](../milestones/m6-federation.md), dispatch).
  One process, multiple sub-apps.
- **Tool names map to workitem-class names.** `list-tools` returns `[{name: "fix-task-foo", description: "..."}, ...]
  ` where the names are workitem-class identifiers exposed by the boundary's `exposed-predicates:`.
- **Idempotency follows MCP spec.** Repeated `call-tool` calls with the same arguments may produce the same result (read-only tool) or distinct results (write tool with side effects).
  The substrate's witness-chain captures both correctly.
- **TLS-fronting is out of scope for this goal.** The FastAPI sub-app exposes plain HTTP at the engine's UDS.
  The captain's nginx/Caddy/Traefik (whatever the deployment uses) handles TLS at the front.
  The substrate is decoupled from TLS-cert lifecycle.

## Acceptance

- [ ] `runtime/mcp_server.py` (or equivalent) exposes `POST /mcp/list-tools`, `POST /mcp/call-tool/{tool}`, `POST /mcp/list-resources`.
- [ ] `list-tools` returns the dispatchable workitems in the boundary's scope; tested with at least one inbound boundary.
- [ ] `call-tool` accepts arguments, creates a workitem, dispatches via the boundary's office, returns the result; tested with a simple `fix-task` tool that produces a substrate-bound result.
- [ ] `list-resources` returns substrate cells the boundary's office is authorized to read; tested for read-only access.
- [ ] Authentication is enforced per the boundary's `auth:` scheme.
- [ ] No regression in [M2](../milestones/m2-substrate-dispatch.md)+[M3](../milestones/m3-continuous-loop.md) in-process dispatch; the MCP server is additive.
