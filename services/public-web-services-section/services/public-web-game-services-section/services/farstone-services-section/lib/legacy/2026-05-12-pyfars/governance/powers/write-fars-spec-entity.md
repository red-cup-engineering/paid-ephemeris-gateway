---
title: "Write a FARS spec entity"
type: jural-relation
kind: power
active-holder: theory-derivation-officer
passive-party: pyfars-community
scope-action: create-or-modify-fars-spec-entity
correlate-of: liability
theory-basis: [jural-relation, normative-operational-layering, charter-as-closure-system]
---


The theory-derivation-officer may create or modify an entity in the `theories/.../flatfile-agentic-resource-system/` theory layer.
This is Phase 4 (Synthesize) of the theory-derivation loop: synthesizing AOP entities into FARS spec content — the concrete specification that constrains PyFARS's implementation.

Scoped to Phase 4.
Exercising this power outside Phase 4 is a `write-in-correct-derivation-layer` duty violation.

## What FARS spec content is

FARS spec entities are the specification layer: they instantiate AOP entities into the concrete flatfile-agentic-resource-system context.
Where an AOP entity says "a dispatch morphism satisfying property P", a FARS spec entity says "the pyfars `work dispatch` command implementing that morphism must behave as follows."
The spec is actionable by the developer; the AOP layer is not.

## Duty that attaches

- `write-in-correct-derivation-layer` fires: the write must land in `theories/.../flatfile-agentic-resource-system/` and the active phase must be Phase 4.
- `escalate-when-theory-gap-found` fires if synthesizing reveals a gap in the AOP layer.
  Stop; file the gap upstream.
