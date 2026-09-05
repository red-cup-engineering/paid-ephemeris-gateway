---
name: "Writing goal records"
description: "Creates a goal record in work/goals/ encoding one named capability gap with milestone linkage and an acceptance checklist. Use after deriving-pyfars-development-goals has produced a named goal to record."
---


## Requirements

- Parent milestone record exists in work/milestones/
- Goal name and theory-basis slug produced by deriving-pyfars-development-goals

## Steps

1. Check that no existing record in work/goals/ already covers this gap (`pyfars search <goal-slug>`).
2. Write the file in work/goals/ with frontmatter following conventions.md schema (title, type: goal, milestone, status, horizon, theory-basis).
3. Write the body: one paragraph describing the capability PyFARS gains, then an acceptance checklist.
4. Add the goal slug to the parent milestone record's `goals:` list.

## Outcomes

A new file in work/goals/ with type: goal, at least one theory-basis slug, and an acceptance checklist.
The parent milestone record references it.
