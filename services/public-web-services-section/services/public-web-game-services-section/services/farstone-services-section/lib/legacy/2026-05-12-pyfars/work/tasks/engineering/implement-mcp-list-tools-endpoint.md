---
title: "Implement the MCP list-tools endpoint"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: mcp-server-endpoint-exposes-dispatchable-workitems
depends-on: [bind-inbound-boundary-to-office-and-jurisdiction]
requires-capabilities: [python-editing, fastapi, mcp-protocol]
theory-basis: [dispatch-readiness, office-as-fuzzy-cell]
---


## Description

Add `POST /mcp/list-tools` to the FastAPI MCP server sub-app. The endpoint returns the *currently-dispatchable* workitems (within the boundary's `exposed-predicates`) as MCP-protocol tool descriptors.

Per call:

1. **Authenticate** per the boundary's auth scheme.
  On failure: 401.
2. **Walk the substrate** for workitem-class records the boundary's office is authorized to dispatch (intersection of `exposed-predicates` and the office's jurisdiction's `predicate-sub-category`).
3. **Project each into MCP tool descriptor**: `{name, description, input_schema}`.
  The substrate workitem-class record carries `description:` and `arguments-schema:` cells; project them.
4. **Return** the list as an MCP-protocol-compatible response.

The endpoint is a substrate read (per cost-discipline: free); no settle-action, no closure-rule firing, no cost witness.

## Acceptance

- [ ] `POST /mcp/list-tools` registered.
- [ ] Authentication enforced; failure returns 401.
- [ ] Returns only tools the boundary's office is authorized for; verified by tests.
- [ ] Tool descriptors are MCP-protocol-conformant (verified against MCP spec; sample-test-with-real-mcp-client if practical).
- [ ] No cost witness emitted (read-only).

## Progress cells

*(empty — task not yet started)*
