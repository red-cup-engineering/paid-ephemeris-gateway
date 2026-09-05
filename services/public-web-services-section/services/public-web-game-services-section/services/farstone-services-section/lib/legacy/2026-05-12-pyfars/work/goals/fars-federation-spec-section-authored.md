---
title: "FARS federation spec section authored before implementation begins"
type: goal
milestone: m6-federation
status: open
horizon: captured
theory-basis: [federation-by-value-domain-join, charter-as-closure-system]
tasks:
  - draft-fars-federation-spec-section
  - review-spec-against-closure-merge-commutation-lemma
  - publish-fars-federation-spec-as-rfc
---


After this goal, the [FARS spec](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) carries an authored federation section: peer-discovery semantics, sovereignty boundaries, sync scopes, conflict-resolution rules, replay correctness across federated engines.
The spec is published before the wire transport is implemented; theory precedes code.

## Why

[M6](../milestones/m6-federation.md)'s acceptance is "predication added on host A appears on host B after the next federation cycle".
That's a *behavioral* acceptance; the *correctness* acceptance is that the behavior holds under arbitrary message-delivery ordering.
The closure-merge commutation lemma already guarantees the algebra; what doesn't yet exist is the spec for how the algebra interacts with peer addressing, scopes, and sovereignty.

Authoring the spec before the wire transport is a discipline: it ensures the implementation realizes a theory rather than the theory chasing implementation choices.

## Theory grounding

**1.
Federation-by-value-domain-join** ([Charter](../../governance/charter.md) C4; FARS [`_index.md`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)).
The substrate's bilattice cellwise $\vee_k$ IS the federation protocol; a separately-engineered synchronization layer is unnecessary. **The spec's job is to write down the discipline that makes the lemma operationally usable**, not invent new mechanisms.

**2.
Closure-merge commutation lemma** (FARS `runtime/federation.py` docstring; [`flatfile-agentic-resource-system/_index.md`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md)). $\mathrm{cl}_p(\mathrm{cl}_p(X) \vee_k Y) = \mathrm{cl}_p(X \vee_k Y)$. **Two engines federating reach the same closed store from the same input regardless of merge order.** The spec must preserve this property; any deviation is a bug in the spec.

**3.
Charter-as-closure-system under federation** ([`predicated-governance/theorems/charter-as-closure-system`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/theorems/charter-as-closure-system.md)).
When two engines federate, **their charters must be jointly compatible** for the federation to be sound.
The spec covers: charter-equivalence requirements, charter-divergence handling, federation under charter amendment.

### Design constraints from this grounding

- **The spec specifies the discipline; the algebra is fixed.** Cellwise $\vee_k$ doesn't change; what changes is how peers exchange envelopes, how scopes are negotiated, how conflict resolution is recorded.
- **Sovereign-node identity is content-hash-addressed.** Per [`content-hash-addressing`](content-hash-addressing.md), each engine has a sovereign identity not tied to its host's hostname or IP — a content hash of its charter + boot identity.
  This makes federation portable across hosts without losing identity.
- **Sync scopes are substrate-declared.** A peer relationship has a `sync-scope:` cell-pattern declaring what predicates federate.
  Out-of-scope cells stay local.
  This is what lets two engines federate dispatch while keeping per-engine private state private.

## Acceptance

- [ ] A draft spec exists at the FARS theory's `governance/specifications/federation.md` (or analogous path).
- [ ] The spec covers: peer-discovery, sovereign-node identity, content-hash-addressing, sync scopes, federation-envelope shape, conflict-resolution under $\top$ cells, charter compatibility, replay correctness.
- [ ] The spec cites the closure-merge commutation lemma as its correctness foundation.
- [ ] The spec reviews against the [`closure-merge commutation lemma`](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/_index.md) (verifying preservation, not deriving anew).
- [ ] The spec is published as an RFC; downstream implementation tasks reference it.
