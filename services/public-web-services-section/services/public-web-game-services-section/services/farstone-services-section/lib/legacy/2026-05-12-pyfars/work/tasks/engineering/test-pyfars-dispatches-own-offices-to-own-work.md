---
title: "Test that PyFARS dispatches its own offices to its own work"
type: task
area: engineering
status: open
horizon: later
milestone: m19-self-developing-pyfars
goal: self-development-workflow
depends-on: [realize-pyfars-self-agent-records-for-six-chartered-offices, format-pyfars-self-workitems-as-workitem-subtypes, realize-pyfars-self-tool-specs-for-nineteen-chartered-skills]
requires-capabilities: [code-authoring, testing]
theory-basis: [agential-self-generation, charter-c3]
---


## Description

Stage-2 acceptance test for [M19](../../milestones/m19-self-developing-pyfars.md): with the chartered offices realized as AgentRecords, the PyFARS-self workitems formatted as Workitem subtypes, and the chartered skills realized as ToolSpecs, the engine ticks and dispatches PyFARS-self workitems to PyFARS-self offices using PyFARS-self skills — the substrate dispatches its own machinery to its own work.

The test runs the engine in a fresh substrate seeded with the M19 chartered records, posts a captain-priority workitem ("draft a proposal to add a new pyfars verb"), and asserts that: 1.
Dispatch routes the workitem to a development-class office (per the office's `requires-capabilities`).
2.
The office invokes the appropriate skill (per the skill's activation-trigger).
3.
The skill produces a modification-proposal record per [M19](../../milestones/m19-self-developing-pyfars.md)'s self-development-workflow.
4.
The witness chain is replay-deterministic.

## Acceptance

- [ ] `tests/integration/test_pyfars_self_dispatch.py` exists and runs the dispatch loop.
- [ ] The test asserts the four-step chain (route → invoke → produce → witness).
- [ ] Test passes in CI.
- [ ] A passing run produces the witness chain visible via `pyfars witnesses --workitem <slug>`.

## Progress cells

*(empty — task not yet started)*
