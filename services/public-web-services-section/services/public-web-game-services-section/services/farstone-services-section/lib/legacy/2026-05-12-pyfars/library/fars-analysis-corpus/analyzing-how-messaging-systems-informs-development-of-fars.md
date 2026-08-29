---
title: "Analyzing how messaging systems (Kafka, NATS, Matrix, ActivityPub, Erlang/OTP) inform development of FARS"
specialization: analysis
subject: messaging-systems
subject-description: "Survey of real-world messaging infrastructure — Kafka, NATS, RabbitMQ, ActivityPub, Matrix, Erlang/OTP, IPFS, event sourcing, CRDTs — as models for agentic coordination."
date-created: 2026-04-07
library-analysis: library/theories/engineering/theories/tech/theories/computing/texts/tech-messaging-systems-for-agentic-systems.md
informs: [system-architecture-refactor, distributed-system, messaging-channel-infrastructure, federated-movement-coordination]
---

# Analyzing How Messaging Systems Inform Development of FARS

## What This Survey Covers

Kafka (log-based streaming), NATS (lightweight pub/sub), RabbitMQ (traditional queuing), ActivityPub (federated social), Matrix (decentralized messaging), Erlang/OTP (actor model), IPFS (content-addressed), event sourcing (append-only state), CRDTs (conflict-free replicated data types).

## Principles for FARS Predication

### 1.
Log-based messaging: events are the source of truth Kafka: the event log IS the database.
State is derived by replaying events. **FARS application:** events.jsonl is Kafka-pattern.
The EAVT graph is a materialized view derived from parsing files.
If events.jsonl and the graph diverge, events.jsonl is authoritative.
Entity status should be derivable from events.

### 2.
Content-addressed messages (IPFS pattern) IPFS: data is addressed by its content hash, not by location.
Same content → same address everywhere. **FARS application:** Entity-index uses content hashes.
`content-hash` on every entity is the IPFS pattern.
Two identical entities anywhere in the graph have the same hash.
Deduplication is free.

### 3.
CRDTs for concurrent settlement CRDTs: data types where concurrent updates merge without conflicts.
The merge operation is commutative, associative, idempotent. **FARS application:** The bilattice knowledge-join (∨_k) IS a CRDT merge.
Two observers who independently see different evidence about an entity can merge their observations via ∨_k and get a consistent result.
This is what makes federation possible — the algebra IS the CRDT.

### 4.
Actor model: entities are actors, messages are messages Erlang/OTP: lightweight processes that communicate via message passing.
Each process has its own state.
No shared mutable state.
Supervision trees handle failures. **FARS application:** The entity-actor model.
Each entity IS an actor.
`message(entity, payload)` IS message passing.
The entity's fiber IS its state.
Settlement IS the actor processing a message and updating its state.
Supervision = the department tick checking its contents.

### 5.
Federation: sovereign nodes coordinating through shared protocol ActivityPub/Matrix: independent servers that federate through a shared protocol.
Each server is sovereign.
Messages flow between servers via the protocol. **FARS application:** The confederacy model.
Each ship is a sovereign FARS instance.
Ships federate through the adjoint algebra — ∨_k merge for evidence accumulation, ⊙/⇒ for composition/restriction across ship boundaries.
The algebra IS the federation protocol.

### 6.
Named channels with typed messages All systems use named topics/channels/rooms with typed messages.
Producers and consumers are decoupled by the channel name. **FARS application:** The `channel` predicate on events and messages.
Named conduits (dispatch, events, bridge, learning) that producers and consumers reference.
Decoupling through channel names, not direct office-to-office wiring.

## See also

- [Messaging systems survey](../../../../../library/theories/engineering/theories/tech/theories/computing/texts/tech-messaging-systems-for-agentic-systems.md) — full survey
- [Messaging channel infrastructure plan](../plans/messaging-channel-infrastructure.md) — the implementation plan
