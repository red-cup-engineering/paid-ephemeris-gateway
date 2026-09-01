---
name: "Dispatching emergency response"
description: "Commits volunteers and equipment to an active emergency within 8 minutes of dispatch and coordinates mutual aid if needed. Use whenever a 911 call routes to the fire department for fire, hazmat, or medical-first-responder events."
---


## Requirements

- An active emergency dispatch record (911 call, mutual-aid request, or self-initiated by chief)
- Volunteer roster status and equipment availability
- Authorization from the fire-chief office (or designated officer-on-duty)

## Steps

1. Classify the emergency: fire / hazmat / medical / mutual-aid / other.
2. Determine response level: single-engine, full-call, mutual-aid request.
3. Page the appropriate volunteer roster; commit equipment.
4. If the response window approaches the 8-minute charter requirement, request mutual aid from neighboring townships.
5. Write the dispatch record to `operations/emergency-dispatches/<incident-slug>.md` with timestamps and committed resources.
6. Witness the dispatch.

## Outcomes

Volunteers and equipment are en route.
The dispatch record is in the substrate.
On scene-clear, the record's status moves to `concluded` and a clear witness fires.
