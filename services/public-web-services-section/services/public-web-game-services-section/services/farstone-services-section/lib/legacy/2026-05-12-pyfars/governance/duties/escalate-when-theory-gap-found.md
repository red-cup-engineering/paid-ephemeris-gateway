---
title: "Escalate when derivation reveals an upstream theory gap"
type: jural-relation
kind: duty
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: respond-to-theory-gap
triggering-powers:
  - write-predicated-computing-entity
required-action: file-upstream-question-and-stop
enforcement: substrate-violation
rule-type: N→O
theory-basis: [normative-operational-layering, jural-relation]
---


When, during Phase 2 (deriving into predicated-computing), the officer discovers that the derivation cannot proceed because the predication-categories material is missing, incomplete, or contradictory, the officer MUST stop the derivation and escalate — not backfill.

Backfilling means writing a predication-categories entity from inside the derivation phase.
This violates the authority chain: the theory-derivation-officer holds no power to write in predication-categories, and the derivation loop's authority depends entirely on deriving *from* a sound predication-categories base, not *constructing* it.

## Required action

1. File a triage note in `operations/engineering/triage/` documenting the gap:
   - What predication-categories slug is missing or incorrect
   - What predicated-computing derivation was blocked
   - What open question needs to be answered upstream
2. Set `requires-action: lift-to-predication-categories` in the triage note.
3. Stop the current loop cycle.
  Do not continue to Phase 3, 4, or 5 with a shaky derivation.

The triage note will route to `predication-category-theory-researcher` (or the captain) to address the upstream gap.
Once the gap is closed and committed, the next loop audit will pick up the corrected predication-categories entity and the derivation can proceed.

## Why not backfill

The mathematical integrity of the derivation chain is the reason the loop produces trustworthy engineering content.
Short-circuiting the chain produces: - Predicated-computing entities whose `depends-on:` targets don't exist or don't say what the entity claims they say - A false appearance of theoretical grounding - Downstream FARS spec and implementation content that looks derived but isn't

The closure rule system (post-M5) will flag dangling `depends-on:` references automatically.
Until then, enforcing this duty manually is the only safeguard.

## Privilege exception

The captain may grant a one-time privilege to write a provisional placeholder in predication-categories, clearly marked `status: provisional`, if a time-critical derivation cannot wait.
The placeholder counts as satisfying this duty only if it is itself grounded (references an existing theorem or concept at the predication-categories level as a basis for the provisional claim).
Placeholders without grounding are still violations.
