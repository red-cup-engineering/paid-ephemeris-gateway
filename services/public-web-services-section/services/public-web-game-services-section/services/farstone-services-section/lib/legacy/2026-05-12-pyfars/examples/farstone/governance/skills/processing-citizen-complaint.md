---
name: "Processing citizen complaint"
description: "Routes a citizen-filed complaint to the appropriate office, schedules investigation, and acknowledges the complainant. Use whenever a citizen complaint dispatch intent appears in triage."
---


## Requirements

- A citizen-complaint dispatch intent in `operations/triage/dispatch-intents/`
- Authorization from any office whose `jurisdiction-write` includes `operations/triage/`

## Steps

1. Read the complaint payload (location, nature, complainant contact).
2. Classify by nature: infrastructure (route to public-works), safety (route to building-safety or fire), administrative (route to records-clerk), other.
3. Write a workitem record to `work/tasks/municipal/<complaint-slug>.md` with the receiving office's required-skill in `requires-skill:`.
4. Update the dispatch intent's status to `claimed` and add `claimed-by: <office-slug>`.
5. Acknowledge the complainant through the records clerk (a public-record entry suffices; SMS/email is out of scope for this skill).

## Outcomes

The complaint becomes a routed workitem.
The dispatch intent's lifecycle moves from `pending` to `claimed`.
The receiving office is dispatchable on the next tick.
