---
type: concept
class: communication-event
status: draft
depends-on: [event, agent, channel, sender, recipient]
---

# Message

A substrate-recordable communication: directed content from a [sender](sender.md) to one or more [recipients](recipient.md), traveling via a [channel](../objects/channel.md).
A message is an [event](event.md) — it has a moment, a witness, and system cells — specialized by carrying *directed content semantics* that triggers and observations do not.

Messages compose with the polity's other communication primitives:

- **Triggers** are substrate-recordable causal relations (event → subsequent act).
  Untargeted; pattern-matched by subscription.
- **Observations** are substrate-recordable reads of state.
  The system is the *source*; the observer is the *destination*; no second party.
- **Messages** are substrate-recordable directed content.
  There is a sender and a recipient; the message is the content; the channel is the conduit.

A message *can* trigger a recipient's pulse (a message landing on a watched channel may fire a subscription-trigger).
But the message is not the trigger; the message is the content; the trigger is the relation that fires on its arrival.

## What a message has

A message has:

1. **A sender** — the [agent](agent.md) emitting the message.
  Always exactly one.
2. **A channel** — the [channel](../objects/channel.md) the message travels via.
  The channel determines who can read the message and what message-ordering applies.
3. **A recipient set** — the agents the message is directed to.
  May be one (point-to-point) or many (broadcast).
  Recipients are determined either by addressing (the message names them) or by channel-subscription (anyone listening on the channel receives it).
4. **Content** — the substantive data of the message.
  May be a substrate-cell-reference, a structured payload, an operational signal, a free-form text.
5. **A moment** — the moment of sending.
  Receipt-moment may differ (channel latency).
6. **A witness** — the JSONL log entry recording the send-event.

## Message and substrate-purity

A message must be substrate-recordable to participate in the polity's audit trail.
PyFARS's discipline: every message is a witness at its moment of sending, and (where channels are durable) the channel itself is substrate.
A message-in-flight on a substrate-channel is reconstructible from the log; a message lost to a non-substrate channel is *invisible to the audit trail* and therefore not part of the polity's epistemic record.

This means PyFARS-internal messaging is system-mediated; bridges to external messaging systems (Slack, email, HTTP) require an [observation](observation.md)-style record of what was sent and what was received.

## Message vs. command vs. dispatch

These are distinct uses of the system-recordable directed content:

- A **message** is generic directed content.
  No inherent authority binding.
- A **command** (per [commanding](../morphisms/commanding.md)) is a directed instruction with binding authority: the sender is an officer; the recipient holds a duty toward the content.
- A **dispatch-witness** (per [dispatching](../morphisms/dispatching.md)) is the assignment-event: the sender is the dispatcher; the recipient is the assignee; the content names the workitem.

Commands and dispatch-witnesses are message-shaped, but specialized with authority and work-binding.
A plain message has no inherent obligation — recipients may read or ignore at discretion.

## What this concept does not yet specify

- The schema of message content.
  Per-channel-kind currently; uniform schema partly settled.
- Multi-message correlation (request-response pairs, conversation threads).
  Open.
- Message ordering across channels.
  Within a channel, messages are totally ordered by send-moment; across channels, ordering routes through global event-order; the discipline for cross-channel causality is partly settled.
- End-to-end delivery semantics (at-most-once, at-least-once, exactly-once).
  Currently per-channel; partly settled.
