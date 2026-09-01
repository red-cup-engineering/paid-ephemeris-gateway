---
title: "Derive from theory before planning"
type: jural-relation
kind: duty
active-holder: pyfars-records-officer
passive-party: pyfars-community
scope-action: encode-planning-record
triggering-powers:
  - create-milestone-record
  - create-goal-record
required-action: run-deriving-pyfars-development-goals
enforcement: substrate-violation
stronger-than: consult-predwork-before-encoding
rule-type: N→N
theory-basis: [normative-operational-layering, dispatch-readiness, task-cell-system]
---


Before creating a milestone or goal record, the officer MUST run `deriving-pyfars-development-goals` — not just consult the theory informally, but actually trace the derivation chain and name the theory slugs that ground the milestone or goal.
A milestone or goal with no `theory-basis:` in its frontmatter is an unfulfilled-duty artifact.

This duty is stricter than `consult-predwork-before-encoding`.
The general duty applies to all record creation.
This one applies specifically to planning records (milestones and goals) and requires running a named skill, not just a general review.

## Why stricter

Milestones and goals drive what gets built.
An ungrounded milestone means development is not predicated on theory — it's engineering intuition.
We can't achieve agential self-generation (the M5 objective) if the planning layer isn't itself a predication.

## Required action

1. Run `deriving-pyfars-development-goals` (see skill record).
2. Collect at least one theory slug per goal (the theory item that grounds the capability gap).
3. Include those slugs as `theory-basis:` in the goal frontmatter, or as `theory-basis:` in the milestone frontmatter if the milestone itself is the unit.
4. **Write goal records before writing task records** — tasks are leaves of goals.
  A task record that references a goal that doesn't exist yet is an ordering violation of this duty.
  If tasks were written before goals (as can happen when porting from a prose roadmap), go back and write the goal records, then update the task records to add `goal:` links.

## Ordering invariant

```
milestone → goal → task
```

Each level must exist before the level below it is written.
This is not merely convention — it is the substrate-algebraic requirement that the task's goal cells ($G_T$) reference a settled goal entity.
An unlinked task has $v^T_0$ with no `part-of-goal` cell settled, making its completion semantically incomplete.

## Enforcement

Pre-M5: manual.
The captain or a reviewing agent checks that new milestone/goal records have non-empty `theory-basis:` fields.

Post-M5: the closure rule system can check `theory-basis:` presence on all `kind: goal` and `kind: milestone` records and emit a diagnostic for any that are missing it.
