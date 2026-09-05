---
title: "Implement `pyfars audit-roadmap` CLI verb"
type: task
area: engineering
status: open
horizon: later
goal: maintain-roadmap-enrichment-discipline-runtime-enforcement
requires-capabilities: [pyfars-source-engineering, substrate-graph-traversal]
depends-on: [pyfars-source-engineering-availability]
theory-basis: [roadmap-enrichment, fidelity-level, dispatch-readiness]
---


## Description

Add a new CLI verb to the [pyfars source repository](https://github.com/emsenn/pyfars) that automates [roadmap-enrichment discipline](../../../concepts/roadmap-enrichment.md) audit.
The verb walks the substrate's milestone records, computes each milestone's required-fidelity from its `horizon:` cell per the [roadmap-enrichment concept](../../../concepts/roadmap-enrichment.md)'s required-fidelity-by-horizon table, compares against actual fidelity (count of authored goal/plan/task records), and emits diagnostics for fidelity-violations.

The verb is the runtime-enforcement counterpart to the [`maintain-roadmap-enrichment-discipline`](../../../governance/duties/maintain-roadmap-enrichment-discipline.md) duty: pre-implementation, the duty is enforced manually via [`applying-roadmap-enrichment`](../../../governance/skills/applying-roadmap-enrichment.md); post-implementation, the verb produces substrate-readable diagnostics that the [`pyfars-records-officer`](../../../governance/offices/pyfars-records-officer.md) consumes.

## Behavior

`pyfars audit-roadmap` (no args): walks all milestone records, prints a table:

```
Milestone                                 Horizon      Required fidelity            Actual fidelity              Status
m3-continuous-loop                        doing        tasks-with-records           tasks-with-records           OK
m4-memory-feedback                        soon         plan-with-DAG                plan-without-DAG             VIOLATION
m9-substrate-as-supervisor                later        milestone-with-goals         milestone-only               VIOLATION
m12-cross-substrate-handoff               captured     sketch-or-milestone          milestone-with-goals         OVERSPENT
```

`pyfars audit-roadmap <milestone-slug>`: drills down on one milestone; lists each goal/plan/task and its fidelity-vs-horizon status.

`pyfars audit-roadmap --shortcode-detect`: scans planning records for shortcode patterns (`/^M\d+$/`, `/^G\d+$/`, `/task-\d+/`) per [`link-to-records-not-shortcodes`](../../../governance/duties/link-to-records-not-shortcodes.md); emits diagnostics for unlinked references.

`pyfars audit-roadmap --emit-finding`: emits a finding record per [`authoring-a-finding-record`](../../../governance/skills/authoring-a-finding-record.md) summarizing detected violations; the finding becomes substrate-readable input to subsequent cascade applications.

## Acceptance

- [ ] Verb registered in `src/pyfars/cli/__init__.py` alongside the existing 55 verbs
- [ ] Walks milestone records, computes fidelity per the [roadmap-enrichment concept](../../../concepts/roadmap-enrichment.md)'s required-fidelity-by-horizon table
- [ ] Distinguishes VIOLATION (under-authored), OVERSPENT (over-authored), OK
- [ ] `--shortcode-detect` flag scans planning-record bodies and frontmatter
- [ ] `--emit-finding` flag produces a finding record under [`work/findings/`](../../findings/) with `cascade-application-<YYYY-MM-DD>` slug
- [ ] Tests cover: normal walk, drill-down by slug, shortcode detection, finding emission
- [ ] Documentation entry in pyfars README for the new verb

## Out of scope

- Implementing the closure-rule subsystem that fires this audit on cadence — that's a separate task tied to [M3](../../milestones/m3-continuous-loop.md)'s recurrent-practice infrastructure.
- Promoting tasks automatically — promotion remains an officer-exercised power per [`promote-task-horizon`](../../../governance/powers/promote-task-horizon.md).
  The verb *detects*, the officer *acts*.

## Progress cells

*(empty — task not yet started; horizon: later because pyfars-source-engineering is held by another office, not the records officer; cascade applies to *this* repo, not to the pyfars source repo)*
