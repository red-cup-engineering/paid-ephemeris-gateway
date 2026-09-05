---
title: "Test end-to-end: work N produces skill, work N+1 dispatches against it"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: on-complete-cycles-into-learning
depends-on: [wire-learning-outputs-into-consolidation-cycle]
requires-capabilities: [integration-testing]
theory-basis: [continuous-learning-loop]
---


## Description

The acceptance test for [`on-complete-cycles-into-learning`](../../goals/on-complete-cycles-into-learning.md) and arguably for [M5](../../milestones/m5-agential-self-generation.md) as a whole.

Setup: a workitem of class C is dispatched.
The agent completes it; the workitem's on-complete declares `author-skill: <skill-spec-improving-class-C-handling>`.
A second workitem of class C is queued.

Run: tick N (the first workitem completes; the new skill is authored).
Tick N+1 (the second workitem dispatches).

Verify: the second workitem's dispatch witness names the new skill as the selected dispatchable, and the run completes against it.

This is the load-bearing test for [Charter](../../../governance/charter.md) C3 closure.

## Acceptance

- [ ] Integration test at `tests/test_on_complete_learning_loop.py`.
- [ ] Test setup: substrate prepared with workitem class C, dispatchable that handles C, on-complete spec for skill authoring.
- [ ] Test runs two ticks in sequence in the same process (no restart).
- [ ] Test asserts: tick N's halt witness shows the new skill record was authored; tick N+1's dispatch witness names the new skill.
- [ ] Test cleanup: removes the authored skill record so subsequent test runs are clean.

## Progress cells

*(empty — task not yet started)*
