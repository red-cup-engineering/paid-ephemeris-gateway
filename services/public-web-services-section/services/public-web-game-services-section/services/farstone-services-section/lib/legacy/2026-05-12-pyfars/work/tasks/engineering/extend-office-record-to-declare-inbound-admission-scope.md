---
title: "Extend office record to declare inbound admission scope"
type: task
area: engineering
status: open
horizon: captured
milestone: m8-inbound-participation-mcp-clients
goal: office-bound-admission-policies
depends-on: [bind-inbound-boundary-to-office-and-jurisdiction]
requires-capabilities: [substrate-authoring, office-design]
theory-basis: [office-as-fuzzy-cell, jurisdiction]
---


## Description

Office records currently carry `authority-scope`, `duty`, `right` per [M5](../../milestones/m5-agential-self-generation.md)'s [`office-records-gate-authority`](office-records-gate-authority.md).
Add an optional `admits-inbound-from-boundaries:` cell — a list of boundary slugs the office is authorized to back.
This is what links offices to inbound boundaries explicitly and lets the substrate audit "which offices can admit inbound calls."

If absent: the office cannot back any inbound boundary (default-deny).
If present: the office backs the listed boundaries; cross-reference checked at boundary load time (per [`bind-inbound-boundary-to-office-and-jurisdiction`](bind-inbound-boundary-to-office-and-jurisdiction.md)).

Update the office template at `governance/templates/office.md` (or equivalent) to document the optional cell.

## Acceptance

- [ ] Office template documents the optional `admits-inbound-from-boundaries:` cell.
- [ ] Boundary load-time validation enforces the symmetric cross-reference: a boundary's `office:` cell points to an office whose `admits-inbound-from-boundaries:` includes the boundary's slug; absent the cross-reference, $\top$.
- [ ] Tests cover: matched cross-reference (admits), missing cross-reference (rejects), one-sided (office lists boundary but boundary doesn't list office; vice versa) — both produce $\top$.
- [ ] Existing offices (without inbound boundary backing) are unaffected.

## Progress cells

*(empty — task not yet started)*
