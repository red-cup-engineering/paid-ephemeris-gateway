---
name: "Interpreting incoming messages"
description: "Classifies an incoming message into a work-item type and routes it to the correct enterprise layer. Use after reading enterprise state, before queuing any intent or creating any record."
---


## Requirements

- Current watch state from `reading-enterprise-state`
- The incoming message text or event

## Steps

1. Determine **work-item type**: is this a task (concrete action needed), a question (inquiry requiring research or decision), an FYI (no action needed but worth witnessing), an intent (a goal to pursue without a specific task), or an escalation (requires authority above XO level)?
2. Determine **enterprise layer**: does this concern C or governance (→ steward), Γ or theory derivation (→ theory-derivation-officer), engineering implementation (→ pyfars-developer), work records (→ records-officer), or operational routing (→ XO handles directly)?
3. Check **routing feasibility**: is the relevant goal active in `work/goals/`?
  Is the relevant office staffed?
  If the goal doesn't exist yet, the message implies creating one — that is a records-officer or steward task, not direct routing.
4. Produce a **classification record**: what the message was, what type it was classified as, which layer it belongs to, and what the next action is.
  This record is the input to `queuing-intents` and discharges the `witness-every-classification` duty.

## Outcomes

A classification record naming the work-item type, enterprise layer, target office, and recommended next action (triage note / task record / direct intent / no action + witness).
Ready for `queuing-intents`.
