---
title: "Implement inbound-call-to-workitem projection"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: cloud-agent-admission-via-dispatch
depends-on: [design-cloud-agent-as-inbound-only-dispatchable]
requires-capabilities: [python-editing, projector-framework]
theory-basis: [projector-framework-counit]
---


## Description

Implement the projector that takes an MCP `call-tool` request and produces a substrate workitem.
Per the projector framework's counit law: `project(call) → workitem; render(workitem) → call` round-trips with canonical-form equivalence.

The projector at `runtime/projectors/inbound_call.py`:

1. Parses the call (tool-name, arguments, headers, authenticated identity).
2. Resolves or creates the cloud-agent record (per [`design-cloud-agent-as-inbound-only-dispatchable`](design-cloud-agent-as-inbound-only-dispatchable.md)).
3. Emits substrate cells: `(workitem, kind, inbound-call) = T`, `(workitem, requested-by-cloud-agent, <agent-slug>) = T`, `(workitem, requested-via-boundary, <boundary-slug>) = T`, `(workitem, tool-name, <tool>) = T`, `(workitem, tool-arguments, <arg-cells>) = T`, `(workitem, requires-capabilities, <capability-cells>) = T`.
4. Returns the workitem-id for the dispatch graph to consume.

## Acceptance

- [ ] Projector exists at `runtime/projectors/inbound_call.py`.
- [ ] Counit law verified: rendering a projected workitem back into call-shape yields original-equivalent.
- [ ] Tests cover: simple call, complex call with structured arguments, repeat call from same cloud agent (no duplicate cloud-agent records), call from new cloud agent (creates record).

## Progress cells

*(empty — task not yet started)*
