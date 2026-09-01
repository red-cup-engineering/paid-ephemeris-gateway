---
title: "Cascade application 2026-05-08: M2 plan-record gap closed; question-references threaded into M3/M4/M6/M9/M11"
type: finding
status: actioned
observed: [cascade-walk-2026-05-08, dropped-questions-batch-2026-05-08]
expected: cascade-fidelity-matches-horizon
variance: "M2 (horizon: soon) lacked a plan-record while M3-M8 had ship-* plans; 24 dropped self-questions in `questions/` were not yet threaded into the milestones whose scope they sharpen"
cause-configuration:
  - cascade-discipline-not-yet-load-bearing-on-plan-fidelity
  - questions-arrived-after-milestone-records-were-authored
scope: single-loop
severity: low
contained-by: this-cascade-application
responds-to-via: [author-ship-m2-plan, enrich-milestones-m3-m4-m6-m9-m11-with-question-refs]
---

# Cascade application 2026-05-08

This finding witnesses one application of the [horizon-cascade](../../concepts/horizon-cascade.md) discipline by the [`pyfars-records-officer`](../../governance/offices/pyfars-records-officer.md) per [`applying-the-horizon-cascade`](../../governance/skills/applying-the-horizon-cascade.md).
Two cascade-actions were taken; one cascade-issue is observed and deferred.

## Observed

A walk of [`work/milestones/`](../milestones/) on 2026-05-08 found:

| Milestone | Horizon | Required fidelity | Actual fidelity | Status |
|---|---|---|---|---|
| [M1](../milestones/m1-operational-housekeeping.md) | doing | tasks-with-records | tasks-with-records | OK |
| [M2](../milestones/m2-substrate-dispatch.md) | soon | plan-with-DAG | goals-only (no plan record) | **VIOLATION** |
| [M3](../milestones/m3-continuous-loop.md) | soon | plan-with-DAG | plan-with-DAG (ship-m3) | OK |
| [M4](../milestones/m4-memory-feedback.md) | later | milestone-with-goals | plan-with-DAG (ship-m4) | overspent (acceptable) |
| [M5](../milestones/m5-agential-self-generation.md) | later | milestone-with-goals | plan-with-DAG (ship-m5) | overspent (acceptable) |
| [M6](../milestones/m6-federation.md) | captured | milestone-record | plan-with-DAG (ship-m6) | overspent (deferred — see below) |
| [M7](../milestones/m7-boundary-handedness-and-outbound-endpoints.md) | captured | milestone-record | plan-with-DAG (ship-m7) | overspent (deferred) |
| [M8](../milestones/m8-inbound-participation-mcp-clients.md) | captured | milestone-record | plan-with-DAG (ship-m8) | overspent (deferred) |
| [M9](../milestones/m9-substrate-as-supervisor-of-layered-control.md) | captured | milestone-record | milestone-with-goals | OK |
| [M10](../milestones/m10-cost-and-energy-ledger-extension.md) | captured | milestone-record | milestone-with-goals | OK |
| [M11](../milestones/m11-assurance-audit-chain-export.md) | captured | milestone-record | milestone-with-goals | OK |
| [M12](../milestones/m12-cross-substrate-handoff-protocol.md) | captured | milestone-record | milestone-with-goals | OK |

In addition, 24 self-questions were authored into [`questions/`](../../questions/) by the captain, exploring axes that may sharpen specific milestones' goals or rescope milestones outright.
The questions had not yet been threaded into the milestones they bear on.

## Expected

Per [`maintain-horizon-cascade-discipline`](../../governance/duties/maintain-horizon-cascade-discipline.md), every milestone's structural fidelity should match its horizon.
Per [horizon-cascade](../../concepts/horizon-cascade.md) §"What gets promoted at each cascade-step", a milestone at `horizon: soon` requires plan-with-DAG fidelity.
The dropped questions, being substrate-resident exploration material that bears on specific milestones, should be reachable from those milestones via cross-reference rather than discoverable only by directory-scan.

## Variance

**Cascade-violation**: [M2](../milestones/m2-substrate-dispatch.md) at `horizon: soon` had goal records and tasks but no plan-record.
Plans for M3–M8 existed; M2 was skipped despite being the *only* milestone whose two remaining goals (`selection-rule-as-substrate`, `assignment-cells-written-back`) jointly settle the milestone's "Done when".
This is the canonical case the plan-record exists for: joint settlement of multiple goals.

**Substrate-discoverability gap**: The 24 questions in [`questions/`](../../questions/) were authored into the substrate but not linked from the milestones they bear on.
A future cascade-application advancing M3 from `soon` to `doing`, or M4 from `later` to `soon`, would have to discover the relevant questions by directory-scan rather than by following the milestone's substrate-resident cross-references.

## Cause configuration

- **`cascade-discipline-not-yet-load-bearing-on-plan-fidelity`**: the cascade-governance machinery was authored last session ([horizon-cascade](../../concepts/horizon-cascade.md), [maintain-horizon-cascade-discipline](../../governance/duties/maintain-horizon-cascade-discipline.md), the cascade-skills); this is its first session of application.
  The records officer hadn't yet walked all milestones for plan-fidelity gaps.
- **`questions-arrived-after-milestone-records-were-authored`**: the question files in [`questions/`](../../questions/) were dropped after the milestone records had been authored, so the milestone records had no occasion to reference them.
  The cascade-application closes this gap.

## Response

Two corrective actions were taken this session:

1. **Authored [`work/plans/ship-m2-substrate-dispatch.md`](../plans/ship-m2-substrate-dispatch.md)** — the missing M2 plan-record.
  Tasks: `author-selection-by-load-rule-record`, `implement-selection-by-load-instantiator`, `design-assignment-closure-rule`, `emit-assignment-cells-from-dispatch-graph`.
  Two parallel two-task chains (selection-rule + assignment-cells), joining at the milestone-level meet.
  Includes the "What this plan does NOT claim" section per [`author-honest-non-claims-section`](../../governance/duties/author-honest-non-claims-section.md).

2. **Threaded question-references into 5 milestone records** by adding "Related self-questions" sections:
   - [M3](../milestones/m3-continuous-loop.md) ← `operations-causal-settling-and-loop-determinism`, `saturation-threshold-and-bounded-entropy-as-runtime-caps`, `four-regime-classification-as-rule-metadata`, `graceful-degradation-as-substrate-resident-lifecycle-policy`
   - [M4](../milestones/m4-memory-feedback.md) ← `stigmergy-as-substrate-feedback-channel`, `conduct-teachings-as-instinct-evaluation`, `handoff-cobordism-and-cross-session-continuity`, `saturation-threshold-and-bounded-entropy-as-runtime-caps`
   - [M6](../milestones/m6-federation.md) ← `distributed-coordination-primitives-for-federation`, `algebraic-connectivity-as-federation-convergence-metric`, `event-triggered-synchronization-for-federation-envelopes`, `w-msr-byzantine-filter-at-federation-merge`, `beck-chevalley-as-substrate-invariant-for-jurisdiction-and-shard-moves`
   - [M9](../milestones/m9-substrate-as-supervisor-of-layered-control.md) ← `hj-reachability-and-cbf-as-substrate-precheck-primitive`, `predicated-drone-swarm-theory-as-theory-gap`
   - [M11](../milestones/m11-assurance-audit-chain-export.md) ← `cech-cocycle-audit-as-m11-primitive`

## Observations not yet acted on

**Cross-cutting questions** (theory-API and self-theory questions that don't bear on a single milestone) were not threaded into specific milestones because they don't fit:

- [`two-internal-logics-as-substrate-query-api`](../../questions/two-internal-logics-as-substrate-query-api.md) — whole-substrate query API; spans M2/M3/M4/M5
- [`closure-2-monad-lax-idempotence-and-runner-invariants`](../../questions/closure-2-monad-lax-idempotence-and-runner-invariants.md) — closure-runner optimization; spans M2/M3
- [`quantifier-adjoints-and-aggregate-workitems`](../../questions/quantifier-adjoints-and-aggregate-workitems.md) — aggregate-workitem dispatch; spans M2/M5
- [`polity-context-for-web-app`](../../questions/polity-context-for-web-app.md), [`polity-homepage-as-public-projection`](../../questions/polity-homepage-as-public-projection.md), [`public-fiber-field-vocabulary-vs-closure-rules`](../../questions/public-fiber-field-vocabulary-vs-closure-rules.md) — polity-web-presence questions; orthogonal to the M1-M12 arc
- [`kinship-substrate-for-561-polity`](../../questions/kinship-substrate-for-561-polity.md), [`rotational-authority-for-pyfars-offices`](../../questions/rotational-authority-for-pyfars-offices.md), [`restorative-vs-retributive-violation-response`](../../questions/restorative-vs-retributive-violation-response.md), [`consensus-closure-for-governing-offices`](../../questions/consensus-closure-for-governing-offices.md), [`seventh-generation-projection-and-pyfars-regime`](../../questions/seventh-generation-projection-and-pyfars-regime.md) — governance-architecture questions; bear on `governance/` rather than on the milestone arc

These warrant separate handling — perhaps a `questions/_themes.md` index that groups questions by axis (federation, memory-feedback, governance-architecture, polity-web-presence, theory-API), or per-axis briefs that the captain can use to direct future work. **Deferred to a future cascade-application**; not blocking the M3 advance.

**M6+ cascade-overspending**: M6, M7, M8 all have ship-* plan records despite being at `horizon: captured`.
Per [horizon-cascade](../../concepts/horizon-cascade.md), this is overspending — effort poured into details that may shift before prerequisite milestones ship.
The cascade does not retract overspent fidelity (the records exist; deleting them destroys substrate); but the records should carry a `revision-likely:` annotation noting which prerequisite milestones' settlement may rescope them. **Deferred**; the right time to revisit is when M5 reaches `soon` and M6 advances toward `later`.

## Scope

**Single-loop**: this finding's variance is operational (a plan record was missing; a directory's content wasn't threaded into adjacent records).
The cascade-discipline machinery itself functioned correctly — the duty fired, the skill applied, the missing record was authored.
No double-loop adjustment to the cascade governance is indicated.

## Related

- [horizon-cascade concept](../../concepts/horizon-cascade.md)
- [fidelity-level concept](../../concepts/fidelity-level.md)
- [maintain-horizon-cascade-discipline duty](../../governance/duties/maintain-horizon-cascade-discipline.md)
- [applying-the-horizon-cascade skill](../../governance/skills/applying-the-horizon-cascade.md)
- [`work/plans/ship-m2-substrate-dispatch.md`](../plans/ship-m2-substrate-dispatch.md) — the authored plan
- [`work/findings/m2-dispatch-correctness-double-loop.md`](m2-dispatch-correctness-double-loop.md) — prior M2 finding (double-loop scope; this finding is single-loop)
