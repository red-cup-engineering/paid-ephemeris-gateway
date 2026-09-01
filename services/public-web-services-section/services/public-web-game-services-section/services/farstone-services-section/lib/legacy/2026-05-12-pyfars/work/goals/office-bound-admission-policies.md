---
title: "Office-bound admission policies"
type: goal
milestone: m8-inbound-participation-mcp-clients
status: open
horizon: captured
theory-basis: [office-as-fuzzy-cell, jurisdiction, jural-relation]
tasks:
  - extend-office-record-to-declare-inbound-admission-scope
  - implement-inbound-call-jurisdiction-check
  - emit-ultra-vires-witnesses-for-out-of-scope-inbound-calls
---


After this goal, each inbound boundary record's office's [jural-relations](../../governance/jural-relations/_index.md) and [jurisdiction](../../governance/jurisdictions/) gate the scope of substrate access for cloud-agent calls.
A cloud agent calling under boundary $B$ (with office $O$) sees and affects only what $O$'s authority covers: the office's jurisdiction's predicate sub-category, within the office's temporal scope, under the office's validity condition.

This is the unifying goal that makes the inbound participation framework match [M5 — Agential Self-Generation](../milestones/m5-agential-self-generation.md)'s [`office-records-gate-authority`](office-records-gate-authority.md) discipline. **Inbound is just the cross-boundary case of the same authority gate.**

## Why

Without office-bound admission, an inbound call could affect any substrate cell the runtime can write — defeating the point of authority.
The captain's commitment to predicated agentic computing requires that authority be substrate-readable at every dispatch decision; cross-boundary dispatch is no exception.
M8's office-bound admission policies are what bring the inbound case into compliance with that discipline.

This is also the *audit story*: a captain reviewing a boundary's activity reads the boundary's office, the office's jural-relations, the jurisdiction.
They can see exactly what the cloud agents calling that boundary were authorized to do.
No implicit-permissions, no out-of-band trust.

## Theory grounding

**1.
Office-as-fuzzy-cell extended to inbound admission** ([`flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md)).
[M5](../milestones/m5-agential-self-generation.md)'s [`office-records-gate-authority`](office-records-gate-authority.md) made offices the authorization gate for in-process dispatch. **M8 extends to inbound: a cloud agent's call is *only admitted* if the boundary's office holds authority over the call's scope-action**; otherwise the call is *ultra vires* and the response is a refusal-witness with no settled effect on the substrate.

**2.
Jurisdiction's three axes apply to inbound** ([`predicated-governance/objects/jurisdiction`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md)):

- **Personal jurisdiction.** The cloud agent must be present-in-domain (e.g., authenticated against the boundary).
  This corresponds to the auth scheme on the boundary record.
- **Subject-matter jurisdiction.** The call's predicate must be in $\mathcal{C}_J$.
  This is checked against the boundary's `exposed-predicates:`.
- **Territorial/temporal jurisdiction.** The current stage must be in $T_J$.
  Temporally-bounded inbound (e.g., "this boundary is open during business hours") is admissible.

**3.
Ultra vires for out-of-scope inbound** ([predgov jurisdiction](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md) §"Ultra vires").
An inbound call attempting to operate outside the office's jurisdiction produces a *failure-witness* and *no* downstream effect.
The would-be-settled cell remains at $\bot$. **The cloud agent receives an MCP-protocol error response (e.g., 403 Forbidden) but the substrate carries the witness for audit.**

### Design constraints from this grounding

- **The boundary's `exposed-predicates:` must be a sub-cap of the office's jurisdiction predicate-category.** Validation enforces this at boundary load time.
  A boundary trying to expose more than its office holds is non-conformant.
- **Inbound-call jurisdiction check happens *before* dispatch.** The MCP server's `call-tool` handler checks: (a) auth, (b) call within `exposed-predicates`, (c) call within office's jurisdiction.
  Any failure produces ultra-vires witness; only after all three succeed does the workitem get created and dispatched.
- **Personal jurisdiction binds to authenticated-identity**, not connection-IP.
  The auth scheme establishes who the cloud agent is; jurisdiction's personal-axis is checked against that identity.
  (E.g., a captain might author multiple inbound boundaries with different offices, and the same physical cloud agent's identity might cross all three.)

## Acceptance

- [ ] The MCP server's `call-tool` handler runs three checks in order: auth, exposed-predicates, jurisdiction; any failure produces ultra-vires witness.
- [ ] Boundary load-time validation rejects boundaries whose `exposed-predicates:` exceeds the office's jurisdiction predicate-category.
- [ ] Tests cover: in-scope call admitted, out-of-`exposed-predicates` produces ultra-vires, out-of-jurisdiction-temporal produces ultra-vires, out-of-personal-jurisdiction (failed auth) produces 403, malformed call (e.g., bad arguments) produces a different error class than ultra-vires.
- [ ] Auditors can read a boundary's office, jural-relations, jurisdiction and reconstruct what the boundary's cloud agents were authorized to do.
- [ ] No regression in [M5](../milestones/m5-agential-self-generation.md) in-process office-bound admission; the inbound check is additive, not replacing.
