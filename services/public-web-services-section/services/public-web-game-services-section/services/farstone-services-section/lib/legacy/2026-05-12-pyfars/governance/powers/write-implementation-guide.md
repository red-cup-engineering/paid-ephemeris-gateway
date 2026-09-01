---
title: "Write an implementation guide"
type: jural-relation
kind: power
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: create-or-update-implementation-guide
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system, formality-layer]
---


The theory-derivation-officer may create or update an implementation guide under `work/implementation/`.
This is Phase 5 (Guides) of the theory-derivation loop: the final theory-layer output, translating FARS spec entities into concrete implementation tasks readable by the developer.

An implementation guide is the boundary document between the theory-derivation chain and the implementation chain.
The theory-derivation-officer produces it; the pyfars-developer reads it.
The guide's `theory-basis:` citations are the thread connecting the code that will be written to the theory that justifies it.

## What an implementation guide must contain

Per the theory-derivation loop's Phase 5 requirements:

1. **Theory-basis citations**: which FARS spec entities, AOP entities, and predicated-computing entities this guide's tasks realize.
2. **Concrete implementation tasks**: specific, actionable steps the developer can execute without additional theory interpretation.
  The guide must be legible to the developer without requiring the developer to re-derive the theory.
3. **Scope boundary**: what the guide covers and what it explicitly does NOT cover (preventing over-reaching implementation that backfills theory from code).

## Why the community has a liability

When an implementation guide is written, the developer office is obligated to read it before writing code in the guide's covered area.
The guide is not advisory — it is the authoritative input to the implementation phase.
The community's liability is the constraint that theory-grounded implementation must flow through these guides, not around them.

## Duty that attaches

- `write-in-correct-derivation-layer` fires: the write must land in `work/implementation/` and the active phase must be Phase 5.
