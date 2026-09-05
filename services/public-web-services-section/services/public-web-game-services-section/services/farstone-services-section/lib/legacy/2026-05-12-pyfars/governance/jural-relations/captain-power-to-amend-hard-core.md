---
title: "Captain holds the power to amend hard-core charter; PyFARS bears liability"
type: jural-relation
status: active
kind: power
active-holder: captain-emsenn
passive-party: pyfars-instance
scope-action: amend-hard-core-clause
correlate-of: pyfars-liability-to-be-bound-by-hard-core
authority-grounding: charter
norm-source: charter-amendment-procedure
---


## What this relation is

The captain holds a Hohfeldian *power* over the PyFARS instance regarding the action `amend-hard-core-clause`: i.e., the captain may unilaterally settle increments that change [charter](../charter.md) clauses C1–C5 (the hard-core commitments).
The PyFARS instance bears the correlative *liability*: it is *subject to* that power — when the captain enacts an amendment, the instance's normative system updates accordingly.

Pair: this record (the active side) and [`pyfars-liability-to-be-bound-by-hard-core`](pyfars-liability-to-be-bound-by-hard-core.md) (the passive side, when authored).

## Authority grounding

The charter document itself.
Per [charter-as-closure-system](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md), the charter is the meta-rule system that authorizes the polity's normative system.
The charter explicitly reserves to the captain the power of hard-core amendment ([`governance/powers/amend-hard-core.md`](../powers/amend-hard-core.md)).

This jural-relation record is the substrate-readable statement of that reservation: it makes the (active, passive, scope-action) tuple a substrate fact other rules can audit.

## Correlative pair

- **Active side (this record):** captain's *power* over the PyFARS instance regarding `amend-hard-core-clause`.
- **Passive side ([`pyfars-liability-to-be-bound-by-hard-core`](pyfars-liability-to-be-bound-by-hard-core.md)):** PyFARS instance's *liability* to the captain regarding the same scope-action.

Per [predgov jural-relation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md): the passive record is exactly the predicate-converse of this one, with `kind: power` rewritten to `kind: liability`.
The same scope-action; the active-holder and passive-party slots swap.

## Closure-rule consequences

When the captain enacts an amendment (a substrate write to [charter](../charter.md) under the `amend-hard-core` power), three closure rules fire over this jural-relation's cells:

1. **Authorization check.** The amendment write must be authorized by an act whose `(act, exercises-power, captain-power-to-amend-hard-core) = T`.
  Without this cell, the write fails authorization and produces a *ultra-vires* failure-witness (no settled effect).
2. **Liability propagation.** The amendment increments the liability cell on the PyFARS instance: subsequent norms that the instance must bind to update accordingly.
3. **Witness emission.** The act writes an [adjustment](../../work/adjustments/_index.md) record describing what changed, why, and under whose authority.
  The witness binds back to this jural-relation via `responds-to-power: captain-power-to-amend-hard-core`.

## Klein-four orbit

Under negation $\sim$, this power maps to *no-power* (the captain explicitly does not have authority on this scope-action — equivalent to the captain having declined the amendment).
Under conflation $-$, "no-information about the power" maps to "contested" (the power is asserted but disputed by some other authority).
Under double conjugation $\sim\circ-$, a known power maps to a contested denial — the structural content of "denying the captain's hard-core amendment power is a contradiction in terms within this polity's charter."

The Klein-four action plus `correlate-of` recovers the full Hohfeldian octuple.
In particular, the *immunity* dual (the contradictory of liability) is what an outside party would have if they were exempt from the captain's amendment authority — relevant if a federated peer has scope-immunity per their own charter.

## CALM-stable queries

- "Does the captain hold this power?" — coordination-free positive query.
  Any replica reading the cells `(R, kind, power) = T`, `(R, active-holder, captain-emsenn) = T`, `(R, scope-action, amend-hard-core-clause) = T` confirms locally.
- "Has this power been revoked?" — requires coordination.
  Confirming absence of a revocation cell is anti-monotone.

## Theory grounding

- [Predgov jural-relation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jural-relation.md) — formal definition.
- [Charter-as-closure-system](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md) — the charter is the meta-rule system this power operates under.
- [Correlate-of morphism](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/morphisms/correlate-of.md) — the predicate-converse + specialization composition that pairs this with the liability record.
