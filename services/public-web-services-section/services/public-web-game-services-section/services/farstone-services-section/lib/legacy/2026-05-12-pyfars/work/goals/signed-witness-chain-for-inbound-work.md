---
title: "Signed witness chain for inbound work"
type: goal
milestone: m8-inbound-participation-mcp-clients
status: open
horizon: captured
theory-basis: [witness-chain-bifurcation, first-class-provenance, office-as-fuzzy-cell]
tasks:
  - implement-witness-emission-with-actor-and-via-slots
  - bind-cloud-agent-identifier-to-inbound-witness
  - test-witness-chain-replay-correctness-for-inbound-calls
---


After this goal, every inbound call emits a witness chain with the **bifurcated structure** the M8 milestone requires: the admitting office signs (substrate-native; `actor` slot); the cloud agent is named (substrate-foreign; `via` slot); the substrate-bound result is the `consequent`.

This is the load-bearing provenance discipline for inbound participation: it preserves [Charter](../../governance/charter.md) C2 (first-class provenance) for cross-boundary work without requiring the cloud agent to sign anything (the cloud agent has no substrate-side signing key by design — see [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)'s mirror invariant for outbound).

## Why

Without bifurcated witnessing, inbound calls would either:

- Have no provenance at all (witness emits with the substrate's "system" actor; cloud agent identity is lost; audit cannot reconstruct who called what), OR
- Force the cloud agent to sign (which contradicts the inbound-only-no-signing-key invariant — cloud agents are not substrate-native, can't be issued substrate-native signing keys, can't sign witnesses).

The bifurcation resolves this: **the office signs (it's substrate-native and authoritative); the cloud agent is named (it's the via-which, not the actor)**.

## Theory grounding

**1.
Witness as predication-cell** (FARS [`witness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/) — when authored).
A witness is a substrate cell of shape `(act, by-actor, <actor>) = T, (act, via, <via-name>) = T, (act, consequent, <result>) = T`.
The actor slot is **always** a substrate-native entity (an office or an in-process agent); the via slot may be a substrate-foreign entity (an LLM endpoint, a cloud agent, an MCP client).

**2.
Bifurcated structure mirrors outbound** ([M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md)'s LLMEndpointRecord invariant).
For outbound: `office → dispatch-via-endpoint → external-result`.
For inbound: `office → admit-via-cloud-agent → substrate-bound-result`. **The same bifurcation pattern applies in both directions.** The substrate-native actor (office) is the signed authority; the substrate-foreign via is the named participant.

**3.
Replay correctness depends on signing** ([`replay-determinism-verified`](replay-determinism-verified.md), M3).
For replay to reconstruct the same substrate state, the witness chain must be cryptographically verifiable. **The office's signing key signs the witness; the witness includes the cloud agent's identifier (e.g., MCP client's authenticated user-id) as a payload field**, but the signature is the office's, not the agent's.
Replay verifies the office's signature; the cloud agent's identifier is a fact-cell in the witness, not a signed claim.

### Design constraints from this grounding

- **The actor slot is substrate-native.** The runtime's witness-emission code rejects emissions where the actor isn't a substrate-loaded office or in-process agent.
  Cloud agents in the actor slot produce a $\top$ on authenticity.
- **The via slot accepts substrate-foreign identifiers.** A cloud agent's MCP-client-id, an LLM endpoint's `(provider, model)` tuple, an A2A peer's URL — all are valid via values.
  The runtime doesn't try to verify the via's signing capability; it just records the identifier.
- **A single inbound call may produce multiple witnesses.** The admit-witness emits when the call is admitted; per-step witnesses emit as the workflow runs; the response-witness emits when the result projects back.
  All carry the same `via:` cloud-agent-identifier; the same office signs all of them.

## Acceptance

- [ ] The witness-emission API accepts a `via:` parameter naming substrate-foreign participants.
- [ ] An inbound call from a cloud agent emits at least three witnesses: admit, work-in-progress (one per workflow step), response.
- [ ] All witnesses carry: `actor: <office-slug>` (signed by the office's key), `via: <cloud-agent-identifier>`, `consequent: <substrate-cells-or-result-projection>`.
- [ ] Replay test: replaying an inbound call reconstructs the same witness chain with the same cloud-agent via-cells.
- [ ] An attempted witness emission with a cloud agent in the actor slot is rejected (substrate-visible $\top$ on authenticity).
- [ ] An attempted witness emission lacking a `via:` for an inbound call produces a $\top$ on completeness (every inbound witness must name its via).
