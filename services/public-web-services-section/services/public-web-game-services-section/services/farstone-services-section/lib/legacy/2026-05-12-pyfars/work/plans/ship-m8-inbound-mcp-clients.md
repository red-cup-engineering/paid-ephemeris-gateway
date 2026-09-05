---
title: "Ship [M8 — Inbound Participation: MCP/A2A Clients](../milestones/m8-inbound-participation-mcp-clients.md) as a coordinated plan"
type: plan
status: planning
milestone: m8-inbound-participation-mcp-clients
tasks:
  - author-inbound-boundary-template
  - implement-inbound-boundary-loader
  - bind-inbound-boundary-to-office-and-jurisdiction
  - implement-mcp-list-tools-endpoint
  - implement-mcp-call-tool-endpoint
  - implement-mcp-list-resources-endpoint
  - design-cloud-agent-as-inbound-only-dispatchable
  - implement-inbound-call-to-workitem-projection
  - route-inbound-workitem-via-boundary-office
  - implement-witness-emission-with-actor-and-via-slots
  - bind-cloud-agent-identifier-to-inbound-witness
  - test-witness-chain-replay-correctness-for-inbound-calls
  - extend-office-record-to-declare-inbound-admission-scope
  - implement-inbound-call-jurisdiction-check
  - emit-ultra-vires-witnesses-for-out-of-scope-inbound-calls
dependency-order:
  - [author-inbound-boundary-template, implement-inbound-boundary-loader]
  - [implement-inbound-boundary-loader, bind-inbound-boundary-to-office-and-jurisdiction]
  - [bind-inbound-boundary-to-office-and-jurisdiction, implement-mcp-list-tools-endpoint]
  - [implement-mcp-list-tools-endpoint, implement-mcp-call-tool-endpoint]
  - [implement-mcp-call-tool-endpoint, implement-mcp-list-resources-endpoint]
  - [implement-mcp-call-tool-endpoint, design-cloud-agent-as-inbound-only-dispatchable]
  - [design-cloud-agent-as-inbound-only-dispatchable, implement-inbound-call-to-workitem-projection]
  - [implement-inbound-call-to-workitem-projection, route-inbound-workitem-via-boundary-office]
  - [route-inbound-workitem-via-boundary-office, implement-witness-emission-with-actor-and-via-slots]
  - [implement-witness-emission-with-actor-and-via-slots, bind-cloud-agent-identifier-to-inbound-witness]
  - [bind-cloud-agent-identifier-to-inbound-witness, test-witness-chain-replay-correctness-for-inbound-calls]
  - [bind-inbound-boundary-to-office-and-jurisdiction, extend-office-record-to-declare-inbound-admission-scope]
  - [extend-office-record-to-declare-inbound-admission-scope, implement-inbound-call-jurisdiction-check]
  - [implement-inbound-call-jurisdiction-check, emit-ultra-vires-witnesses-for-out-of-scope-inbound-calls]
milestone-cells:
  - "(inbound-only-boundary-records, loadable, true) = T"
  - "(mcp-server, exposes-dispatchable-workitems, true) = T"
  - "(cloud-agent, admitted-via-dispatch, true) = T"
  - "(inbound-witness-chain, signed-and-bifurcated, true) = T"
  - "(office-bound-admission-policies, enforced, true) = T"
normative-cleanup: required
revision-likely: true
revision-triggers: [m7-outbound-endpoints-completion, mcp-protocol-evolution, accountability-chain-totality-question-resolution]
---


## Revision-likely: this plan is fidelity-overspent

Per [roadmap-enrichment](../../concepts/roadmap-enrichment.md), [M8](../milestones/m8-inbound-participation-mcp-clients.md) is at `horizon: captured`.
A plan-record at this fidelity is *overspent*; rescope-triggers warrant reviewing the task list and dependency-order:

- **[M7](../milestones/m7-outbound-endpoints-completion.md) completion**: M8's inbound-boundary schema must compose with M7's boundary-record schema; whichever ships first pins the shape.
  Currently M8's plan assumes the M7-tier schema is settled.
- **MCP protocol evolution**: the MCP specification continues to evolve; tasks like [`implement-mcp-list-tools-endpoint`](../tasks/engineering/implement-mcp-list-tools-endpoint.md) and [`implement-mcp-call-tool-endpoint`](../tasks/engineering/implement-mcp-call-tool-endpoint.md) target a specific protocol version that may shift before M8 ships.
  The plan should revisit the MCP version-pinning when implementation begins.
- **Resolution of [`accountability-chain-totality-as-m11-audit-invariant`](../../questions/accountability-chain-totality-as-m11-audit-invariant.md)**: a yes-answer requires the witness-chain bifurcation (actor / via) to satisfy accountability-chain totality — one human principal per outcome.
  M8's current scope doesn't yet pin which office's principal-of-record holds totality; resolution would add a totality-verification task.

Per [predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) §"Defeasible stability", silent revision is forbidden — revision-on-trigger requires a witness.

## What this plan does

[M8](../milestones/m8-inbound-participation-mcp-clients.md) closes the inbound side of the swarm-participation-handedness framework.
After M7's outbound side, M8 makes the captain's "Claude on Android calling `quiescent.
561.group/mcp/...
`" use case substrate-mediated and substrate-audited.

Five joint settlements: (1) inbound boundary records, (2) MCP server endpoints exposing dispatchable workitems, (3) cloud-agent admission via dispatch, (4) signed witness chain with actor-and-via bifurcation, (5) office-bound admission policies.
The acceptance scenario from the milestone (cloud-Claude calls list-tools then call-tool, gets a result, witness chain shows office-actor + cloud-agent-via) verifies the joint working.

## Why `normative-cleanup: required`

[M8](../milestones/m8-inbound-participation-mcp-clients.md) is where the substrate's *own boundary against the outside world* becomes operative.
Inbound calls touch substrate state under office authority; the witness chain bifurcation ensures audit; office-bound admission ensures scope. **Duty cells generated by inbound work must discharge before plan completion**, otherwise the substrate has unresolved obligations attributed to cloud agents who have already disconnected.

This matches [M5](../milestones/m5-agential-self-generation.md)'s `normative-cleanup: required` discipline.
Both M5 and M8 are governance-operative milestones; both require duty residue audit at completion.

## Dependency structure

```
inbound-boundary-template ──→ loader ──→ bind-to-office-jurisdiction
                                                  ↓
                              mcp-list-tools ──→ mcp-call-tool ──→ mcp-list-resources
                                                  ↓
                              cloud-agent-as-inbound-dispatchable ──→ inbound-call-to-workitem ──→ route-via-boundary-office
                                                                                                          ↓
                              witness-emission-with-actor-and-via ──→ bind-cloud-agent-identifier ──→ replay-correctness-test
                                                  ↓
                              office-record-inbound-admission-scope ──→ jurisdiction-check ──→ ultra-vires-witnesses
                                                                                                          ↓
                                                                          (M8 acceptance: cloud-Claude end-to-end)
```

## Milestone cells and acceptance

The plan completes when all five milestone-cells are at $\mathbf{t}$ AND normative-residue is empty.
The end-to-end acceptance test (cloud-Claude calls and gets witnessed result with proper scope binding) verifies the joint working.

## Theory grounding

- [Predwork plan](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/plan.md) — formal definition; particularly the normative-residue corollary.
- [MCP-client-as-swarm-participant question (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md) — the open question this milestone closes.
- [Office-as-fuzzy-cell](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md) — the authority discipline extended to inbound.
