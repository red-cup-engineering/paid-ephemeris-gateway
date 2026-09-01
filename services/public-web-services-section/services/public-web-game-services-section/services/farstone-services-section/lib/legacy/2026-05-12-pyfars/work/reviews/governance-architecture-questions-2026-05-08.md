---
title: "Governance-architecture questions review (staged)"
type: review
status: open
scope: "Five clustered questions in `questions/` that ask whether PyFARS's current governance shape (Hohfeldian / Markov-aggregating / retributive-implicit / civilian-pluralist / Scott-continuous Γ) matches 561's stated commitments. The review *gathers* the questions and surfaces structural implications; it does NOT author per-question findings (those require captain authorization)."
cadence: one-shot
findings: []
covers-period: "2026-05-08"
authored-by: pyfars-records-officer
---


This review is **staged** — it surfaces the question cluster and stages the analysis the captain needs to authorize before the records officer drills into per-question findings.
The review's `findings:` cell is empty by design; per the [reviews index](_index.md), a review with no findings is a *container* awaiting content.
This particular container declares what content *would* fill it under different captain decisions.

## Scope

Per [`questions/_themes.md`](../../questions/_themes.md) §"Governance architecture", five questions in [`questions/`](../../questions/) cluster around whether PyFARS's *current* governance shape is the *right* shape for 561 as a polity for Black Liberation and Indigenous Sovereignty:

1. [`kinship-substrate-for-561-polity`](../../questions/kinship-substrate-for-561-polity.md) — should the substrate's *primary indexing structure* be kinship rather than Hohfeldian offices?
2. [`rotational-authority-for-pyfars-offices`](../../questions/rotational-authority-for-pyfars-offices.md) — should office incumbency rotate through eligible personnel rather than being held permanently?
3. [`restorative-vs-retributive-violation-response`](../../questions/restorative-vs-retributive-violation-response.md) — should substrate-violation response follow restorative-accountability rather than the implicit retributive frame?
4. [`consensus-closure-for-governing-offices`](../../questions/consensus-closure-for-governing-offices.md) — should the parallel-governing-offices structure be modeled as consensus-closure rather than civilian-pluralism?
5. [`seventh-generation-projection-and-pyfars-regime`](../../questions/seventh-generation-projection-and-pyfars-regime.md) — should PyFARS's Γ generative mechanism be lifted to transfinite-bounded via seventh-generation projection?

This review does **not** cover engineering-arc questions (M-tier theory-API, federation, embodied-deployment) — those are threaded into milestone records per [`cascade-application-2026-05-08`](../findings/cascade-application-2026-05-08.md) and [`cascade-application-2026-05-08-cycle-2`](../findings/cascade-application-2026-05-08-cycle-2.md).

## Method

- Read the five question records.
- Cross-reference against existing governance records: [`governance/offices/`](../../governance/offices/), [`governance/jural-relations/`](../../governance/jural-relations/), [`governance/duties/`](../../governance/duties/), [`governance/norms/`](../../governance/norms/), [`governance/charter.md`](../../governance/charter.md), [`governance/decisions/`](../../governance/decisions/).
- Identify what existing records each question's *yes-answer* would update or supersede.
- Stop short of authoring findings — per [`work/findings/_index.md`](../findings/_index.md), a finding makes a structured judgment with cause-configuration; doing this for governance-architecture decisions overreaches the records officer's authority.
  The captain decides governance-architecture; the records officer prepares the substrate so the decision can be made well.

## Each question's structural implications

### 1. Kinship-substrate-for-561-polity

**Asks**: should the substrate's primary indexing be kinship-based (per `governing-by-kinship`) rather than Hohfeldian (the math-program default)?

**Yes-answer impact**: structural — touches *every* governance record.
Office records gain kinship-eligibility predicates; authority chains route through kinship rather than office; consensus becomes kinship-restricted.
The records officer cannot effect this without captain authorization.

**Records affected** (under yes-answer): [`governance/offices/*`](../../governance/offices/) (every office gains kinship-eligibility); [`governance/jural-relations/*`](../../governance/jural-relations/) (correlative pairs route along kinship rather than office-binding); [`governance/charter.md`](../../governance/charter.md) (a structural commitment may need to be added).

**The hard part**: 561 is a *confederacy*, not a single indigenous nation.
The question's body explicitly notes this: "whose kinship structure indexes whose work?"
Polycentric-polity composition (per `polity`'s polycentric-temporal-BC condition) is the candidate machinery, but the records officer cannot decide *whose* tradition the substrate inherits.

### 2. Rotational-authority-for-pyfars-offices

**Asks**: should office incumbency rotate rather than be held permanently?

**Yes-answer impact**: moderate — adds rotation-cadence cells to office records, adds a `rotation-eligible:` predicate, may produce a recurrent-practice for rotation-driving.
Less structural than kinship-substrate; can coexist with the current office machinery.

**Records affected** (under yes-answer): [`governance/offices/*`](../../governance/offices/) (each office declares its rotation policy); [`governance/incumbents/*`](../../governance/incumbents/) (incumbents acquire term-end cells); a new [`recurrent-practice`](../recurrent-practices/) for rotation cadence; possibly a duty for the rotation-driving office.

**Note**: this is the *narrowest* of the five questions and could plausibly be answered yes or no without large governance restructuring.
It may be the right *first* question to settle if the captain wants to make incremental progress.

### 3. Restorative-vs-retributive-violation-response

**Asks**: should substrate-violation response (the language used by `witness-every-classification`, `maintain-watch`, etc.) follow restorative-accountability rather than the implicit retributive frame?

**Yes-answer impact**: language and process — duty records' enforcement language changes; a restorative-response runbook would be authored; the framing of substrate-violation findings (their `responds-to-via:` adjustments) changes.
No deep structural change to office or kinship machinery.

**Records affected** (under yes-answer): duty records (especially `witness-every-classification`, `maintain-watch`, `write-in-correct-derivation-layer`); a new runbook (`runbooks/restorative-response-for-substrate-violation`); finding records' adjustment-language conventions.

**Subtle point**: a yes-answer here is *largely cultural* — the substrate would still detect violations the same way; what changes is how the polity *responds* to them.
The records officer can stage this once authorized; the captain's decision is largely about polity values rather than substrate algebra.

### 4. Consensus-closure-for-governing-offices

**Asks**: should the parallel-governing-offices structure (steward, XO, theory-officer) be modeled as consensus-closure rather than as `military-command-chain-as-modal-composition`'s civilian-pluralism?

**Yes-answer impact**: focused on the three governing offices and their relations; touches the [`three-governing-offices-in-parallel`](../../governance/decisions/three-governing-offices-in-parallel.md) decision specifically.
May produce a new decision record superseding it.
Structural for those three offices; doesn't cascade to other offices.

**Records affected** (under yes-answer): [`governance/decisions/three-governing-offices-in-parallel.md`](../../governance/decisions/three-governing-offices-in-parallel.md) (superseded by a consensus-closure framing); the three governing-office records may add consensus-closure cells; possibly a new norm requiring multi-office settlement for certain decision classes.

**Theoretical anchor**: this question converges with [`consensus-as-h0-construction-as-substrate-primitive`](../../questions/consensus-as-h0-construction-as-substrate-primitive.md) (filed under federation).
If both questions answer yes, consensus becomes a uniform substrate primitive used at the federation tier *and* at the governing-office tier — a substrate simplification.

### 5. Seventh-generation-projection-and-pyfars-regime

**Asks**: should PyFARS's Γ generative mechanism (currently classified Scott-continuous: Markov aggregation) be lifted to transfinite-bounded via seventh-generation projection?

**Yes-answer impact**: changes the enterprise record's regime classification, may require new aggregation-cells implementing the seventh-generation projection, may surface as a finding that the current regime classification is wrong.

**Records affected** (under yes-answer): [`governance/enterprise.md`](../../governance/enterprise.md) (regime classification update); the [recurrent-practice records](../recurrent-practices/_index.md) using Markov aggregation may need to declare whether they retain Markov or lift to seventh-generation; a new finding witnessing the regime change.

**Theoretical depth**: this is the most mathematical of the five questions and the one that most plausibly *the records officer can stage independently* (it's about regime classification, which is substrate-readable).
A captain authorization to "look into this" would let the records officer survey current Γ usage without committing to changes.

## Summary

The five questions divide structurally into:

- **Most-structural**: kinship-substrate (touches every record).
  Decision-shaped only.
- **Moderate-structural**: consensus-closure-for-governing-offices, seventh-generation-projection (touch specific record families).
- **Cultural / process**: rotational-authority, restorative-vs-retributive (touch language and process more than algebra).

A pragmatic ordering for the captain:

1. **Rotational-authority** (narrow, can coexist) — incremental answer that doesn't constrain later structural decisions.
2. **Restorative-vs-retributive** (cultural / language) — can be answered without further substrate work.
3. **Seventh-generation-projection** (regime classification) — records officer can stage analysis with light captain authorization.
4. **Consensus-closure-for-governing-offices** (structural for 3 offices) — structurally bound to question 1.
5. **Kinship-substrate** (most structural) — requires the deepest captain reflection.

This ordering is *suggested by the records officer for substrate-readability*; the captain may have polity-value reasons to take the questions in a different order (e.g., kinship-first because it's the most polity-defining).

## What this review does NOT do

- It does **not** author per-question findings.
  Each question, when the captain authorizes deeper review, would produce one or more findings that judge variance between current governance and the question's framing, with cause-configuration and adjustment-routing.
  Those findings touch governance records directly; authoring them without captain authorization overreaches.
- It does **not** propose governance-record edits.
  Per memory feedback "561 — focus user's idea, not your own", the records officer surfaces the structure of the question cluster but does not preempt the captain's structural decision.
- It does **not** prioritize the questions for the captain.
  The pragmatic ordering above is suggested by *substrate-readability* (which questions are answerable in narrow scope first), not by polity-value-priority.

## Status

`open` — awaiting captain direction on whether to advance to per-question findings and at what depth.
The review's `findings:` cell will be populated as findings are authored under captain authorization.

## Related

- [`questions/_themes.md`](../../questions/_themes.md) §"Governance architecture" — the index that surfaces this cluster
- [`work/findings/cascade-application-2026-05-08.md`](../findings/cascade-application-2026-05-08.md) — cycle-1 finding deferred this review
- [`work/findings/cascade-application-2026-05-08-cycle-2.md`](../findings/cascade-application-2026-05-08-cycle-2.md) — cycle-2 finding noted the deferral was unstaged; this review closes that observation
