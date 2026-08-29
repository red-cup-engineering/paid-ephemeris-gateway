---
title: "Analyzing FARS federation and distribution across research"
specialization: analysis
feature: federation-and-distribution
description: "How multiple FARS instances coordinate — federation protocol, CRDT merges, sovereign nodes, content addressing. Collected from all software research."
date-created: 2026-04-07
informs: [distributed-system, federated-movement-coordination]
software-sources:
  - analyzing-how-messaging-systems-informs-development-of-fars
  - analyzing-how-mud-autonomous-worlds-informs-development-of-fars
  - analyzing-how-bussard-informs-development-of-fars
---

How should multiple FARS instances coordinate — ships in a fleet, groups in a confederacy?

## What each software teaches

**Messaging systems:** ActivityPub/Matrix — independent servers federate through shared protocol.
Each sovereign.
Kafka — log-based event streaming for state replication.
Erlang/OTP — actor model with supervision trees.
CRDTs — conflict-free merge without coordination.

**MUD autonomous worlds:** On-chain state replicated to off-chain databases for fast querying.
Authoritative store + derived indexes.
Modules add systems without modifying existing code.

**Bussard:** Each star system is a separate server.
Players connect/disconnect.
Portals link systems.
Ship state persists when the player disconnects (autopilot takes over).
New systems created by standing up new servers with portal links.

## The consensus principle

**Federation is sovereign nodes communicating through a shared algebra.
The algebra IS the protocol.** Our bilattice knowledge-join (∨_k) is a CRDT.
Two ships that independently observe the same entity can merge observations via ∨_k without conflict.
Composition (⊙) and restriction (⇒) operate across ship boundaries the same way they operate within a ship.
The adjoint algebra IS the federation protocol — no separate federation layer needed.

## FARS predication pattern

The confederacy model maps directly: - Each ship is a sovereign FARS instance (authoritative over its own entities) - Ships federate through the adjoint algebra (∨_k merge for evidence, ⊙/⇒ for composition) - The confederacy's directives are predicates that all ships share - Content-hash addressing (IPFS pattern) ensures same entity = same hash across ships - Bussard's portal pattern: connecting to another ship = loading its entity-index and composing across graphs

## What's NOT consensus

- Whether federation should be real-time (Matrix) or eventual (ActivityPub) — for us: eventual is fine, ships operate autonomously
- Whether state replication should be full (MUD framework) or partial (NATS subjects) — for us: partial, scoped by the connecting entity's authorization fiber
- Whether there should be a global ordering (Kafka) or no ordering (CRDTs) — for us: CRDTs, since ∨_k is commutative and associative
