---
title: "Implement the inbound-call jurisdiction check"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: office-bound-admission-policies
depends-on: [implement-mcp-call-tool-endpoint, extend-office-record-to-declare-inbound-admission-scope]
requires-capabilities: [python-editing, jurisdiction-evaluation]
theory-basis: [jurisdiction, office-as-fuzzy-cell]
---


## Description

In the MCP `call-tool` handler, before dispatch, run the three-axis jurisdiction check per [predgov jurisdiction](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md):

1. **Personal jurisdiction**: the authenticated cloud agent identity is admitted by the boundary's `auth:` scheme.
  (Already covered by step 1 of the handler; this confirms the personal axis.)
2. **Subject-matter jurisdiction**: the call's tool-name maps to a predicate in the office's jurisdiction's `predicate-sub-category`.
  If not, fail.
3. **Territorial / temporal jurisdiction**: the current stage falls within the jurisdiction's `T_J` (e.g., business-hours-only inbound).
  If not, fail.

Each axis check is a closure-rule lookup: `(boundary, current-stage-in-jurisdiction-T_J, true) = ?
`, `(boundary's-office, jurisdiction-covers-predicate, <call-predicate>) = ?
`.
The runtime walks these and proceeds only if all are at T.

Any axis failing emits an ultra-vires witness per [`emit-ultra-vires-witnesses-for-out-of-scope-inbound-calls`](emit-ultra-vires-witnesses-for-out-of-scope-inbound-calls.md) (next task in chain).

## Acceptance

- [ ] The handler evaluates all three jurisdiction axes before workitem creation.
- [ ] Each axis evaluation reads jurisdiction cells from the substrate (not hardcoded).
- [ ] Failure on any axis produces 403 to the cloud agent + ultra-vires witness with the failed axis named.
- [ ] Tests cover: all three axes pass (admit), personal-fails (auth fail = 401, not 403), subject-matter-fails (403 + ultra-vires), temporal-fails (403 + ultra-vires).
- [ ] No regression in M5's in-process office-bound admission.

## Progress cells

*(empty — task not yet started)*
