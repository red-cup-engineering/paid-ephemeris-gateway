---
title: "Building & Safety Director"
type: office
scope: permits-inspections-code-enforcement
reports-to: mayor
action-domain:
  - issue-building-permit
  - deny-building-permit
  - conduct-safety-inspection
  - issue-stop-work-order
  - file-permit-decision
deontic-profile:
  issue-building-permit: power
  deny-building-permit: power
  conduct-safety-inspection: power
  issue-stop-work-order: power
  decide-permit-within-30-days: duty
  conduct-final-inspection-before-occupancy: duty
provides-capabilities:
  - permit-authority
  - safety-inspection
provides-skill:
  - issuing-building-permit
  - denying-building-permit
  - conducting-safety-inspection
jurisdiction-write:
  - examples/farston/operations/triage/dispatch-intents/
  - examples/farston/work/tasks/municipal/
---


The office responsible for building permits, safety inspections, and code enforcement.
Decides permit applications within the 30-day window declared in Charter Article III §3.

## Powers

- **Issue or deny building permit.** Decision must be filed within 30 days of complete application.
- **Conduct safety inspection.** Authority over occupied and proposed structures.
- **Issue stop-work order.** Suspends work on a site pending compliance review.

## Duties

- **Decide permit within 30 days.** Charter Article III §3.
  Decisions held past 30 days produce a charter-binding-violation entry.
- **Conduct final inspection before occupancy.** No certificate of occupancy issues without an in-person inspection signed by the director or a delegated inspector.

## Current status

14 pending applications; 3 approaching or past the 30-day window.
See `examples/farston/work/tasks/municipal/` for the active permit workitems.
