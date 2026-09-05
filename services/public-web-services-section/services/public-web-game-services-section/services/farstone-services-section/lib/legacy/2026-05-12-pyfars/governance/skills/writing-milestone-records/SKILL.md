---
name: "Writing milestone records"
description: "Creates a milestone record in work/milestones/ encoding a delivery threshold with goals, acceptance criteria, and theory-basis slugs. Use after all goal records for the milestone exist — milestones must follow goals, not precede them."
---


## Requirements

- deriving-pyfars-development-goals has been run and produced the goal set
- All goal records for the milestone already exist in work/goals/

## Steps

1. Check that the milestone slug is not already used (`pyfars search <slug>` + `ls work/milestones/`).
2. Write the file in work/milestones/ with frontmatter following conventions.md schema (title, type: milestone, campaign, status, goals list, acceptance).
3. Write the body: one paragraph description, acceptance checklist, goals table (slug, one-liner, status).
4. Add the milestone slug to the parent campaign record's `milestones:` list.

## Outcomes

A new file in work/milestones/ with goals listed, acceptance criteria, and a campaign link.
The campaign record references it.
