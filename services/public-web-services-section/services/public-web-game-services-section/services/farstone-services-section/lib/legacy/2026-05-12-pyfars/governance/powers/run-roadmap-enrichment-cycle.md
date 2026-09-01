---
title: "Run roadmap-enrichment cycle"
type: jural-relation
kind: power
active-holder: pyfars-roadmap-enrichment-officer
passive-party: pyfars-community
scope-action: invoke-cycle
scope: work/cycles/, claims/, governance/objects/, governance/morphisms/, concepts/
duties: [run-full-cycle-not-just-integration, cite-question-in-claim, cite-claim-in-objects-and-morphisms]
enables-skills: [running-roadmap-enrichment-cycle, authoring-objects-and-morphisms-from-claim]
theory-basis: [roadmap-enrichment, recurrent-practice, jural-relation]
---


Admits the holder to invoke the five-stage roadmap-enrichment cycle (question → research → claim → objects/morphisms → integration).
The power's grain is the cycle as a whole; internal stages are skill-level concerns governed by [`running-roadmap-enrichment-cycle`](../skills/running-roadmap-enrichment-cycle.md).

The exercise of this power produces a substrate event class — a `work/cycles/<YYYY-MM-DD>-<question-slug>.md` cycle record with witnesses for each of the five stages.
A cycle invocation that does not produce a complete cycle record is a [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) duty breach.

## Why this power has cycle-grain, not stage-grain

The cycle's discipline is its *integrity*: all five stages must run, in order, with witnesses.
Fragmenting the power into five stage-grain powers would let the dispatch graph admit only stage 5 (integration) for a workitem, which is precisely the failure mode this office exists to prevent.
By making cycle-invocation the power's grain, the substrate's eligibility-rule system enforces the integrity at the dispatch level.

Stage-grain dispatch tracking — *which* stage a particular cycle is currently in — is achieved by the cycle record's `status:` cell, not by separate powers.
The dispatch graph reads the cycle record's status to route follow-on workitems to the right next stage; the power gates the *invocation*.

## Attached duties

- [`run-full-cycle-not-just-integration`](../duties/run-full-cycle-not-just-integration.md) — the cycle's integrity guarantee.
- [`cite-question-in-claim`](../duties/cite-question-in-claim.md) — every authored claim cites the originating question.
- [`cite-claim-in-objects-and-morphisms`](../duties/cite-claim-in-objects-and-morphisms.md) — every authored object/morphism cites the originating claim.

## Enables

- [`running-roadmap-enrichment-cycle`](../skills/running-roadmap-enrichment-cycle.md) — the composite five-stage skill.
- [`authoring-objects-and-morphisms-from-claim`](../skills/authoring-objects-and-morphisms-from-claim.md) — the stage-4 skill.

## Composes with records-officer powers

This power's stage 5 (commission integration) hands off to the records officer's existing powers ([`create-milestone-record`](create-milestone-record.md), [`create-goal-record`](create-goal-record.md), [`promote-task-horizon`](promote-task-horizon.md), etc.) via [`dispatch-task-to-office`](dispatch-task-to-office.md).
The records officer exercises its own powers on its own duty stack — this office does not directly write planning records.
