---
name: "Dispatching road repair"
description: "Schedules a road repair (pothole, resurface, signage) by writing a work order against an available crew. Use when a verified road-condition complaint or routine inspection identifies a repair need."
---


## Requirements

- A road-condition complaint or inspection record identifying location and nature
- Available crew capacity within the budget line for road maintenance
- Authorization from the public-works-director office

## Steps

1. Verify the location and nature of repair (cross-reference the citizen report with the inspector's assessment).
2. Check the road-maintenance budget line for available unencumbered balance via the finance director.
3. Write a work order to `work/tasks/municipal/road-repair-<slug>.md` with `requires-skill: dispatching-road-repair`, `assigned-crew: <crew-slug>`, `target-window: <date-range>`.
4. Notify the assigned crew through the standard crew-channel.
5. Witness the dispatch.

## Outcomes

A work order exists.
The assigned crew is on notice.
The road-maintenance budget line shows the encumbrance.
On crew completion, the work order's status moves to `done` and a completion witness fires.
