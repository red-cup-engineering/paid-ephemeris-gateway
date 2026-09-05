---
name: "Publishing meeting minutes"
description: "Indexes and publishes council meeting minutes to the public registry within 5 business days of the meeting. Use after each regular or emergency council meeting whose minutes have been drafted."
---


## Requirements

- A draft minutes record under `operations/triage/draft-minutes/`
- The corresponding meeting record (date, attendees, agenda)
- Authorization from the records-clerk office

## Steps

1. Read the draft minutes; verify completeness (motions, votes, attendees, public-comment summary).
2. Cross-reference vote tallies against the resolution records; flag any inconsistency.
3. Write the published minutes to `governance/decisions/minutes/<meeting-date>.md` with full vote rolls and a one-paragraph summary.
4. Update the public registry index to surface the new minutes.
5. Witness the publication; verify it landed within 5 business days of the meeting (Charter Article I C3).

## Outcomes

Published minutes exist in the public registry.
The Charter Article I C3 transparent-deliberation commitment is upheld for this meeting.
If publication exceeded the 5-day window, a charter-binding-violation entry is filed automatically.
