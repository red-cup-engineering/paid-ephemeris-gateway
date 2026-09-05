---
title: "Cascade application 2026-05-08 cycle 2: questions/_themes.md authored; M2/M5 + cross-cutting threading completed"
type: finding
status: actioned
observed: [cascade-walk-2026-05-08-cycle-2, dropped-questions-batch-2026-05-08-additional]
expected: questions-navigable-by-axis-and-reachable-from-all-relevant-milestones
variance: "the cycle-1 finding deferred two observations (cross-cutting questions had no themes index; M2 and M5 had not been threaded with their cross-cutting question references); also, between cycles 1 and 2, additional questions were dropped that the cycle-1 threading did not cover"
cause-configuration:
  - cycle-1-conservative-scope
  - new-questions-arrived-mid-session
scope: single-loop
severity: low
contained-by: this-cascade-application
responds-to-via: [author-questions-themes-index, thread-m2-m5-cross-cutting-questions, thread-newly-arrived-questions-into-existing-milestones]
---

# Cascade application 2026-05-08 cycle 2

This finding witnesses the second cascade-application of the session, executed by the [`pyfars-records-officer`](../../governance/offices/pyfars-records-officer.md) per [`applying-the-horizon-cascade`](../../governance/skills/applying-the-horizon-cascade.md) and adjacent skills.
Three actions were taken; one new deferred-observation is recorded.

## Observed

After cycle-1 ([`cascade-application-2026-05-08`](cascade-application-2026-05-08.md)), three states held:

1. The cross-cutting questions identified as deferred ([`two-internal-logics`](../../questions/two-internal-logics-as-substrate-query-api.md), [`closure-2-monad-lax-idempotence`](../../questions/closure-2-monad-lax-idempotence-and-runner-invariants.md), [`quantifier-adjoints`](../../questions/quantifier-adjoints-and-aggregate-workitems.md), [`kinship-substrate`](../../questions/kinship-substrate-for-561-polity.md), and others) had no axis-grouping index in [`questions/`](../../questions/).
2. M2 ([substrate-driven dispatch](../milestones/m2-substrate-dispatch.md)) and M5 ([agential self-generation](../milestones/m5-agential-self-generation.md)) carried no "Related self-questions" sections, despite cross-cutting questions bearing on each.
3. Between cycle-1 (earlier today) and cycle-2 (this turn), the captain authored 7 additional questions into [`questions/`](../../questions/): `accountability-chain-totality-as-m11-audit-invariant`, `consensus-as-h0-construction-as-substrate-primitive`, `coordination-bounded-by-h1-as-protocol-simplicity-cap`, `ctde-as-substrate-snapshot-training-pattern`, `federated-learning-model-deltas-vs-raw-data-for-federation`, `formation-control-rigidity-as-substrate-shape-invariant`, `masft-failure-mode-taxonomy-as-substrate-anomaly-classes`.
  None had been threaded into milestone records.

Question count grew from 24 (cycle-1) to 33 (cycle-2 excluding `_index.md`), a 38% increase — substantial enough to warrant the themes index that cycle-1 had only deferred.

## Expected

Per [`maintain-horizon-cascade-discipline`](../../governance/duties/maintain-horizon-cascade-discipline.md) and [horizon-cascade](../../concepts/horizon-cascade.md), substrate-resident questions exploring milestone scope should be reachable from those milestones via cross-reference.
Cross-cutting questions (those that span 2+ milestones) need an *additional* navigation path: an index where the question can be filed under the axis it most directly shapes, even if multiple milestones reference it.
The cycle-1 finding noted this deficit; the cycle-2 work closes it.

## Variance

**Themes-index gap**: 33 questions had no by-axis index.
Captain or future records-officer asking "which questions bear on federation?" or "what governance-architecture questions are open?" had to grep or directory-scan rather than follow a substrate-resident map.

**M2/M5 threading gap**: cycle-1 threaded M3, M4, M6, M9, M11 but not M2 or M5.
Cross-cutting questions like `closure-2-monad-lax-idempotence` (touches M2's runner) and `quantifier-adjoints-and-aggregate-workitems` (touches M2's dispatch + M5's self-generation surface) were therefore unreachable from those milestone records.

**New-questions-uncovered gap**: 7 newly-arrived questions had specific milestone-bindings their introductions made explicit (`accountability-chain-totality` → M11; `formation-control-rigidity` → M9+M11; `masft-failure-mode-taxonomy` → M3+M11; etc.) but were not yet threaded.

## Cause configuration

- **`cycle-1-conservative-scope`**: cycle-1 prioritized closing the explicit cascade-violation (M2 plan-record absence) and threading the *clearest* milestone↔question bindings.
  The themes index and the cross-cutting threading were deferred as observations rather than executed.
  This is appropriate cycle-1 discipline (focus on the highest-leverage move, defer second-order work) — the deferred observations are the cycle-2 input.
- **`new-questions-arrived-mid-session`**: the captain dropped 7 additional questions between cycles.
  The additions were detectable on cycle-2 by directory-listing; they wouldn't have been visible during cycle-1.

## Response

Three corrective actions taken this cycle:

1. **Authored [`questions/_themes.md`](../../questions/_themes.md)** — a by-axis index over all 33 questions.
  Seven axes: theory-API & substrate-runtime invariants, operations loop & determinism (M3-tier), memory feedback & learning (M4–M5-tier), federation & coordination (M6-tier), embodied deployment & safety-shield (M9–M12-tier), audit & assurance (M11-tier), governance architecture (orthogonal), polity web presence (orthogonal).
  The themes index also records *what kind of work the axis fires* (cascade-advance, governance-review, captain-direction-lateral).

2. **Threaded M2 and M5 with cross-cutting question references**:
   - [M2](../milestones/m2-substrate-dispatch.md) ← `closure-2-monad-lax-idempotence`, `quantifier-adjoints`, `two-internal-logics`, `four-regime-classification`
   - [M5](../milestones/m5-agential-self-generation.md) ← `quantifier-adjoints`, `ctde-as-substrate-snapshot-training-pattern`, `two-internal-logics`

3. **Threaded newly-arrived questions into existing milestone "Related self-questions" sections**:
   - [M3](../milestones/m3-continuous-loop.md) ← `masft-failure-mode-taxonomy-as-substrate-anomaly-classes`
   - [M4](../milestones/m4-memory-feedback.md) ← `ctde-as-substrate-snapshot-training-pattern`
   - [M6](../milestones/m6-federation.md) ← `consensus-as-h0-construction-as-substrate-primitive`, `coordination-bounded-by-h1-as-protocol-simplicity-cap`, `federated-learning-model-deltas-vs-raw-data-for-federation`
   - [M9](../milestones/m9-substrate-as-supervisor-of-layered-control.md) ← `formation-control-rigidity-as-substrate-shape-invariant`
   - [M11](../milestones/m11-assurance-audit-chain-export.md) ← `accountability-chain-totality-as-m11-audit-invariant`, `formation-control-rigidity-as-substrate-shape-invariant`, `masft-failure-mode-taxonomy-as-substrate-anomaly-classes`, `consensus-as-h0-construction-as-substrate-primitive`

Each milestone's "Related self-questions" section now ends with a pointer to [`questions/_themes.md`](../../questions/_themes.md) so the navigation is bidirectional.

## Observations not yet acted on

**Governance-architecture review is unstaged.** The themes index identifies five questions clustered under *governance architecture* ([`kinship-substrate`](../../questions/kinship-substrate-for-561-polity.md), [`rotational-authority`](../../questions/rotational-authority-for-pyfars-offices.md), [`restorative-vs-retributive`](../../questions/restorative-vs-retributive-violation-response.md), [`consensus-closure-for-governing-offices`](../../questions/consensus-closure-for-governing-offices.md), [`seventh-generation-projection`](../../questions/seventh-generation-projection-and-pyfars-regime.md)) that cluster around whether PyFARS's current governance shape (Hohfeldian / Markov-aggregating / retributive-implicit) matches 561's stated commitments.
These warrant a [review](../reviews/) gathering them, but the records-officer cannot author the review unilaterally — it requires the captain's authorization given that the resulting findings would update [`governance/`](../../governance/) directly. **Deferred — captain decision needed; the records officer can stage the review when authorized.**

**Polity-web brief is unstaged.** The three polity-web questions ([`polity-context-for-web-app`](../../questions/polity-context-for-web-app.md), [`polity-homepage-as-public-projection`](../../questions/polity-homepage-as-public-projection.md), [`public-fiber-field-vocabulary-vs-closure-rules`](../../questions/public-fiber-field-vocabulary-vs-closure-rules.md)) describe live operational work (561.group is serving today).
They warrant near-term attention but per memory feedback **"561 — don't invent adjacent scope"**, the records officer does not propose a lateral milestone (e.g., MW1) without captain direction. **Deferred — captain direction needed.**

**M6+ cascade-overspending continues to apply.** Cycle-1 noted plans authored for M6, M7, M8 despite their being at `horizon: captured`.
Cycle-2 did not retract these (deletion would destroy substrate).
The right time to revisit is when M5 reaches `soon`. **Deferred — same as cycle-1.**

## Scope

**Single-loop**: this finding's variance is operational.
The cascade-discipline machinery functioned correctly; what was needed was *more applications* of it, not adjustments to it.
The themes-index pattern (per-axis grouping for cross-cutting questions) is a small extension of the cascade discipline and is now substrate-realized via [`questions/_themes.md`](../../questions/_themes.md); future cycles can iterate on it without governance-record revision.

## Related

- [`work/findings/cascade-application-2026-05-08.md`](cascade-application-2026-05-08.md) — cycle-1 finding
- [`questions/_themes.md`](../../questions/_themes.md) — the themes index authored this cycle
- [horizon-cascade concept](../../concepts/horizon-cascade.md)
- [maintain-horizon-cascade-discipline duty](../../governance/duties/maintain-horizon-cascade-discipline.md)
- [applying-the-horizon-cascade skill](../../governance/skills/applying-the-horizon-cascade.md)
