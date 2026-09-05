---
title: "Implement the MCP list-resources endpoint"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: mcp-server-endpoint-exposes-dispatchable-workitems
depends-on: [implement-mcp-call-tool-endpoint]
requires-capabilities: [python-editing, fastapi, mcp-protocol]
theory-basis: [office-as-fuzzy-cell, jurisdiction]
---


## Description

Add `POST /mcp/list-resources` to the FastAPI MCP server sub-app. Returns substrate cells the boundary's office is authorized to read, projected as MCP-protocol resource descriptors.

The endpoint is a substrate read; per cost-discipline, free.
Per the [office-as-fuzzy-cell](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md) reading: an office's read-power is granted via [jural-relations](../../../governance/jural-relations/_index.md) of `kind: privilege` (no-right-to-prevent-reading); the boundary's exposed-predicates limits which predicates' cells are projected.

## Acceptance

- [ ] `POST /mcp/list-resources` registered.
- [ ] Returns substrate cells matching `exposed-predicates`; respects office's read scope.
- [ ] Resource descriptors are MCP-protocol-conformant.
- [ ] No cost witness (read-only).
- [ ] Tests cover: full-scope office (all exposed-predicates), restricted office (subset).

## Progress cells

*(empty — task not yet started)*
