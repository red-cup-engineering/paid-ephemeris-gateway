---
title: "LLMEndpointRecord fully spec-conformant"
type: goal
milestone: m7-boundary-handedness-and-outbound-endpoints
status: open
horizon: captured
theory-basis: [llm-endpoint-record, agent-record, witness-chain-bifurcation]
tasks:
  - author-llm-endpoint-record-template
  - migrate-existing-endpoint-router-records-to-spec-conformant
  - enforce-llm-endpoint-record-invariants-at-load-time
---


After this goal, endpoint records at `governance/endpoints/<provider>--<model>.md` carry the full [`LLMEndpointRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md) spec: identity, handedness, capability, cost, availability, provenance, and the four invariants (no signing key; outbound-only; cost-witnessed; capability-bounded).
The substrate index loads them; the dispatch graph reads them; the load-time validation enforces the invariants.

## Why

[M2 — Substrate-Driven Dispatch](../milestones/m2-substrate-dispatch.md) introduced endpoint records at `governance/assets/computing/endpoints/<slug>.md` to populate the `EndpointRouter`.
That was a partial realization — the records existed but their full FARS-spec-conformant shape was deferred.
M7 closes the gap: the records carry every required field; the runtime enforces every invariant; the records are at the canonical location ([`governance/endpoints/`](../../governance/endpoints/) per the updated [directories.md](../../governance/specifications/directories.md)).

This is what the captain's "swarm calling out to free-tier LLM endpoints, choosing among them based on cost, capability, and rate-limit availability" requires.

## Theory grounding

**1.
LLMEndpointRecord as outbound-only AgentRecord specialization** ([FARS spec](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/llm-endpoint-record.md)).
The record specializes [`AgentRecord`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/agent-record.md) restricted to outbound-only handedness. **The four invariants are load-bearing**: a record violating any one is non-conformant and the substrate must reject it (or surface it as a $\top$ cell at load time).

**2.
Witness-chain bifurcation** (FARS [`witness`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/objects/) — when authored).
An endpoint cannot sign witnesses; its outputs enter the substrate via the dispatching office's signature, with the endpoint named in the witness's `via` slot, not its `actor` slot. **This is a structural distinction the witness emission code must enforce.** A dispatch to an endpoint that produced a witness with the endpoint as actor is a substrate violation — the signature key must be the office's, the endpoint is named-via.

**3.
Capability-bounded dispatch via $\delta$-computation** ([predication-categories Prop 2](../../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) — `$\mathbf{f}$ as $\odot$-absorber`).
Endpoint capabilities are restricted to the `provides-capabilities` list.
A dispatch attempting to route work requiring a capability the endpoint lacks **must fail at $\delta$-computation** — the algebra produces $\mathbf{f}$ on the eligibility cell, the dispatch is disqualified.
Without this, an endpoint might be dispatched work it cannot serve, producing runtime errors instead of substrate-visible failures.

### Design constraints from this grounding

- **No signing key field.** The record's frontmatter must NOT have a `signing-key:` cell.
  Load-time validation rejects records that include one.
- **Handedness fixed at `outbound-only`.** Load-time validation enforces this.
  Attempting to load an endpoint record with a different handedness produces a $\top$ cell on the record's authenticity.
- **Cost cells are required.** `cost-per-token-in` and `cost-per-token-out` must be present (may be `0` for free-tier endpoints, but must be settled, not absent).
- **Identity-stable per provider terms.** When a provider deprecates a model, the existing record stays for audit (with `deprecated-at:` cell); a new record is created.
  The runtime must accept both during the deprecation window.

## Acceptance

- [ ] A template at `governance/templates/llm-endpoint.md` carries the full FARS spec frontmatter.
- [ ] Existing endpoint records at `governance/assets/computing/endpoints/` migrate to `governance/endpoints/` per the updated directory spec.
- [ ] Each migrated record is validated against the FARS spec; non-conformant records produce findings.
- [ ] Load-time invariant enforcement: missing required field, presence of `signing-key`, wrong handedness, missing cost cells, or capability-set conflict all produce a substrate-visible $\top$ at load.
- [ ] At least three example endpoints (e.g., `cerebras--llama-3.3-70b`, `groq--llama-3.3-70b`, `nvidia--llama-3.3-70b`) are authored as conformant records.
- [ ] No regression in [M2](../milestones/m2-substrate-dispatch.md) dispatch — existing endpoint dispatches continue to work after migration.
