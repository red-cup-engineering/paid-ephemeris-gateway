---
title: "Enforce LLMEndpointRecord invariants at substrate load time"
type: task
area: engineering
status: open
horizon: captured
milestone: m7-boundary-handedness-and-outbound-endpoints
goal: llm-endpoint-record-fully-spec-conformant
depends-on: [migrate-existing-endpoint-router-records-to-spec-conformant]
requires-capabilities: [python-editing, substrate-validation]
theory-basis: [llm-endpoint-record, projector-framework-counit]
---


## Description

Add validation at substrate-load that checks every `type: llm-endpoint` record against the FARS-spec invariants:

1. **No signing key.** Records with a `signing-key:` cell are non-conformant — emit $\top$ on the record's authenticity.
2. **Handedness fixed at outbound-only.** Records with any other handedness produce $\top$.
3. **Cost cells required.** `cost-per-token-in` and `cost-per-token-out` must be present (may be `0`, but must be settled).
4. **Capability-bounded.** `provides-capabilities` must be a non-empty list; missing/empty produces $\top$.
5. **Rate-limit cells required.** `rate-limit-rpm` and `rate-limit-tpm` are required (rpd and tpd are optional, may be null).
6. **Identity-stable.** A `deprecated-at` cell is allowed; if present, the record is flagged but not rejected (existing dispatches against a deprecated endpoint may continue during the deprecation window).

Validation lives at `runtime/substrate_validators/llm_endpoint.py` (or extends a generic record-type validator).
Invariant violations produce findings emitted into `work/findings/` for captain review.

## Acceptance

- [ ] Validation runs at boot, after all endpoint records are loaded.
- [ ] Each invariant violation produces a $\top$ cell on the record's authenticity AND a finding record at `work/findings/`.
- [ ] Tests cover: each invariant individually, each in combination, well-formed record passes cleanly.
- [ ] Per the projector counit law: the validation is deterministic — same record produces same outcome every load.
- [ ] No regression: well-formed endpoint records (post-migration) all pass.

## Progress cells

*(empty — task not yet started)*
