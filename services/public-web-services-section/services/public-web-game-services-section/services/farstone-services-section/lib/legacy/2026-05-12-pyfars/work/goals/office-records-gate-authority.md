---
title: "Office records gate authority via jural-relations and incumbencies"
type: goal
milestone: m5-agential-self-generation
status: open
horizon: later
theory-basis: [office-as-fuzzy-cell, office-as-double-settlement, jural-relation, jurisdiction]
tasks:
  - extend-dispatch-eligibility-to-read-office-jurisdiction
  - implement-incumbency-verification-rule
  - emit-ultra-vires-witnesses-on-out-of-jurisdiction-acts
---


After this goal, the dispatch graph's authorization check reads three substrate sources: the [office](../../governance/offices/) record (the body politic), the [incumbent](../../governance/incumbents/_index.md) record (who currently occupies it), and the [jurisdiction](../../governance/jurisdictions/) record (where the office's powers are operative).
A workitem dispatch fires only when all three settle to admit it; otherwise an *ultra vires* witness is emitted.

## Why

[M5](../milestones/m5-agential-self-generation.md) makes governance authority operative at dispatch time.
Today, dispatch authorization is implicit — the runtime trusts that whatever agent is configured for an endpoint has authority.
After this goal, authority is **substrate-derived**: the dispatch graph reads the office's jural-relations, verifies the active incumbency, checks jurisdiction scope, and only then admits the dispatch.

This is what closes [Charter](../../governance/charter.md) C3 at the dispatch boundary: governance is operative in the dispatch decision, not just in the records.

## Theory grounding

**1.
Office-as-fuzzy-cell** ([`flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/office-as-fuzzy-cell.md)).
Office records carry `authority-scope`, `duty`, `right` fields; authority is **bilattice-valued** — an office holds an authority `t`, doesn't `f`, hasn't been settled $\bot$, or has contested authorization $\top$.
The dispatch graph reads these as one of its eligibility axes; F-emission disqualifies the dispatch.

**2.
Office-as-double-settlement** ([`predicated-governance/objects/office-as-double-settlement`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/office-as-double-settlement.md)).
An office's authority is jointly settled along two axes: institution (authority conferred) and induction (possession entered).
The [incumbent](../../governance/incumbents/_index.md) record is what carries the joint settlement for a specific occupant. **Authorization checks read the incumbent's joint state, not just the office's structural cells.**

**3.
Jurisdiction as sub-base** ([`predicated-governance/objects/jurisdiction`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md)).
A power is operative within a sub-base of cells — a [jurisdiction](../../governance/jurisdictions/) record names the temporal range, predicate sub-category, and validity condition. **A dispatch on a workitem outside the office's jurisdiction is ultra vires** — the substrate emits a failure-witness and produces no settled effect on the workitem.

### Design constraints from this grounding

- **Authority check has three reads, not one.** (a) Does the office hold the required jural-relation (power)?
  (b) Is there a full incumbency (institution AND induction)?
  (c) Is the workitem within the office's jurisdiction?
  All three must settle to T; any F or $\bot$ gates the dispatch.
- **Ultra vires emission, not silent skip.** Per [predgov jurisdiction](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md) §"Ultra vires": an out-of-jurisdiction act produces a *failure-witness* `(ultra-vires-attempt, by, <office>) = T` and *no* downstream effect.
  The would-be-settled cell remains at $\bot$.
  This is substrate-visible: an auditor reads the witness and knows the act was attempted and refused.
- **Jurisdiction queries are CALM-stable on positive admit.** Confirming "is workitem W within office O's jurisdiction?" is a coordination-free positive query when settled at T.
  Confirming a *negative* (W is outside O's jurisdiction) requires coordination — it's the absence of a positive cell.
  The dispatch path is biased toward fast positive admissibility; ultra vires emerges from no positive evidence within timeout.

## Acceptance

- [ ] The dispatch graph's eligibility composition includes an `eligibility-by-office-authority` axis that reads office + incumbent + jurisdiction cells.
- [ ] A `(workitem, predicate-in, <jurisdiction's predicate-category>) = T` cell-pattern check fires per workitem, against each candidate dispatchable's office.
- [ ] When all three reads settle T: the dispatch is admitted; the executor records `(act, exercises-power, <jural-relation-slug>) = T` on the resulting execution event.
- [ ] When any read is F or $\bot$ at dispatch time: the workitem is ineligible to that office; the runtime witnesses it.
- [ ] Out-of-jurisdiction attempts (rare; would only happen if an office's jurisdiction is misconfigured) emit `(ultra-vires-attempt, by, <office>) = T` and no settled effect on the workitem.
- [ ] Tests cover: full-authority dispatch admitted, vacant office (no incumbency) blocks dispatch, in-bound jurisdiction admits, out-of-jurisdiction emits ultra-vires witness without effect.
