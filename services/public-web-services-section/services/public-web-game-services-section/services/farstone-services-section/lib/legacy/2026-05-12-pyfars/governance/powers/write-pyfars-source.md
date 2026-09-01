---
title: "Write PyFARS source code"
type: jural-relation
kind: power
active-holder: pyfars-developer
passive-party: pyfars-community
scope-action: create-or-modify-src-files
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, formality-layer, charter-as-closure-system]
---


The developer may create or modify files under `src/`.
The community has a liability: code written in the exercise of this power becomes the substrate's running implementation — it shapes what C1–C5 mean in execution.
The community is bound by what the developer writes insofar as the code realizes the FARS spec.

## Preconditions

Per `derive-from-theory-before-planning`, this power may only be exercised after the developer has read the relevant section of the current implementation guide.
Code written before consulting the guide is written under a violated duty, regardless of whether the code is otherwise correct.

## Scope restriction

This power covers `src/` exclusively.
The developer does not hold write power over: - `governance/` — governance records (records officer's domain) - `theories/` — theory corpus (theory-derivation-officer's domain) - `work/implementation/` — implementation guides (theory-derivation-officer's domain) - `work/tasks/`, `work/goals/`, etc. — except `create-task-record` for engineering subtask breakdown

## Formality-layer application

Per `formality-layer`, not every exercise of this power requires the same agent capability:

- **Deterministic-script layer**: routine edits (reformatting, renaming, CRUD on existing patterns) that are fully specified by the implementation guide and require no judgment.
- **Classifier layer**: structured but pattern-following changes where the guide's specification is clear but the exact code shape requires matching existing conventions.
- **Frontier-model layer**: novel substrate operations, architectural decisions, debugging cases where the implementation guide says what to achieve but not how.

Escalating to a higher formality layer than the task requires produces unnecessary cost.
Failing to escalate when the task genuinely requires judgment produces substrate violations.

## Duties that attach

- `derive-from-theory-before-planning`: must read the implementation guide before writing.
- `write-in-correct-derivation-layer`: writes must land in `src/`; mixing theory changes into source commits is a layer violation.
