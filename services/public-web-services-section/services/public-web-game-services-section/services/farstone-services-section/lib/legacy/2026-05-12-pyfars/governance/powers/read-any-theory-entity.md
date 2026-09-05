---
title: "Read any theory entity in the corpus"
type: jural-relation
kind: privilege
active-holder: pyfars-theory-officer
passive-party: pyfars-substrate
scope-action: read-theory-corpus-entity
correlate-of: no-right
theory-basis: [jural-relation, normative-operational-layering]
---


The theory officer may read any entity in the theory corpus — predication-categories, predicated-work, predicated-governance, predicated-computing, AOP, FARS spec, and the PyFARS governance layer itself — without incurring a duty and without the substrate having any claim against this reading.

The breadth of this privilege is wider than the theory-derivation-officer's `read-predication-categories-entity` (which is scoped to one theory layer) because the theory officer's audit role requires cross-layer reading: assessing whether the derivation chain is intact requires reading the full chain, not just one end of it.
The theory officer must be able to compare predication-categories content with predicated-computing derivations and with FARS spec synthesis to assess whether the chain is connected and flowing.

## What this privilege is not

It is not a write privilege anywhere.
The theory officer reads to audit; it does not write theory content.
The governance layer is the one layer where the theory officer does write — triage notes and audit outputs — but those writes are covered by `create-triage-note` (a power, with a duty attached) and `audit-derivation-chain` (a power), not by this read privilege.

## Correlation

The correlate is `no-right` on the substrate: no agent or office may claim the theory officer is obligated to refrain from reading any theory entity.
The read is unconditionally permitted.

## Relationship to XO's read-any-substrate-record

The XO's `read-any-substrate-record` covers operational and work records.
The theory officer's `read-any-theory-entity` covers the theory corpus.
Both are read privileges with similar structure; they have different holders because the motivating needs differ.
The XO reads broadly to route work; the theory officer reads theory broadly to audit Γ.
