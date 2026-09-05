---
title: "Immunity from non-captain hard-core amendment attempts"
type: jural-relation
kind: immunity
active-holder: pyfars-steward
passive-party: pyfars-community
scope-action: amend-hard-core
correlate-of: disability
theory-basis: [jural-relation, military-command-chain-as-modal-composition, charter-as-closure-system, enterprise]
---


The steward bears an immunity from having C amended by any office or agent below the captain in the authority chain.
The correlate is a *disability* on those offices: they have no power to amend C.
The 561 polity → captain authority is the only source from which an amendment to C can be ratified; the steward proposes, but only the captain ratifies.

## Hohfeldian structure

Per `jural-relation`, an immunity has: - `active-holder` (the office bearing the immunity): pyfars-steward - `passive-party` (those from whom the protection flows): the rest of the pyfars-community below the captain - `scope-action` (what cannot be imposed): `amend-hard-core` - `correlate-of`: disability — the passive parties have no power to do what the immunity shields against

## Theoretical grounding

Per `military-command-chain-as-modal-composition` (part c, chain-of-command bound): $\Diamond_{R^{r_{i+1}}} u \leq_t \Diamond_{R^{r_i}} u$ — a delegate's authorized continuations are a subset of the principal's.
By induction, no rank's authority exceeds the captain's.
Since C-amendment is the captain's power (delegated to the steward via the proposal mechanism, but the captain's ratification is required), no office below the captain has authority over C.

Per `charter-as-closure-system`, the rules tier (C1–C5) uses the bare $\Pi_1$ fragment.
Amending the rules tier requires `amend-hard-core` (the steward's proposal power) plus captain ratification.
The structural impossibility of amending C without that two-party consent is what the immunity formalizes: any attempt to amend C by an office not in the steward+captain pair is structurally blocked.

## What this immunity does NOT cover

- It does not protect against guideline-tier amendments (G1–G3) — those use `ratify-governance-rule`, which the steward holds unilaterally.
- It does not protect against amendments at the preferences or instructions tier — those are records-officer territory.
- It does not protect against the captain amending C directly (with or without steward proposal).
  The captain's authority is above the steward's; the immunity flows downward, not upward.

## Why this is encoded as a substrate immunity

A naive reading might say: "the steward simply doesn't grant C-amendment power to anyone below it, so an immunity record is redundant."
But the immunity's substrate-algebraic content is *detection*: an attempted C-amendment by a non-captain office produces a $\top$-valued cell on the immunity-violation predicate.
The closure-rule system reads this as a contradiction — the immunity says the cell cannot move while the attempted-amendment increment says it must — and fires a governance-rule diagnostic.
Without the immunity record, the substrate has no way to distinguish "no amendment happened" from "an amendment was attempted and silently dropped."
