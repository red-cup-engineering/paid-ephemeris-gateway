---
title: "Read any FARS spec entity"
type: jural-relation
kind: privilege
active-holder: self-theory-author
passive-party: pyfars-substrate
scope-action: read-theory-corpus-entity
scope: theories/.../flatfile-agentic-resource-system/
correlate-of: no-right
theory-basis: [jural-relation, normative-operational-layering]
---


The self-theory-author may read any entity in the FARS spec theory corpus (`flatfile-agentic-resource-system/` under agential-orchestration-platform) without incurring a duty and without the substrate having any claim against this reading.

The privilege is scoped to FARS spec because PyFARS realizes FARS — the FARS spec is the immediate parent theory PyFARS-self-theory commits against.
The self-theory-author reads the FARS spec to understand what *any* flatfile agentic resource system commits to, then authors PyFARS-side entries specifying what *this* realization commits to under the spec.

## What this privilege is not

- It is not a privilege to read predicated-computing or predication-categories (separate privileges).
- It is not a write privilege.
  The self-theory-author writes only to `pyfars/` (covered by `write-pyfars-self-theory-entity`) and to triage (covered by `write-triage-note`).
- It is not a privilege to write to the FARS spec layer.
  If self-theory authoring reveals that the FARS spec needs revision, the author files a question or triage note and defers to `theory-derivation-officer`.

## Correlation

The correlate is `no-right` on the substrate: no agent or office may claim the self-theory-author is obligated to refrain from reading any FARS spec entity.
The read is unconditionally permitted.

## Relationship to write powers

The self-theory-author has *read* access to FARS spec but no write access.
This is the load-bearing separation between self-theory authoring (PyFARS-specific commitments) and FARS-spec authoring (what any realization commits to).
Conflating the two would let the realization rewrite the spec to suit itself, which would defeat the spec's role as a binding upstream warrant.
