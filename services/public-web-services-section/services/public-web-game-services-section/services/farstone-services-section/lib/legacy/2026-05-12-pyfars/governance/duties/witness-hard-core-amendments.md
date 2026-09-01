---
title: "Witness every amendment to the hard core"
type: jural-relation
kind: duty
active-holder: pyfars-steward
passive-party: pyfars-community
scope-action: attest-hard-core-amendment
triggering-powers:
  - amend-hard-core
required-action: produce-novation-witness
enforcement: substrate-violation
rule-type: N→O
theory-basis: [enterprise, normative-operational-layering, jural-relation, charter-as-closure-system, delegation-as-authority-residuation]
---


Every amendment to C — the enterprise's hard core — requires a novation witness record produced by the steward personally.
Per `delegation-as-authority-residuation`, accountability does not transfer down the chain: the steward cannot delegate this witnessing to the XO or to a functional office.
The witness is the steward's $H^0_t$-invariant accountability cell for the enterprise's constitutive commitments.

## What a hard-core amendment is

An amendment to C is a change to any of the five constitutive commitments (C1–C5) in the charter's rules tier.
It is not: - a change to the guidelines tier (G1–G3) — that requires steward approval, not novation - a change to the preferences or instructions tiers — those are below steward-review threshold - a task completion or code change — those produce operational witnesses, not normative amendments

An amendment that happens without a novation witness is not merely undocumented — it is a charter violation.
The substrate's closure rules fire a governance-rule diagnostic when a `hard-core-amendment` event appears in the event log without a corresponding steward-signed witness.

## Required witness content

A novation witness for a hard-core amendment must record:

1. **What is being amended**: which commitment (C1–C5), what the current formulation is, what the proposed formulation is.
2. **The three-party consent**: per `enterprise`, novation requires three parties.
  For PyFARS: the steward proposes, the captain ratifies, and a corpus witness (a timestamped commit with the amendment record) attests.
3. **Why**: the reason the amendment is necessary.
  An amendment without a recorded rationale is evidence of institutional corruption — the hard core is being changed for reasons that cannot be articulated against the theory stack.
4. **What this terminates**: per `enterprise`, amending C creates a new enterprise with a different hard core.
  The witness must acknowledge whether the amendment constitutes novation of the enterprise (new $\mathcal{E}'$) or falls within the existing hard core's scope by re-interpretation.

## The distinction between novation and amendment

Not all charter changes are hard-core amendments.
The steward must assess which tier is being changed:

- **Rules tier** (C1–C5): novation required; this duty fires; three-party consent.
- **Guidelines tier** (G1–G3): governance decision required; steward approval + captain ratification, but not full novation.
- **Preferences/instructions tier**: steward or records-officer authority; no novation.

## Enforcement

Pre-M5: manual.
The captain reviews the steward's witnessing record on any change touching the charter's rules tier.

Post-M5: the closure rule system checks that any event modifying a C1–C5 cell has a downstream `novation-witness` cell produced by the steward's incumbent, co-signed by the captain.
A missing or unsigned witness produces a governance-rule diagnostic.
