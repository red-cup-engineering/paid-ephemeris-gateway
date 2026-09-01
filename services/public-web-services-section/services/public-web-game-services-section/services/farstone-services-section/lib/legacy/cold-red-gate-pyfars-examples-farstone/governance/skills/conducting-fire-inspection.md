---
name: "Conducting fire inspection"
description: "Fire-chief action that inspects a building or premises for fire-code compliance and files the result. Use during scheduled annual inspections or in response to a citizen concern."
---


## Requirements

- A target premises (address or parcel slug)
- Fire-chief authority (or deputized fire-marshal)
- Calibrated inspection checklist

## Steps

1. Inspect the target against Farston's fire-code checklist.
2. Document any deficiencies with photos and location notes.
3. Write the inspection record to `operations/fire-inspections/<premises-slug>-<date>.md`.
4. If deficiencies are present, queue a re-inspection workitem and notify the property owner with the cure-period.

## Outcomes

The inspection record exists; the premises carries its `fire-code-compliance` cell (T/F); on F, a re-inspection workitem and notification dispatch intent are queued.
