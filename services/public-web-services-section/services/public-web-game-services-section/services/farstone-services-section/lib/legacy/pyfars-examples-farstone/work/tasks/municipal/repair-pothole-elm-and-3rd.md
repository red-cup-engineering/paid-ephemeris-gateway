---
type: workitem
subtype: procedure
title: "Repair pothole at Elm Street and 3rd Avenue"
status: pending
priority: medium
sourced-from: citizen-complaint-2026-117
requires-capabilities:
  - infrastructure-operation
requires-skills:
  - dispatching-road-repair
touches:
  - examples/farston/operations/
  - examples/farston/work/tasks/municipal/
target-window: "2026-08-01 to 2026-08-15"
acceptance:
  - pothole-filled
  - location-inspected-after-fill
  - completion-witness-fired
---


Citizen complaint #2026-117 (filed two weeks ago) reports a deepening pothole at the intersection of Elm and 3rd.
Crew assignment, materials, and scheduling are public-works's responsibility under the dispatching-road-repair skill.

## Procedure

1. Inspector confirms location and severity (depth, lane impact).
2. Verify road-maintenance budget line has unencumbered balance for the patch.
3. Schedule crew within the target window; commit materials.
4. Crew patches the pothole; inspector verifies after fill.
5. Update citizen-complaint-2026-117 status to `resolved`; notify complainant through records clerk.

## Acceptance

- [ ] Pothole filled, level with surrounding pavement.
- [ ] Post-fill inspection signed off.
- [ ] Completion witness fired with cell `(repair-pothole-elm-and-3rd, status, done) = T`.
