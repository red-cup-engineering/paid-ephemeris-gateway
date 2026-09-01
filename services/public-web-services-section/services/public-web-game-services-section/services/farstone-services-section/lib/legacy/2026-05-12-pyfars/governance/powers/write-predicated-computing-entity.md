---
title: "Write a predicated-computing entity"
type: jural-relation
kind: power
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: create-or-modify-predicated-computing-entity
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---


The theory-derivation-officer may create or modify an entity in the `theories/.../predicated-computing/` theory layer.
The community has a liability: the written entity becomes part of the theory corpus, settles citation relationships, and is citable by downstream layers.

This power is scoped to Phase 2 of the theory-derivation loop: Derive.
It is exercised only when the active loop phase is Phase 2 and the triage note in play has `requires-action: derive`.
Exercising it in any other phase is a `write-in-correct-derivation-layer` duty violation.

## What the community's liability means

When a predicated-computing entity is written, it enters the theory corpus with the theoretical weight of that layer.
Downstream phases (Phase 3 — Lift, Phase 4 — Synthesize) are obligated to treat the new entity as a derivation input.
The community cannot selectively ignore a written entity while treating its dependencies as valid.
If the entity is wrong, it must be explicitly revised or retracted via a new write (asserting a corrective amendment), not silently bypassed.

## Duty that attaches

- `write-in-correct-derivation-layer` fires: the write must land in `theories/.../predicated-computing/` and the active phase must be Phase 2.
- `escalate-when-theory-gap-found` fires if writing the entity reveals a missing or incorrect predication-categories dependency.
  In that case, the officer must stop, file a question upstream, and not backfill predication-categories from within the predicated-computing layer.
