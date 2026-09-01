---
name: "Reading enterprise state"
description: "Produces a current snapshot of PyFARS enterprise state: hard core integrity, active task frontier, office staffing, and Γ firing status. Use at the start of every XO or steward session before processing any incoming message."
---


## Requirements

- Read access to `governance/enterprise.md`, `governance/charter.md`, `governance/offices/`
- Read access to `work/tasks/` and `work/goals/`
- Read access to `operations/engineering/triage/` (queued triage notes)

## Steps

1. Read `governance/enterprise.md`: confirm `status: active`, identify the operative-structure office list, note the generative-mechanism slug.
2. Read `work/goals/_index.md` and `work/milestones/`: identify which milestone is active and what goals are open.
  Read any `status: in-progress` task records to find the active frontier.
3. Check `operations/engineering/triage/` for triage notes with `requires-action:` set but not yet dispatched — these are queued intents waiting for the next cycle.
4. Note which offices have registered agents by checking `.claude/agents/` or equivalent harness agent records; flag any offices in the operative structure with no registered agent.

## Outcomes

A current picture of: (1) whether C is intact, (2) what work is ready to dispatch, (3) what is already in flight, (4) what is queued but unassigned.
This snapshot is the XO's watch state and the input to `interpreting-incoming-messages`.
