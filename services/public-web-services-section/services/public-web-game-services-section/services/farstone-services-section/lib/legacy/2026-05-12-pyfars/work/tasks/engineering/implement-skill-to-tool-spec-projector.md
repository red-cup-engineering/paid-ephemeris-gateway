---
title: "Implement the skill→tool-spec projector"
type: task
area: engineering
status: open
horizon: doing
milestone: m5-agential-self-generation
goal: new-skill-records-dispatchable-next-tick
depends-on: [author-runbook-record-type]
requires-capabilities: [code-authoring, projector-framework]
theory-basis: [projector-framework-counit, charter-as-closure-system]
---


## Description

Implement the projector that takes a substrate `skill-record` and produces a `tool-spec` the dispatch graph can invoke.
The projector's `body_kind:` discriminator on the skill record selects the projection: `command` skills project to a single-shot subprocess invocation; `runbook` skills project to a sequence-of-skill-invocations spec; `composite` skills project to a runbook embedding other skills.

The projector runs at boot discovery and on-substrate-write dynamic registration: when a new skill record is authored mid-tick, the projector fires on the next tick boundary, registers the resulting tool spec into the dispatch graph's tool registry, and the next dispatch pass sees the new tool.
No Python restart needed — this is the substrate-residency commitment for skills.

The projector satisfies the counit law: projecting a skill to a tool-spec and rendering the tool-spec back to a skill record produces a skill record byte-identical to the original (modulo canonical-form sorting).
Verified by property test.

## Acceptance

- [ ] `pyfars/runtime/projectors/skill_to_tool.py` implements the projector with the three `body_kind` cases.
- [ ] The projector is registered in the projector framework's registry; `pyfars list-projectors` shows it.
- [ ] Boot discovery walks `governance/skills/<slug>/` paths and registers each as a tool-spec.
- [ ] On-substrate-write hook fires the projector when a `skill-record` cell is written; new tool-spec appears in the dispatch graph's registry on next tick.
- [ ] A test in `tests/runtime/test_skill_to_tool_projector.py` asserts byte-identical round-trip for command, runbook, and composite body-kinds.

## Progress cells

*(empty — task not yet started)*
