---
title: "Design cloud agent as inbound-only dispatchable"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: cloud-agent-admission-via-dispatch
depends-on: [implement-mcp-call-tool-endpoint]
requires-capabilities: [agent-record-design, dispatch-graph]
theory-basis: [llm-endpoint-record, dispatch-readiness]
---


## Description

Specify the cloud-agent record type — analogue to [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) but inbound-only.

Frontmatter:
```yaml
---
title: "<cloud-agent-display-name>"
type: cloud-agent
slug: <kebab-case>
status: active | revoked
handedness: inbound-only                # FIXED
identity-claim: <identifier-from-auth>  # what the auth scheme established
admitted-via-boundary: <boundary-slug>
admit-skill: admit-inbound-call         # the only skill granted
first-seen-at: <ISO-timestamp>
last-seen-at: <ISO-timestamp>
---
```

Cloud-agent records are *not* hand-authored — they're emitted by the runtime when a previously-unseen authenticated identity calls an inbound boundary.
The runtime maintains them in `governance/cloud-agents/` (or a runtime-emitted location like `<substrate-root>/.pyfars/cloud-agents/<id>.md`).

The design document goes at `work/specs/cloud-agent-as-dispatchable.md`.

## Acceptance

- [ ] Spec at the path above.
- [ ] Spec covers: frontmatter shape, runtime-emission discipline, lifecycle (first-seen, active, revoked), invariants (handedness fixed, no signing key).
- [ ] Spec describes how the cloud-agent record interacts with the dispatch graph as a dispatchable.
- [ ] Spec defines the cloud-agent's degenerate office's only skill (`admit-inbound-call`) and what that skill's settle-action does.

## Progress cells

*(empty — task not yet started)*
