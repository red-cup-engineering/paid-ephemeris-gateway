---
title: "Implement the MCP call-tool endpoint"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: mcp-server-endpoint-exposes-dispatchable-workitems
depends-on: [implement-mcp-list-tools-endpoint, design-cloud-agent-as-inbound-only-dispatchable]
requires-capabilities: [python-editing, fastapi, mcp-protocol]
theory-basis: [dispatch-readiness, office-as-fuzzy-cell]
---


## Description

Add `POST /mcp/call-tool/{tool-name}` to the FastAPI MCP server sub-app. This is the heart of [M8](../../milestones/m8-inbound-participation-mcp-clients.md): a cloud agent calls this endpoint, the substrate creates a workitem on the agent's behalf, dispatches it via the boundary's office, returns the workitem's result.

Steps per call:

1. **Authenticate** per the boundary's `auth:` scheme.
  On failure: 401, no substrate write.
2. **Validate tool-name** is in the boundary's `exposed-predicates:`.
  On failure: 403, ultra-vires witness emitted.
3. **Validate jurisdiction** — the call's predicate must fall within the office's jurisdiction.
  On failure: 403, ultra-vires witness emitted.
4. **Project the call into a workitem**: `(workitem, kind, inbound-call) = T`, `(workitem, requested-by-cloud-agent, <agent-id>) = T`, `(workitem, requested-via-boundary, <boundary-slug>) = T`, `(workitem, tool-name, <tool>) = T`, `(workitem, tool-arguments, <arg-cells>) = T`.
5. **Dispatch** through the standard dispatch graph; the dispatchable for this workitem is the boundary's office (a degenerate office whose only granted skill is `admit-inbound-call`).
6. **Wait for completion** (the workflow associated with `tool-name` runs).
7. **Project the result back** through the boundary's `apply` interfacer into MCP-protocol response shape.
8. **Emit witnesses**: admit witness, per-step workflow witnesses, response witness — all with the office in `actor`, the cloud agent in `via`.
9. **Return** the MCP response.

## Acceptance

- [ ] `POST /mcp/call-tool/{tool-name}` registered with the FastAPI app.
- [ ] Authentication is enforced per boundary's auth scheme.
- [ ] Out-of-`exposed-predicates` calls get 403 + ultra-vires witness.
- [ ] Out-of-jurisdiction calls get 403 + ultra-vires witness.
- [ ] In-scope calls produce a workitem in the substrate; dispatch fires; result returns; witnesses emit with proper actor/via bifurcation.
- [ ] Tests cover: successful call, auth failure, exposed-predicates failure, jurisdiction failure, malformed arguments, runtime error in workflow.
- [ ] Replay determinism: replaying the event log reconstructs the inbound-call workitem, witnesses, result.

## Progress cells

*(empty — task not yet started)*
