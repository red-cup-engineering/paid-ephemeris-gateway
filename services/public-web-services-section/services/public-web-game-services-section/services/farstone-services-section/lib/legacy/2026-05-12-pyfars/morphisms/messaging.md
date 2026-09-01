---
type: morphism
class: communication-act
status: draft
depends-on: [message, channel, sender, recipient, witness]
---

# Messaging

The morphism by which a [sender](../concepts/sender.md) emits a [message](../concepts/message.md) onto a [channel](../objects/channel.md), making it available to the channel's [recipients](../concepts/recipient.md).
Messaging produces a message — the noun-form act-specialization that the morphism realizes — recorded as a substrate witness at the moment of sending.

Messaging is to message what [observing](observing.md) is to observation: the gerund-form morphism whose invocation produces the noun-form event.

## Action

For sender $A$ on channel $C$ with content $m$ at moment $\tau$:

$$\mathrm{messaging}_A \colon (m, C) \;\longrightarrow\; w_{A,C,m,\tau}$$

— substrate gains a message-witness recording sender, channel, content, and moment.
The channel's system-state advances by one (the message is appended to the channel's stream); subscribed recipients' triggers fire on the new message.

## Messaging and authority

Messaging requires that $A$ be authorized to send on $C$ (per the channel's access-policy).
An attempt to send on an unauthorized channel produces an audit-rejected witness.
This is sender-side substrate-purity: every successful messaging-act is authorized; every attempt is audit-traceable.

## Messaging vs. observing vs. witnessing

These adjacent morphisms are distinct:

- [Observing](observing.md) — agent reads substrate; produces an observation-witness recording the read.
  No directed content.
- Witnessing (general) — system transition is recorded; produces a witness-cell.
  Not necessarily directed.
- Messaging — sender emits directed content to a channel; produces a message-witness with recipient-set determined by channel-subscription or addressing.

A message's witness is itself a witness in the general sense; what makes it a *message* witness is the directed-content semantics (sender, channel, recipient).

## Messaging and triggers

A successful messaging-act fires triggers on the channel: subscribers' pulse-queues receive the trigger, and recipients pulse in response.
The chain (messaging → message-witness → channel state-update → subscription-trigger → recipient-pulse) is the polity's coupling-via-channel pattern.

## Messaging and bridging

When messaging bridges to non-substrate systems (sending an HTTP request, sending email), the system records the messaging-act *and* an [observation](observing.md) of the external system's response.
The bridge-channel's system-state includes both the outbound message and the incoming reply; both are reconstructible from the log.

## What this morphism does not specify

- The schema of message-witnesses (per-channel currently).
- Multi-message atomic operations (sending several messages as one transaction).
  Partly settled.
- Messaging back-pressure.
  When a channel is at capacity, what happens?
  Discipline is per-channel.
- Cross-instance messaging.
  When sender and recipient are in different federated polities, the discipline routes through bilattice network-sheaf consensus; partly settled.
