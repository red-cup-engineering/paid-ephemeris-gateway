---
title: "Implement runbook firing in the dispatch graph"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: runbooks-as-first-class-substrate
depends-on: [author-runbook-record-type]
requires-capabilities: [python-editing, langgraph-state-machines, dispatch-graph]
theory-basis: [workflow-composition, dispatch-readiness]
---


## Description

Extend `runtime/dispatch_graph.py` so runbooks are dispatchable: the `apply_eligibility_rules` step reads runbook records' `trigger:` patterns and emits eligibility cells when a workitem matches; `select_winners` ranks runbooks alongside skills; `invoke_agent` (renamed or generalized to `invoke_dispatchable`) executes the runbook by walking its workflow.

A runbook execution per workflow step: 1.
Read the workflow's nodes from the runbook record.
2.
For each node (a skill invocation), invoke the skill, collecting its output cells.
3.
Pass output cells as inputs to the next node per the workflow's edges.
4.
On runbook completion: emit a milestone witness; if `on-complete:` declares learning outputs, hand off to [`extend-on-complete-emission-to-learning-outputs`](extend-on-complete-emission-to-learning-outputs.md).

## Acceptance

- [ ] `apply_eligibility_rules` reads runbook records and emits per-`(workitem, runbook)` cells per the trigger match.
- [ ] `invoke_dispatchable` (or equivalent) handles both skill-shaped and runbook-shaped dispatchables.
- [ ] A linear runbook executes its skills in order and emits a runbook-completion witness.
- [ ] A branching runbook with one branch condition C executes the branch matching C's settled value.
- [ ] Tests cover linear and branching runbooks; both verified end-to-end through dispatch.

## Progress cells

*(empty — task not yet started)*
