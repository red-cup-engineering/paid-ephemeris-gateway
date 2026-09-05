---
type: object
class: channel
status: draft
name: Inter-Office
kind: inter-office
description: "Office-to-office command and response channel. Routes messages between offices in the same polity."
emit-policy: "any office"
read-policy: "subscribed offices"
retention: durable
ordering: causal
message-schema: "{ from: office-slug, to: office-slug, kind: command | response | request | reply, payload: object }"
depends-on: [channel, message, subscription]
---

# Inter-Office channel

The polity's office-to-office command and response stream.
When the Office of Command issues a directive to the Office of Engineering, the directive lands here as a Message; the engineering office is subscribed and picks it up on the next tick.

## Routing

Messages on inter-office carry `to: <office-slug>` in their payload, narrowing delivery to the named recipient.
Broadcasts are admissible (with `to: null`) when an office wants every other office to see the message — typically for charter announcements or polity-wide observations.

## Retention

Durable: every inter-office message is preserved indefinitely as a substrate event.
The audit trail of office-to-office traffic is the polity's institutional memory of its own coordination.

## Ordering

Causal: when message B is sent in response to message A, B's system cells reference A's id, and the runtime preserves the causality relation.
This matters for reconstructing conversations after the fact.

## Subscriptions

Offices subscribe by writing a Subscription record under `operations/subscriptions/`.
The eligibility-by-message closure rule fires when subscribed offices have pending messages on this channel; dispatch routes the office's serving agent to consume the message.
