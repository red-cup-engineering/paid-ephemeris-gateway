---
title: "Fire Chief"
type: office
scope: fire-emergency-response
reports-to: mayor
action-domain:
  - dispatch-emergency-response
  - conduct-fire-inspection
  - declare-fire-watch
  - request-mutual-aid
deontic-profile:
  dispatch-emergency-response: power
  conduct-fire-inspection: power
  declare-fire-watch: power
  request-mutual-aid: power
  respond-within-8-minutes: duty
  inspect-public-buildings-annually: duty
  immunity-from-good-faith-emergency-decisions: immunity
provides-capabilities:
  - emergency-authority
  - fire-inspection
provides-skill:
  - dispatching-emergency-response
  - conducting-fire-inspection
  - declaring-fire-watch
jurisdiction-write:
  - examples/farston/operations/triage/dispatch-intents/
---


The professional chief of the volunteer fire department.
Holds emergency-response authority, conducts annual public-building inspections, declares fire watches during high-risk weather, and coordinates mutual aid with neighboring municipalities.

## Powers

- **Dispatch emergency response.** Authority to commit volunteers, equipment, and mutual aid.
- **Conduct fire inspection.** Authority over public and commercial buildings; results filed to building-safety.
- **Declare fire watch.** Restricts open burning; published immediately to the records clerk.
- **Request mutual aid.** Coordinates with neighboring municipal fire departments.

## Duties

- **Respond within 8 minutes** to emergency dispatches within city limits.
- **Inspect public buildings annually.** Filed to building-safety and records clerk.

## Immunity

Good-faith decisions during declared emergencies are immune from civil suit per state statute.
