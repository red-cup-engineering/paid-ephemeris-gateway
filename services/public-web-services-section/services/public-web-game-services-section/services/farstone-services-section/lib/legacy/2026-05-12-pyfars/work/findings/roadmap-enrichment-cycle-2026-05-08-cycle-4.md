---
title: "Roadmap-enrichment cycle 4 (2026-05-08): rename horizon-cascade → roadmap-enrichment; forward-extension step added; M6/M9 substantively rescoped; M6' authored, M13 sketched"
type: finding
status: actioned
observed: [enrichment-cycle-walk-2026-05-08-cycle-4]
expected: enrichment-discipline-includes-forward-extension-and-uses-questions-substantively
variance: "the discipline as authored in cycle-1 missed the forward-extension step (each cycle's promotion enables far-future work that should be substrate-named); the verbiage 'horizon cascade' was less clear than 'roadmap enrichment'; cycles 1–3 threaded question references but did not use questions to substantively rescope milestones"
cause-configuration:
  - cycle-1-discipline-was-promotion-only-omitted-extension
  - terminology-drift-from-captain-framing
  - records-officer-was-conservative-in-using-question-content
scope: double-loop
severity: medium
contained-by: this-cycle-itself
responds-to-via: [renamed-horizon-cascade-to-roadmap-enrichment, added-forward-extension-pass, rescoped-m6-and-m9-using-questions, authored-m6prime-and-m13-as-extension]
---

# Roadmap-enrichment cycle 4

This finding is the first cycle authored under the renamed discipline.
It witnesses a **double-loop adjustment** to the discipline itself, not just operational application — the discipline now has a forward-extension step it lacked, and uses new vocabulary the captain directed.

## Observed

After cycle-3 ([`cascade-application-2026-05-08-cycle-3`](cascade-application-2026-05-08-cycle-3.md)), three discipline-shape gaps remained:

1. **Missing forward-extension step**: the discipline as authored in cycle-1 only described *promotion* (push existing fidelity closer to action); it did not describe *extension* (add new far-future work the cycle's promotion has made authorable).
  The captain identified this gap explicitly: "the missing part of our horizon cascade: adding the next step into the future that's made possible by that cycle of cascade".
2. **Suboptimal verbiage**: "horizon cascade" emphasized the *horizon* axis (which is one of three ladders) rather than the *whole-discipline* outcome (an enriched roadmap).
  The captain directed: "'roadmap enrichment' makes way more sense than 'horizon cascade'".
3. **Conservative use of question content**: cycles 1–3 threaded question references into milestone records as cross-references but did not let questions substantively rescope milestones, despite many questions arguing milestones are *bigger* than currently scoped.
  The captain directed: "I bet there's a lot of shit in the questions you can use to change the milestones".

## Expected

A discipline that fits the captain's framing across both terminology and substance: *roadmap enrichment* with promotion AND extension passes, where extension uses questions and substrate-realization gaps to grow the roadmap's reach in step with mid-arc promotion.

## Variance

(1) Discipline-shape was promotion-only, omitting extension.
(2) Vocabulary was off.
(3) Question content was used at pointer-fidelity rather than at content-fidelity.

## Cause configuration

- **`cycle-1-discipline-was-promotion-only-omitted-extension`**: when authoring the original [`horizon-cascade`](../../concepts/roadmap-enrichment.md) concept, the records officer focused on the *fidelity-violation* axis (promotion gaps) and did not yet conceptualize *reach-stagnation* as a parallel failure mode.
  The captain's framing supplied the missing axis.
- **`terminology-drift-from-captain-framing`**: "horizon cascade" was the records officer's improvisation; "roadmap enrichment" is the captain's term.
  Per memory feedback "561 — focus user's idea, not your own", the captain's vocabulary should anchor.
- **`records-officer-was-conservative-in-using-question-content`**: cycles 1–3 treated questions as exploration material that *might inform future cascade-applications*.
  The captain pointed out that questions can — and should — *change milestones now*.
  Conservative use was a misreading of "561 — focus user's idea": the questions *are* the captain's ideas; threading without substantively applying is the wrong kind of conservation.

## Response

Five corrective actions taken this cycle:

1. **Renamed the discipline**:
   - Files moved: [`concepts/horizon-cascade.md`](../../concepts/roadmap-enrichment.md) → `concepts/roadmap-enrichment.md`; [`governance/skills/applying-the-horizon-cascade.md`](../../governance/skills/applying-roadmap-enrichment.md) → `governance/skills/applying-roadmap-enrichment.md`; [`governance/duties/maintain-horizon-cascade-discipline.md`](../../governance/duties/maintain-roadmap-enrichment-discipline.md) → `governance/duties/maintain-roadmap-enrichment-discipline.md`; [`work/tasks/engineering/implement-pyfars-audit-cascade-verb.md`](../tasks/engineering/implement-pyfars-audit-roadmap-verb.md) → `work/tasks/engineering/implement-pyfars-audit-roadmap-verb.md`.
   - Cross-references updated in ~20 other files.
     Vocabulary refreshed: `cascade-violation` → `fidelity-violation`; `cascade-overspent` → `fidelity-overspent`; `the cascade advances` → `the next enrichment-cycle advances`; `pyfars audit-cascade` (CLI verb) → `pyfars audit-roadmap`.
   - Legacy findings (cycles 1–3) kept slug pattern `cascade-application-*`; the new vocabulary distinguishes pre-rename history from post-rename cycles.
     Both pattern-classes are valid history per the [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md) §"Vocabulary used elsewhere".

2. **Added the forward-extension step** to the [roadmap-enrichment concept](../../concepts/roadmap-enrichment.md), the [applying-roadmap-enrichment skill](../../governance/skills/applying-roadmap-enrichment.md), and the [maintain-roadmap-enrichment-discipline duty](../../governance/duties/maintain-roadmap-enrichment-discipline.md).
  The discipline now has *two passes*: promotion (existing milestones) and extension (newly-reachable future work).
  The discipline now identifies a third ladder — **reach** — alongside fidelity and horizon, with `reach-stagnant` as a new diagnostic.

3. **Rescoped M6 substantively** ([`m6-federation`](../milestones/m6-federation.md)): split scope explicitly into content-federation (M6's current acceptance) and coordination-federation (deferred to M6').
  The milestone's title and acceptance now state the split.
  This is *content rescope*, not just a "Related self-questions" reference.

4. **Rescoped M9 substantively** ([`m9-substrate-as-supervisor-of-layered-control`](../milestones/m9-substrate-as-supervisor-of-layered-control.md)): generalized from "supervisor of embodied control" to "substrate-precheck for high-stakes operations", with embodied-control as the first specialization.
  Goals reordered to put the general goal first, with embodied-control specialization goals after.
  Acceptance extended to cover non-embodied high-stakes operations (federation-envelope, budget-significant-invocation, accountability-totality).

5. **Authored the extension** (the new pass's work):
   - **M6' (full milestone-record)** at [`work/milestones/m6prime-coordination-federation.md`](../milestones/m6prime-coordination-federation.md) — coordination-federation layer with substrate-resident leader/quorum/lock/cluster records and $H^1$-classification audit.
     Six goals; theory-grounded in DCP theorems.
     The milestone exists at this fidelity (full record, not sketch) because the question [`distributed-coordination-primitives-for-federation`](../../questions/distributed-coordination-primitives-for-federation.md) has supplied the theory-grounding.
   - **M13 (sketch only)** in [`work/milestones/roadmap.md`](../milestones/roadmap.md) — predicated-drone-swarm theory as a precondition for M9 advancing.
     Theory work, not engineering; the records officer cannot author the full milestone-record because the predicated-drone-swarm theory itself hasn't been authored yet (it's the theory-gap the question identifies).
     Captain or theory-officer advances it.

## Observations not yet acted on

**Per memory feedback "561 — proceed without per-step confirmation"**: this cycle proceeded under the captain's authorization-by-direction-to-cycle.
The captain's specific approvals: rename (explicit), add forward-extension step (explicit), use questions to change milestones (explicit), extend roadmap into future (explicit).
All four were closed in this cycle.
No pending captain-decisions remain from this cycle's work *itself*.

**Cross-cutting question clusters still under-applied**: the *theory-API* axis ([`questions/_themes.md`](../../questions/_themes.md)) contains 5 questions whose substantive content has not yet rescoped any milestone.
These would land most naturally as M2 ([`closure-2-monad-lax-idempotence`](../../questions/closure-2-monad-lax-idempotence-and-runner-invariants.md)) or M5 ([`quantifier-adjoints-and-aggregate-workitems`](../../questions/quantifier-adjoints-and-aggregate-workitems.md)) rescopes when those milestones advance. **Deferred — wait for the prerequisite milestone to advance first.**

**Embodied-deployment arc renumbering pending**: with M13 inserted, the dependency diagram shows M13 between M8 and M9.
Whether M9–M12 should be renumbered (becoming M10–M13 with the new theory milestone as M9) or kept as-is (with M13 sitting at the end of the integer line) is a *captain decision* about roadmap-rendering.
Per memory feedback "561 — no legacy shims", renumbering would be cleaner, but it breaks every cross-reference in goal/plan/task records. **Deferred — captain decides whether the cleanup-cost is worth the readability-gain.**

## Scope

**Double-loop**: this cycle adjusted the discipline itself (added a pass; renamed the concept), not just applied it.
Single-loop applications proceed under the same discipline; double-loop adjustments change the discipline.
The cycle correctly produces a *finding-with-double-loop-scope* — future enrichment-cycles will operate under the corrected discipline.

The meta-discipline check: the records officer was authorized for double-loop work because the captain explicitly named the gap (extension-pass missing) and the verbiage drift.
Double-loop is not a power the records officer holds independently; it is exercised under captain authorization, witnessed by this finding.

## Related

- [`work/findings/cascade-application-2026-05-08.md`](cascade-application-2026-05-08.md) — cycle-1 finding (legacy slug)
- [`work/findings/cascade-application-2026-05-08-cycle-2.md`](cascade-application-2026-05-08-cycle-2.md) — cycle-2 finding (legacy slug)
- [`work/findings/cascade-application-2026-05-08-cycle-3.md`](cascade-application-2026-05-08-cycle-3.md) — cycle-3 finding (legacy slug)
- [`concepts/roadmap-enrichment.md`](../../concepts/roadmap-enrichment.md) — the renamed concept with the forward-extension step
- [`governance/skills/applying-roadmap-enrichment.md`](../../governance/skills/applying-roadmap-enrichment.md) — the renamed skill
- [`governance/duties/maintain-roadmap-enrichment-discipline.md`](../../governance/duties/maintain-roadmap-enrichment-discipline.md) — the renamed duty
- [`work/milestones/m6prime-coordination-federation.md`](../milestones/m6prime-coordination-federation.md) — M6', authored this cycle
- [`work/milestones/roadmap.md`](../milestones/roadmap.md) — updated dependency diagram, extension log, M13 sketch
