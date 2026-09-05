---
title: "Peer records and trust levels"
type: goal
milestone: m6-federation
status: open
horizon: captured
theory-basis: [sovereign-node, jurisdiction]
tasks:
  - author-peer-record-type
  - author-trust-level-norms
  - implement-peer-record-loading-into-engine
---


After this goal, each PyFARS engine carries `type: peer` substrate records under `governance/peers/` declaring its known federated nodes: their sovereign identity (content-hash of their charter), their addresses, their trust level (full / scoped / observer), and the sync-scope predicate-pattern that constrains what predicates federate with each peer.

## Why

Federation isn't homogeneous — different peers have different relationships.
A peer running the same charter under the same captain federates everything; a peer running a sister charter (different polity, related domain) federates only certain predicates; a peer that just observes federates none of its own writes back.

Peer records make these relationships substrate-declared, not implicit in code.
The federation cycle reads peer records to determine what to send, what to accept, what to reject.

## Theory grounding

**1.
Sovereign-node** ([`flatfile-agentic-resource-system/concepts/sovereign-node`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/sovereign-node.md)).
Each peer is a sovereign; the relationship between sovereigns is mutual recognition, not subordination. **A peer record is the local engine's settled assertion that the peer exists and is trusted to a stated degree.** It does not authoritatively define the peer; the peer's own charter does.

**2.
Jurisdiction restriction at peer boundary** ([`predicated-governance/objects/jurisdiction`](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theories/predicated-governance/objects/jurisdiction.md)).
The trust level + sync-scope on a peer record defines a [jurisdiction](../../governance/jurisdictions/) restriction at the federation boundary: predicates outside scope don't propagate; trust-level limits which predicates the peer's writes can authorize.
This is the predgov-level realization of "federation but not totally."

### Design constraints from this grounding

- **Trust levels are substrate-declared, not negotiated at runtime.** The local engine decides what trust to extend to a peer; the decision is in a peer record's `trust-level:` cell.
  Negotiating runtime would be ad-hoc and unverifiable; substrate-declaration is auditable.
- **A peer's writes are F-disqualified outside their declared sync-scope.** Per the goal record, a federated write that lands outside the peer's sync-scope is treated like an out-of-jurisdiction act: the local engine emits ultra-vires-from-peer; the cell doesn't propagate.
- **Mutual peer records are the norm.** Both engines should carry peer records of each other for the relationship to be properly bidirectional.
  Asymmetry (A trusts B but B doesn't trust A) is allowed but should be substrate-witnessed (the asymmetric peer's record carries `mutual: false` or equivalent).

## Acceptance

- [ ] A `peer` record type exists at `governance/templates/peer.md`.
- [ ] [`governance/specifications/directories.md`](../../governance/specifications/directories.md) names `governance/peers/` as a canonical location.
- [ ] Trust levels are documented as norms at [`governance/norms/`](../../governance/norms/_index.md): full-trust, scoped-trust, observer-only.
- [ ] The federation cycle (next goal's territory) reads peer records to determine envelope routing.
- [ ] Tests cover: peer record authoring, sync-scope enforcement, trust-level norm violations.
