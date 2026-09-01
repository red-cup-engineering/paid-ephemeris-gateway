---
type: object
class: channel
status: draft
name: Work Queue
kind: work-queue
description: "Carries DispatchIntents from external principals into the polity. Triage offices subscribe and route intents into workitems."
emit-policy: "external principals via UDS HTTP API or CLI"
read-policy: "triage offices, dispatch officer"
retention: durable
ordering: total
message-schema: "{ intent-slug: dispatch-intent record slug, surface: cli|web|mcp|channel|federation|uds, principal: entity-ref }"
depends-on: [channel, message, dispatch-intent]
---

# Work-queue channel

The polity's intake channel for incoming work.
When a captain files a request via the CLI, an external system bridges in via the UDS HTTP API, or a federation peer requests collaboration, a [DispatchIntent](../dispatchable/dispatch-intent-record.md) record is created AND a Message is sent on this channel announcing the arrival.

## Why two records (intent + message)

The DispatchIntent IS the intake artifact — it carries the request's payload, principal, surface, and lifecycle (pending → claimed → resolved).
The Message on work-queue is the *signal*: it tells subscribed triage offices that there's a new intent to look at.

The intent is durable substrate; the message is the trigger.

## Retention

Durable.
The polity's record of every external request remains queryable indefinitely.

## Ordering

Total — by arrival timestamp.
Triage processes intents in arrival order unless priority cells override.

## Subscribers

The dispatch officer and any per-domain triage office (engineering, research, governance, operational) subscribe to filter messages by their domain (via the Subscription's `filter:` field).
