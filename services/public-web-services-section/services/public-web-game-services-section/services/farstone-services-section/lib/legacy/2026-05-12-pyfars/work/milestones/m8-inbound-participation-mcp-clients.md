---
title: "M8 — Inbound Participation: MCP/A2A Clients as Swarm Participants"
type: milestone
campaign: ship-pyfars-autonomous-loop
status: planning
horizon: captured
depends-on: [m7-boundary-handedness-and-outbound-endpoints]
goals:
  - inbound-only-boundary-records
  - mcp-server-endpoint-exposes-dispatchable-workitems
  - cloud-agent-admission-via-dispatch
  - signed-witness-chain-for-inbound-work
  - office-bound-admission-policies
theory-basis: [swarm-participation-handedness, mcp-client-as-swarm-participant, boundary-as-fiber, office-as-fuzzy-cell]
cites-objects:
  - pyfars/objects/office-record.md
  - pyfars/objects/dispatch-closure-rule-system.md
  - pyfars/objects/jsonl-event-log.md
  - pyfars/objects/eligibility-by-jurisdiction.md
cites-morphisms:
  - pyfars/morphisms/dispatching.md
  - pyfars/morphisms/witnessing-completion.md
cites-claims:
  - pyfars/claims/dispatch-derives-from-governance.md
backing-gaps:
  - pyfars/objects/boundary-record.md (NOT YET AUTHORED — shared with M7; inbound-only handedness here)
  - pyfars/objects/mcp-server-endpoint.md (NOT YET AUTHORED — FastAPI sub-app exposing MCP-protocol-compatible verbs)
  - pyfars/objects/signed-witness.md (NOT YET AUTHORED — Ed25519-signed substrate witness for inbound work)
  - pyfars/morphisms/admitting-inbound-call.md (NOT YET AUTHORED — auth-then-route inbound boundary call)
acceptance: "A cloud agent (e.g., Claude on Android via MCP) calls `quiescent.561.group/mcp/dispatch` with an authenticated request; the substrate admits the call as a workitem-completion via dispatch; the substrate emits a witness chain naming the cloud agent (in the `via` slot) and the admitting office (in the `actor` slot); the result is substrate-bound at office's handedness scope."
---


[M7](m7-boundary-handedness-and-outbound-endpoints.md) opened the outbound side of the boundary — the substrate dispatching to external endpoints.
M8 opens the **inbound** side: external agents (cloud-hosted Claude, ChatGPT plugins, A2A-protocol agents) call the substrate's exposed endpoints, authenticate, and operate on the substrate's workitems via dispatch.
The boundary's handedness coordinate makes the inbound class composable with the outbound class — same dispatch algebra, different settle-action shape.

## What inbound participation enables

The captain's described use case: **"Claude on Android calling `quiescent.
561.group/mcp/...
`"**.
A cloud-hosted LLM agent (which has no substrate of its own that PyFARS reaches into) authenticates against the PyFARS instance, requests work, executes against substrate-exposed tools, and writes its results back.
The cloud agent is an inbound participant: it dials in; PyFARS does not dial it.

Distinct from outbound endpoints (which PyFARS calls): the cloud agent **initiates** the contact.
Distinct from sovereign-node peers (federated): the cloud agent has no substrate, no event log, no rule-system version.
Distinct from in-process agents (no boundary): the cloud agent is on the other side of an authentication-gated network boundary.

## Goals

| Slug | One-liner | Status |
|---|---|---|
| [`inbound-only-boundary-records`](../goals/inbound-only-boundary-records.md) | A boundary record at `governance/boundaries/<slug>.md` with `handedness: inbound-only` exposes a typed authenticated entry point | open |
| [`mcp-server-endpoint-exposes-dispatchable-workitems`](../goals/mcp-server-endpoint-exposes-dispatchable-workitems.md) | A FastAPI sub-app at the engine's UDS-bound API exposes MCP-protocol-compatible endpoints (list-tools, call-tool, list-resources) backed by substrate workitems | open |
| [`cloud-agent-admission-via-dispatch`](../goals/cloud-agent-admission-via-dispatch.md) | When a cloud agent's authenticated call arrives at the inbound boundary, dispatch creates a workitem on the agent's behalf and routes it to the agent (handedness `inbound-only`); the call's response is the workitem's result | open |
| [`signed-witness-chain-for-inbound-work`](../goals/signed-witness-chain-for-inbound-work.md) | Every inbound call emits a witness chain: the admitting office signs (substrate-native; in the `actor` slot); the cloud agent is named (in `via`); the substrate-bound result is the consequent | open |
| [`office-bound-admission-policies`](../goals/office-bound-admission-policies.md) | Each inbound boundary record declares which office's authority admits calls; the office's [jural-relations](../../governance/jural-relations/_index.md) gate what scope of substrate the cloud agent can affect | open |

## What lands together

- `governance/boundaries/` carries authored boundary records, both inbound and outbound (M7's outbound endpoints already use the framework; M8 adds inbound).
- A FastAPI MCP server at the engine's UDS or a public TLS-fronted port; `quiescent.
  561.group/mcp/...
  ` resolves to it.
- The dispatch graph admits inbound calls as a special-case workflow: the call becomes a `(workitem, dispatchable=cloud-agent)` pair where the dispatchable's handedness is `inbound-only` and the settle-action is "consume the inbound request, run the office's authorized workflow, return the result."
- Witness chains for inbound work include both the cloud agent's name (provenance: who called us) and the admitting office's signature (authority: what we let them do).
- Office-bound admission policies — codified as the [jural-relations](../../governance/jural-relations/_index.md) and [jurisdictions](../../governance/jurisdictions/) the inbound boundary's office holds — gate the scope of substrate access.
  A cloud agent calling under office *X* sees only the predicates jurisdiction *X* covers.

## Done when

A captain authors a boundary record at `governance/boundaries/mcp-public.md` with `handedness: inbound-only`, `office: pyfars-public-mcp-officer`, `jurisdiction: <jurisdiction-slug>`.
The MCP server starts (per [M3](m3-continuous-loop.md)'s supervised-service path).
A cloud-hosted Claude agent (e.g., Claude on Android) calls `quiescent.
561.group/mcp/list-tools` with valid authentication; the response enumerates the dispatchable workitems the boundary's office is authorized to expose.
The agent then calls `quiescent.
561.group/mcp/call-tool/<tool>` with arguments; dispatch creates a workitem, fires the workflow, returns the result.

The event log shows: an inbound-call witness with `actor: pyfars-public-mcp-officer`, `via: claude-android-cloud-agent` (or similar identifier), `consequent: <substrate-bound-result>`.
Replay-determinism preserved: re-running the event log reconstructs the same substrate state.

## Theoretical shape

M8 completes the **swarm-participation-handedness framework** that M7 opened.
After M8, the three swarm-participant classes the FARS open question identified are all realized:

- **Bidirectional sovereign-node peers** — [M6](m6-federation.md)
- **Outbound-only endpoints** — [M7](m7-boundary-handedness-and-outbound-endpoints.md)
- **Inbound-only cloud agents** — M8

**1.
MCP-client-as-swarm-participant resolved** ([`flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md)).
The FARS open question on whether and how MCP clients participate in the swarm closes here: they are *inbound-only swarm participants*, recorded as boundary-bound entry-points in the substrate, admitted via the office whose authority the boundary names.
Their work is dispatched by *the office*, not by the substrate as a whole — this is what keeps the algebra honest.

**2.
Witness chain bifurcation** ([`flatfile-agentic-resource-system/objects/witness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/) — when authored).
Inbound work introduces a structural distinction: **the actor is the office (substrate-native, signs), the agent-via-which is the cloud agent (substrate-foreign, named).** This bifurcation already exists for outbound endpoints (the office dispatches via the endpoint); M8 makes the inbound case symmetric — an office admits via a cloud agent.
The witness chain `office → admit-via-cloud-agent → substrate-bound-result` mirrors `office → dispatch-via-endpoint → external-result` (M7).

**3.
Office-as-fuzzy-cell extended to inbound admission** ([`flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md)).
[M5](m5-agential-self-generation.md)'s [`office-records-gate-authority`](../goals/office-records-gate-authority.md) goal made offices the authorization gate for in-process dispatch.
M8 extends the same machinery to inbound: a cloud agent's call is *only admitted* if the boundary's office holds authority over the call's scope-action; otherwise the call is *ultra vires* and the response is a refusal-witness with no settled effect on the substrate.

## Related

- [Roadmap](roadmap.md)
- [MCP-client-as-swarm-participant question (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/mcp-client-as-swarm-participant.md)
- [Swarm-participation-handedness question (FARS)](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/questions/swarm-participation-handedness.md)
- [Wiring Protocols](../../governance/specifications/wiring-protocols.md) — the engine's exposed-API surface
