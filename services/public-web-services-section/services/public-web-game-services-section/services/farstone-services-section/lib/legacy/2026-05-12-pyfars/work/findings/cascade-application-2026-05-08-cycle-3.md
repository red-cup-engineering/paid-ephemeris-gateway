---
title: "Cascade application 2026-05-08 cycle 3: governance-architecture review staged; M6/M7/M8 plans annotated revision-likely"
type: finding
status: actioned
observed: [cascade-walk-2026-05-08-cycle-3]
expected: cycle-2-deferred-observations-staged-without-overreach
variance: "cycle-2 deferred two observations pending captain authorization (governance-architecture review; polity-web brief) and one cascade-overspending observation (M6/M7/M8 plans authored at horizon: captured); cycle-3 advances each as far as the records officer's standing permits without overreaching"
cause-configuration:
  - cycle-2-correctly-deferred-without-staging
  - some-cluster-already-resolved-in-substrate
scope: single-loop
severity: low
contained-by: this-cascade-application
responds-to-via: [stage-governance-architecture-review, annotate-m6-m7-m8-plans-revision-likely, observe-polity-public-projection-already-authored]
---

# Cascade application 2026-05-08 cycle 3

This finding witnesses the third cascade-application of the session, executed by the [`pyfars-records-officer`](../../governance/offices/pyfars-records-officer.md) per [`applying-the-horizon-cascade`](../../governance/skills/applying-the-horizon-cascade.md).
Three actions taken; one expected action discovered to be unnecessary.

## Observed

After cycle-2 ([`cascade-application-2026-05-08-cycle-2`](cascade-application-2026-05-08-cycle-2.md)), three deferred observations remained:

1. **Governance-architecture review unstaged** — the 5 governance-architecture questions were themed and indexed but had no review record gathering them; cycle-2 explicitly deferred this pending captain authorization.
2. **Polity-web brief unstaged** — the 3 polity-web questions were themed and indexed but had no synthesizing concept record.
3. **M6+ cascade-overspending continues** — plans for M6, M7, M8 exist despite their being at `horizon: captured`; cycle-1 and cycle-2 declined to retract these (deletion would destroy substrate) but did not annotate them with rescope-triggers.

Cycle-3 examined each:

- For (1): authoring a *staged* review record (status: open, no findings authored) advances the work without authoring the per-question findings the records officer cannot make unilaterally.
- For (2): grep of [`concepts/`](../../concepts/) and [`objects/`](../../objects/) revealed that the resolving theory entries already exist — [`concepts/public-projection.md`](../../concepts/public-projection.md), [`concepts/projection.md`](../../concepts/projection.md), [`concepts/polity.md`](../../concepts/polity.md), [`objects/polity-homepage.md`](../../objects/polity-homepage.md), [`objects/public-fiber.md`](../../objects/public-fiber.md).
  Per [`polity-homepage-as-public-projection`](../../questions/polity-homepage-as-public-projection.md)'s `status: partial`, the captain has already authored the resolving manifest.
  Authoring a new concept would duplicate.
- For (3): annotating the plans with `revision-likely: true` and explicit `revision-triggers:` is a small, durable improvement that doesn't require deletion or restructuring.

## Expected

Per [`maintain-horizon-cascade-discipline`](../../governance/duties/maintain-horizon-cascade-discipline.md), the records officer advances cascade-discipline as far as standing permits.
Cycle-3's expected actions: stage what staged-work permits, annotate what annotation permits, observe what's already settled.
Per memory feedback "561 — focus user's idea, not your own", the records officer does not preempt captain decisions; per "561 — proceed without per-step confirmation", the records officer advances authorized work without polling.

## Variance

**(1) Governance-architecture review staging**: cycle-2 said "captain authorization needed" without authoring any record that *captured* what would be in the review.
A staged review record (with `status: open` and findings-list empty) is substrate-readable preparation that makes the captain's eventual authorization decision better-informed.
Cycle-3 authors this.

**(2) Polity-web brief redundancy**: cycle-2 noted the brief was deferred.
Cycle-3 discovered the resolving theory entries already exist.
The brief is *unnecessary* — what's needed is recognition that the question is already partially resolved (per its own `status: partial`) and the work has moved into closure-rule-system specifics that the captain's polity-governance decisions will pin.
No record to author.

**(3) M6/M7/M8 cascade-overspending**: cycle-1 and cycle-2 noted the overspending without acting.
Cycle-3 acts via annotation rather than retraction: each plan acquires `revision-likely: true` in frontmatter, an explicit `revision-triggers:` list naming the prerequisite-milestones-and-question-resolutions that warrant rescope, and a body section near the top declaring the overspending honestly.
The plans remain executable when the milestones advance; the annotation makes the cascade-overspending visible rather than implicit.

## Cause configuration

- **`cycle-2-correctly-deferred-without-staging`**: cycle-2's deferrals were correct (don't preempt captain) but incomplete (didn't capture the deferred work in substrate).
  Cycle-3 closes this gap for (1) and (3) without overreaching.
- **`some-cluster-already-resolved-in-substrate`**: the polity-web concept cluster turns out to be partly resolved (the resolving theory entries exist).
  Cycle-3's discovery is itself a substrate-readability improvement: future cascade-applications won't re-stage the same brief.

## Response

Three actions:

1. **Authored [`work/reviews/governance-architecture-questions-2026-05-08.md`](../reviews/governance-architecture-questions-2026-05-08.md)** — staged review with `status: open`, `findings: []`.
  Documents each of the 5 governance-architecture questions, what records its yes-answer would touch, and the records officer's *substrate-readability-suggested* ordering for the captain (rotational-authority → restorative-vs-retributive → seventh-generation-projection → consensus-closure → kinship-substrate).
  Explicitly declines to author findings; declines to prioritize the questions for the captain.

2. **Annotated M6/M7/M8 plan-records with `revision-likely: true`** in frontmatter and added a "Revision-likely: this plan is cascade-overspent" body section near the top of each:
   - [`ship-m6-federation`](../plans/ship-m6-federation.md): triggers = M5 completion, distributed-coordination-primitives question, consensus-as-h0 question
   - [`ship-m7-outbound-endpoints`](../plans/ship-m7-outbound-endpoints.md): triggers = M6 completion, swarm-participation-handedness upstream question
   - [`ship-m8-inbound-mcp-clients`](../plans/ship-m8-inbound-mcp-clients.md): triggers = M7 completion, MCP protocol evolution, accountability-chain-totality question

The annotation makes the overspending substrate-readable; future cascade-applications can detect when triggers fire and require a revision-witness rather than silent revision.

3. **Recognized polity-web cluster as partly resolved** — declined to author the previously-planned concept, since [`concepts/public-projection.md`](../../concepts/public-projection.md) and adjacent records already exist.
  The cluster's open part (closure-rule-system specifying what's public-licit) is a captain-governance decision per [`polity-homepage-as-public-projection`](../../questions/polity-homepage-as-public-projection.md)'s "What this question does not settle" section.
  No records officer action available.

## Observations not yet acted on

**Engineering-tier theory-API concepts**: the themes-index axis "Theory-API & substrate-runtime invariants" contains 5 cross-cutting questions that span M2/M3/M4/M5.
Some of these (e.g., [`closure-2-monad-lax-idempotence-and-runner-invariants`](../../questions/closure-2-monad-lax-idempotence-and-runner-invariants.md)) describe optimization opportunities that would land in `runtime/closure_runner.py` once M3 advances.
The records officer cannot author these as runtime-engineering tasks (per CLAUDE.md "never touch `src/`") — they belong in the upstream pyfars source repo (per [`implement-pyfars-audit-cascade-verb`](../tasks/engineering/implement-pyfars-audit-cascade-verb.md)'s pattern). **Deferred — when M3 advances toward `doing`, fold into the upstream pyfars-source-engineering queue.**

**Embodied-deployment theory gap is unstaged**: [`predicated-drone-swarm-theory-as-theory-gap`](../../questions/predicated-drone-swarm-theory-as-theory-gap.md) names a theory-gap that is *itself* the precondition for M9–M12 advancing.
The records officer cannot author the predicated-drone-swarm theory unilaterally — it requires upstream theory work in the predicated-computing tree. **Deferred — captain direction needed; possibly handled by the predication-category-theory-auditor agent or a math-research thread.**

**Cycle saturation**: this is the third cascade cycle of the session.
Each cycle has produced fewer net-new actions: cycle-1 (3 substantial actions) > cycle-2 (3 substantial actions) > cycle-3 (2 substantial actions + 1 discovery-of-already-done).
Diminishing returns are appropriate — the cascade has worked through the high-leverage moves. **A fourth cycle would likely produce mostly observations awaiting captain direction; the next substantive cascade-application is appropriate when the captain authorizes a deferred review or advances a milestone.**

## Scope

**Single-loop**: cycle-3's variance is operational.
The cascade-discipline machinery functioned correctly; cycle-3's discoveries (one cluster already resolved; deferred work staged via review/annotation) are substrate-readability improvements within the existing discipline, not adjustments to it.

## Related

- [`work/findings/cascade-application-2026-05-08.md`](cascade-application-2026-05-08.md) — cycle-1 finding
- [`work/findings/cascade-application-2026-05-08-cycle-2.md`](cascade-application-2026-05-08-cycle-2.md) — cycle-2 finding
- [`work/reviews/governance-architecture-questions-2026-05-08.md`](../reviews/governance-architecture-questions-2026-05-08.md) — the review staged this cycle
- [horizon-cascade concept](../../concepts/horizon-cascade.md)
- [maintain-horizon-cascade-discipline duty](../../governance/duties/maintain-horizon-cascade-discipline.md)
