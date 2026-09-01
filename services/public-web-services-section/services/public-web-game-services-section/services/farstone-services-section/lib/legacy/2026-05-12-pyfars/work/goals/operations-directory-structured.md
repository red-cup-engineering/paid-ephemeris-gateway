---
title: "Operations directory structured"
type: goal
milestone: m1-operational-housekeeping
status: open
horizon: doing
theory-basis: [normative-operational-layering, operations-loop, dispatch-readiness]
tasks:
  - formalize-operations-directory-structure
  - reformat-skill-records-as-gerunding-phrases
---


After this goal is complete, the operations tree has three consistent domains (`engineering`, `command`, `science`) with a standard sub-layout, and skill records follow the gerunding-verb-phrase format with two-sentence descriptions that agents can parse and use.

## Theory grounding

Per normative-operational layering: the normative layer (offices, powers, duties, skills) must be navigable by the dispatch machinery's N→O rules.
If skill records don't follow a machine-readable format, the dispatch's capability matching cannot evaluate `requires-capability:` against `provides-capability:` — the normative layer is dark.

## Acceptance

- [ ] `operations/engineering/`, `operations/command/`, `operations/science/` exist.
- [ ] Each domain has consistent sub-directories: `agents/`, `groups/`, `skills/`, `projects/`, `triage/`.
- [ ] Skill records have `name:` as a gerunding verb phrase and `description:` as exactly two sentences.
- [ ] The substrate validation suite (`closure/rule/compose_rules.run`) on `operations/` shows no schema violations from skill record format.
