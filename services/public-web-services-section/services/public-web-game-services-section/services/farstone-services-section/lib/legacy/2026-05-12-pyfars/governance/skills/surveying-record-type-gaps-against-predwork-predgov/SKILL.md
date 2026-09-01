---
name: "Surveying record-type gaps against PredWork and PredGov"
description: "Audits the substrate's `governance/` and `work/` directories against the PredWork and PredGov theory stacks to identify missing record-type directories or under-realized record-types. Use when extending PyFARS into a new sub-domain, when refactoring after a directory schema change, or when the captain asks 'what record-types are we missing?'"
---


## Requirements

- The [PredWork](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/) and [PredGov](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/) theory stacks are readable.
- The current state of [`work/`](../../work/) and [`governance/`](../) is enumerable.
- The [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md) and [fidelity-level concept](../../concepts/fidelity-level.md) are understood — the survey distinguishes "missing because not yet realized" from "missing because not yet needed".

## Steps

1. **Enumerate PredWork's named entities.** Read [`theories/.../predicated-work/objects/`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/) and [`theories/.../predicated-work/concepts/`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/).
  Capture the list of object-slugs and concept-slugs.

2. **Enumerate PredGov's named entities.** Read [`theories/.../predicated-governance/objects/`](../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/) and `theories/.../predicated-governance/concepts/`.
  Capture the list of object-slugs and concept-slugs.

3. **Enumerate substrate's current realizations.** List [`work/`](../../work/) subdirectories and [`governance/`](../) subdirectories.
  For each, the directory name corresponds to a record-type that PyFARS realizes.

4. **Map theory-entities to realizations.** For each PredWork or PredGov object/concept, determine:
   - **Realized**: a substrate directory exists and contains records (e.g., `predwork:plan` → [`work/plans/`](../../work/plans/))
   - **Realized as concept-only**: a [`concepts/<slug>.md`](../../concepts/) file exists but no work or governance directory does
   - **Unrealized**: no substrate directory or concept file exists for this entity
   - **Schema-extension pending**: directory is named in [`governance/specifications/directories.md`](../specifications/directories.md) but doesn't yet exist on disk (e.g., `boundaries/`, `endpoints/` per M7)

5. **Check fidelity of realized record-types.** For each realized record-type, sample one or two records and verify they match the [`_index.md`](../../work/) frontmatter schema; flag schema drift.

6. **Identify gaps that block current or near work.** Cross-reference unrealized entities against [`work/milestones/roadmap.md`](../../work/milestones/roadmap.md) at horizons `soon` and `doing` — if a milestone names a workitem-type that has no realization, the gap is blocking.
  Per [`maintain-roadmap-enrichment-discipline`](../duties/maintain-roadmap-enrichment-discipline.md), the gap is a fidelity-violation.

7. **Author a survey record** under [`work/surveys/`](../../work/surveys/) summarizing: which entities are realized, which are concept-only, which are unrealized, which are schema-extension-pending, which gaps are blocking.
  The survey is the witness for this skill's invocation.

8. **For each blocking gap**: author a task per [`writing-task-records`](writing-task-records.md) for the substrate-extension work, with theory-basis citing the PredWork or PredGov entity that should be realized.

## Outcomes

A new survey record in [`work/surveys/`](../../work/surveys/) with structured rows mapping theory-entities to realization-state.
Tasks for blocking gaps are queued.
Non-blocking gaps are documented for future enrichment-cycles.

## Discipline notes

- **Don't realize entities prematurely.** Per CLAUDE.md's "Don't add features beyond what the task requires", an unrealized PredWork entity is *fine* if no current or near work needs it.
  Realization is a substrate-extension *cost*; pay it when the work warrants.
- **Concept-only realization is legitimate.** Some PredWork entities (e.g., [`recurrent-practice`](../../concepts/) in concept form, before the engine fires it) live as concept-only realizations.
  The concept describes the role; the directory comes when records are needed.
  Don't bulk-create empty directories with `_index.md` files just to "complete the schema".
- **Schema drift between `_index.md` and actual records is a finding.** If [`work/observations/_index.md`](../../work/observations/_index.md) declares a frontmatter schema that authored observation records don't follow, file a finding per [`authoring-a-finding-record`](authoring-a-finding-record.md) — the index is authoritative; records that drift from it are substrate-violating.
- **The survey is itself a recurrent practice candidate.** Per the [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md), substrate-extension auditing should fire on a cadence (perhaps quarterly).
  Once the engine implements scheduled findings, author a [`recurrent-practice`](../../work/recurrent-practices/) for "substrate-realization-survey" that fires this skill.
