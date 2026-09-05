---
title: "Test mid-tick skill authorship and next-tick dispatch"
type: task
area: engineering
status: open
horizon: later
milestone: m5-agential-self-generation
goal: new-skill-records-dispatchable-next-tick
depends-on: [confirm-projector-rebuilds-store-on-each-tick]
requires-capabilities: [python-editing, integration-testing]
theory-basis: [agential-self-generation, projector-framework-counit]
---


## Description

Integration test: in tick N, an agent (simulated) writes a new skill record at `governance/skills/<test-gerund-phrase>.md`.
In tick N+1, a workitem matching that skill's capability/trigger is dispatched.
Verify the new skill is the dispatch target.

The test runs the full lifecycle (boot → tick → halt) twice in sequence in the same process — no Python restart, no manual reload.
The substrate update happens between ticks via direct file write.

This test is the **acceptance gate** for [`new-skill-records-dispatchable-next-tick`](../../goals/new-skill-records-dispatchable-next-tick.md).
It's also a regression-test against future refactoring: any change that breaks the per-tick projector rebuild fails this test.

## Acceptance

- [ ] Test at `tests/test_substrate_writable_skills.py`.
- [ ] The test runs two ticks; verifies new skill present in tick N+1's store; verifies it was selected as dispatch winner.
- [ ] The test cleans up its written skill record on teardown so it doesn't pollute the substrate across runs.
- [ ] CI runs the test on every change to `runtime/lifecycle.py` or `runtime/projector_framework.py`.

## Progress cells

*(empty — task not yet started)*
