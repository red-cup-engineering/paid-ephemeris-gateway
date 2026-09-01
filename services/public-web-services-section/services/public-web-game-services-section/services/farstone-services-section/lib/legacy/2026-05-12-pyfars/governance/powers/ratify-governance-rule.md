---
title: "Ratify a governance rule below the hard core"
type: jural-relation
kind: power
active-holder: pyfars-steward
passive-party: pyfars-community
scope-action: confirm-guideline-or-lower-change
correlate-of: liability
theory-basis: [charter-as-closure-system, jural-relation, normative-operational-layering]
---


The steward may ratify a change to the guidelines, preferences, or instructions tiers of the charter — those tiers below the rules tier (C1–C5).
Ratification settles the proposed change as binding enterprise policy without triggering novation.

Per `charter-as-closure-system`, the four tiers have different fragment restrictions:

- **Rules tier (C1–C5)**: bare Π₁ fragment; amendment requires `amend-hard-core` and novation.
- **Guidelines tier (G1–G3)**: Π₁ + bounded FOL; change requires `ratify-governance-rule`.
- **Preferences tier**: Π₁ + arithmetic side-conditions; change requires steward or records-officer authority (`ratify-governance-rule` or `modify-governance-record`).
- **Instructions tier**: unrestricted Π₁ + Π₂; records officer can modify without steward review.

## What ratification produces

A `ratify-governance-rule` exercise adds a ratification witness cell to the proposed rule's record in `governance/decisions/`.
Without this cell, a proposed governance rule is a triage note or draft — the closure system does not treat it as binding.
With the cell, the rule becomes part of $\mathcal{S}_{\mathrm{op}}$ for the current operational period.

## Distinction from `amend-hard-core`

`ratify-governance-rule` is for everything below the rules tier.
It does not require three-party novation.
The steward's ratification + captain's implicit endorsement (or explicit if contested) is sufficient.
No new enterprise $\mathcal{E}'$ is created — the existing enterprise's guidelines are updated in place.

## Routine use

Most PyFARS governance decisions are ratified via this power: new decisions in `governance/decisions/`, updated skill formats, changed conventions in `governance/conventions.md`.
These are guideline-tier or below and require steward ratification but not novation.
