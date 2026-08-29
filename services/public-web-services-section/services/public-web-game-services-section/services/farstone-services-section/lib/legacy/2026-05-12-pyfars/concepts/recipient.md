---
type: concept
class: agent-role-per-act
status: draft
depends-on: [agent, message, channel, sender]
---

# Recipient

The agent-role of *receiving a message*.
A recipient is an [agent](agent.md) considered in their role-relative-to-a-particular-message: an agent the message is directed to, who may read the message and may act in response.
Recipient is transient (it applies to one message-act); an agent who is recipient of one message may be sender of the next.

Recipient is the counterpart to [sender](sender.md).
A [message](message.md) has exactly one sender; its recipient set may be a singleton (point-to-point) or many (broadcast / channel-fan-out).

## How recipient-status arises

An agent $A$ becomes recipient of message $m$ in one of two ways:

1. **By addressing** — $m$ explicitly names $A$ as recipient.
  The sender's witness records the addressed-recipient-set; subsequent reads see $A$ in that set.
2. **By subscription** — $m$ is sent to a channel, and $A$ has a subscription on that channel.
  The channel's subscription-cells are the substrate-derivation; $A$'s recipient-status is closure-derived from "$A$ subscribes to channel $C$" plus "$m$ is on $C$."

Both paths produce the substrate-cell `(message $m$, recipient, $A$)` at message-arrival.

## Recipient and authority

A recipient must have read-authority on the message's channel.
An agent without subscribe-authority on a channel cannot receive messages from it; an agent attempting to read from an unauthorized channel produces an audit-rejected witness.

This is the receive-side counterpart of sender-authority: both ends of the messaging act are authority-bounded.

## Recipient and obligation

A recipient is *not* automatically obligated to act on a message.
Plain messages carry no authority-binding (per [message](message.md)); recipients may read and ignore.
Specialized message-kinds (commands, dispatches, certifications-directed-to) carry obligations; the obligation is in the *message-kind*, not in recipient-status alone.

This means recipient-status is *attentional* (the recipient is among those the message reaches) rather than *deontic* (the recipient owes a response).
Deontic obligations live in commands and dispatches, which are message-shaped but specialized.

## Recipient and pulse-firing

When a message arrives for a recipient, the channel's trigger fires the recipient's pulse (per [trigger](trigger.md) and [pulsing](../morphisms/pulsing.md)).
The recipient's pulse may then read the message, decide whether to act, and produce subsequent witnesses.

A recipient with no active subscription, or a paused recipient agent, does not pulse on message arrival; the message lands in the channel but produces no recipient-side response.
Substrate-recording preserves the message's existence; the recipient's non-response is also substrate-visible (no pulse-witness against this trigger).

## What this concept does not specify

- The schema of recipient-attribution within message-witnesses (per-channel currently).
- Recipient delegation.
  When agent $A$ delegates message-handling to agent $B$, the substrate-form is partly settled.
- Read-receipts.
  Whether the system records "recipient observed the message" — currently optional per-channel.
- Cross-instance recipients.
  Open.
