---
title: "Bind inbound boundary to office and jurisdiction"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: inbound-only-boundary-records
depends-on: [implement-inbound-boundary-loader]
requires-capabilities: [python-editing, jurisdiction-evaluation]
theory-basis: [office-as-fuzzy-cell, jurisdiction]
---


## Description

The boundary's `office:` and `jurisdiction:` cells must resolve to real substrate records at boot.
Add resolution + validation:

1. Look up the named office in `governance/offices/`.
  If not found: $\top$ on the boundary's authenticity.
2. Look up the named jurisdiction in `governance/jurisdictions/`.
  If not found: $\top$.
3. Verify the office's incumbency is at full joint settlement per [M5](../../milestones/m5-agential-self-generation.md)'s [`implement-incumbency-verification-rule`](implement-incumbency-verification-rule.md).
  If vacancy: $\top$.
4. Verify the jurisdiction's `predicate-sub-category` covers the boundary's `exposed-predicates`.
  If not: $\top$.
5. Cache the resolved bindings on the boundary record's runtime representation; subsequent dispatch uses the cached resolution.

## Acceptance

- [ ] At boot, every inbound boundary's office and jurisdiction are resolved or rejected.
- [ ] The full incumbency check ties into M5's machinery (no parallel implementation).
- [ ] The exposed-predicates ⊆ jurisdiction predicate-sub-category invariant is enforced; violations produce $\top$ + finding.
- [ ] Tests cover: clean binding, missing office, missing jurisdiction, vacant office, oversized exposed-predicates.

## Progress cells

*(empty — task not yet started)*
