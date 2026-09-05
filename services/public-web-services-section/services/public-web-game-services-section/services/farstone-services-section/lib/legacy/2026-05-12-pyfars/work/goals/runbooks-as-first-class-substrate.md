---
title: "Runbooks as first-class substrate"
type: goal
milestone: m5-agential-self-generation
status: open
horizon: later
theory-basis: [workflow, plan, four-layer-rule-architecture]
tasks:
  - author-runbook-record-type
  - implement-runbook-firing-in-dispatch-graph
  - test-runbook-composition-from-skills
---


After this goal, a *runbook* is a substrate record at `governance/runbooks/<slug>.md` carrying a triggering predicate, context (office, jurisdiction, required capabilities), and a body of skill invocations composed as a [workflow](../workflows/_index.md).
The dispatch graph fires runbooks the same way it fires skills — they're a different shape, not a different mechanism.

## Why

Today, multi-step procedures live in skill records (which are atomic) or in implementation guides (which are documentation).
Neither lets the dispatch graph **execute** a multi-step procedure as a single dispatchable unit.
A runbook fills that gap: a single dispatchable that, when fired, runs an ordered sequence of skill invocations with state passed cell-to-cell.

Runbooks also enable agential authorship of new procedures: an agent completing a workitem can write a new runbook record, and the next tick's dispatch graph can fire it.
This closes one of the load-bearing paths in [M5](../milestones/m5-agential-self-generation.md)'s acceptance.

## Theory grounding

**1.
Runbook-as-workflow** ([`predicated-work/objects/workflow`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/workflow.md)).
A runbook is structurally a [workflow](../workflows/_index.md) — a directed graph of work units (skill invocations) with $\tau_{\mathrm{in}} = \tau_{\mathrm{out}}$.
Treating runbooks as workflows means the same composition theorems apply: sequence, branch, parallel; CALM-stable boundary admissibility; regime classification.
The runbook's record points at a [workflow](../workflows/_index.md) record (or *contains* the workflow's frontmatter inline) for the algebraic content; the runbook adds the dispatch-relevant context (trigger, office, capabilities).

**2.
Four-layer rule architecture** ([`flatfile-agentic-resource-system/concepts/four-layer-rule-architecture`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/four-layer-rule-architecture.md)).
Substrate (data) → schema (predicates) → behavior (rules) → surface (UI). **Runbooks live at layer 3 (behavior).** Making them substrate-writable means an agent at layer 3 can author new layer-3 content — agential self-generation operating within its layer.

**3.
Workflow-composition theorem** ([`predicated-work/theorems/workflow-composition`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/workflow-composition.md)).
Runbook composition (sequence/branch/parallel of skill invocations) inherits the algebraic content of workflow composition. **A runbook composed of strict-regime skills is itself strict-regime.** This is what guarantees runbooks complete in bounded time when their constituent skills do.

### Design constraints from this grounding

- **Runbook records reference, not embed, skills.** A runbook's body is a workflow whose nodes name skill records by slug.
  The skill records remain the source of truth for each step's procedure; the runbook only sequences them.
- **Trigger predicates are declared, not implicit.** The runbook frontmatter carries a `trigger:` cell-pattern that the dispatch graph reads as an additional eligibility axis: a workitem matches a runbook iff the trigger pattern matches the workitem's cells.
  Without explicit triggers, dispatching to runbooks is non-deterministic.
- **Per-step normative profile.** Each skill invocation in the runbook generates duty cells on the assigned agent (per O→N rule).
  The runbook record's normative profile is the join over its constituent skills' profiles.
  At runbook completion, residue accounting follows the [plan-completion-as-meet](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/plan-completion-as-meet.md) corollary.

## Acceptance

- [ ] A `runbook` record type exists at `governance/templates/runbook.md` with frontmatter declaring `trigger`, `office`, `capabilities`, and `workflow` (slug or inline).
- [ ] [`governance/specifications/directories.md`](../../governance/specifications/directories.md) names `governance/runbooks/` as a canonical location.
- [ ] The dispatch graph's eligibility rules read runbook records: a workitem matching a runbook's trigger is dispatch-eligible to that runbook (with the runbook treated as a dispatchable).
- [ ] When a runbook fires, the dispatch graph executes its workflow: each skill invocation produces an execution event, the runbook's overall completion produces a milestone witness.
- [ ] An agent can author a new `governance/runbooks/<slug>.md` mid-tick; the next tick's projector loads it and the dispatch graph fires it on a matching workitem.
- [ ] Tests cover: linear runbook (sequence), branching runbook (with branching condition), runbook authoring during a tick + firing on next tick.
