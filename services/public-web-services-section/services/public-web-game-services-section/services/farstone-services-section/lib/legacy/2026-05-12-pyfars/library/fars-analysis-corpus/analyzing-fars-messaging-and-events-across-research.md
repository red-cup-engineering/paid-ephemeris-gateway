---
title: "Analyzing FARS messaging and events across research"
specialization: analysis
feature: messaging-and-events
description: "How entities communicate, how events are recorded, how channels work. Collected from all software research."
date-created: 2026-04-07
informs: [system-architecture-refactor, messaging-channel-infrastructure, operations-loop]
software-sources:
  - analyzing-how-bussard-informs-development-of-fars
  - analyzing-how-messaging-systems-informs-development-of-fars
  - analyzing-how-openhands-informs-development-of-fars
  - analyzing-how-everything-claude-code-informs-development-of-fars
---

How should entities communicate?
How should state changes be recorded?

## What each software teaches

**Bussard:** Ship-server via socket events.
Ship-station via typed message channels (`love.thread.newChannel()`).
SSH sends `{op: "stdin"}`, receives `{op: "stdout"}`.
Each message type is named.

**Messaging systems survey:** Kafka — event log IS the database, state derived by replay.
NATS — lightweight pub/sub.
ActivityPub/Matrix — federated messaging through shared protocol.
Erlang/OTP — actor model, each process has own state, communicate via messages.
CRDTs — concurrent merges without conflicts.

**OpenHands:** Every action and observation is an event in a stream.
State derived from event stream, not maintained separately.

**ECC:** Hooks fire on tool events (pre/post).
Communication between harness and agent is through tool calls and hook responses.

## The consensus principle

**Events are the source of truth.
State is derived.
Channels are named.** Every system agrees: - State changes produce events (not the other way around) - The event stream is authoritative; derived state can be recomputed - Messages flow through named channels/topics, not point-to-point - Message format is typed (op, payload, sender, channel, timestamp)

## FARS predication pattern

Every event in events.jsonl should have:
```yaml
timestamp: ISO-8601
action: settlement | assignment | completion | failure | ...
subject: entity-id
actor: office-id
channel: dispatch | events | bridge | learning | ...
```

The `channel` predicate decouples producer from consumer.
An office that records events doesn't need to know who reads them — it writes to a channel.
An office that reads events doesn't need to know who produced them — it reads from a channel.

The entity-actor model: `message(entity, payload)` IS message passing.
The entity's fiber IS its state.
Settlement IS the actor processing a message.
The algebra IS the protocol.

## Origin tracking

**LPMud:** Every `call_other()` carries an origin tag — `ORIGIN_CALL_OTHER`, `ORIGIN_LOCAL`, `ORIGIN_DRIVER`.
Functions check `origin()` before allowing privileged operations.
Security policy is origin-aware.

**ECC:** Governance-capture produces structured events with session correlation and severity.

Events should carry an `origin` predicate: which office, hook, or process caused this event.
This makes the event stream debuggable — when something goes wrong in an autonomous session, you can trace any action to its source by following the origin predicate.

## What's NOT consensus

- Whether events should be ordered (Kafka yes, NATS eventual) — for us: events.jsonl is ordered by append time
- Whether the event stream should be per-entity or global — for us: global stream with entity-id as filter
- Whether channels should be entities themselves — the messaging-foundations spec says yes
