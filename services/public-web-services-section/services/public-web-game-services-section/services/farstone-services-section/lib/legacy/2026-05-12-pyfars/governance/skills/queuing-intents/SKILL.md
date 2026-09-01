---
name: "Queuing intents"
description: "Creates the right substrate record to route a classified message: a triage note, a task record, or a direct intent queue entry. Use after interpreting an incoming message."
---


## Requirements

- Classification record from `interpreting-incoming-messages`
- Write access to `operations/engineering/triage/`, `work/tasks/`, and the substrate intent queue

## Steps

1. Choose output type based on classification:
   - **Triage note** (`operations/engineering/triage/`): use when classification is confident but routing is uncertain, or when the required `requires-action:` value maps to a loop phase skill.
     Set `type: idea`, `status: triage`, `domain:`, `summary:`, `requires-action:` per the triage-note convention.
   - **Task record** (`work/tasks/<area>/`): use when the work is specific enough to be an actionable task with a clear acceptance criteria.
     Set `type: task`, `area:`, `goal:`, `requires-skill:` or `requires-capability:`.
   - **Direct intent**: use when an existing dispatchable skill matches exactly and the work should be picked up on the next heartbeat without classification delay.
     File directly in the intent queue.
2. Write the record with the classification record's routing information in its frontmatter.
3. Confirm the `witness-every-classification` duty is discharged: the created record itself serves as the witness in current PyFARS (pre-M5).

## Outcomes

One substrate record (triage note, task, or queued intent) per incoming message.
The active frontier or intent queue is updated.
The `witness-every-classification` duty is discharged for this message.
