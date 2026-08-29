---
type: object
class: system-resident-stream
status: draft
depends-on: [substrate, message, sender, recipient]
---

# Channel

A system-resident, ordered stream of [messages](../concepts/message.md).
A channel hosts the messages sent through it; subscribers listen on a channel and receive messages as they arrive.
Channels are PyFARS's mechanism for system-mediated point-to-point and broadcast communication.

A channel is a substrate-recordable object: a `kind: channel` record carrying its identity, its message-schema, its access-policy (who can send, who can subscribe), and its retention-discipline (durable, ephemeral, time-bounded).
Messages on a channel are themselves system cells, ordered by send-moment.

## What a channel has

A channel has:

1. **An identity** — a stable slug naming the channel.
2. **A message schema** — the structural shape of messages this channel accepts.
  May be loose (any payload) or tight (specific frontmatter / specific fields).
3. **An access-policy** — who is authorized to send (the channel's writer-set), who is authorized to subscribe (the reader-set).
  These are deontic-profile restrictions; sending or subscribing outside policy produces audit-rejected witnesses.
4. **A retention-discipline** — how long messages on the channel persist.
  Durable channels retain messages indefinitely (audit-trail-grade); ephemeral channels evict after a window; bounded channels retain a fixed-size message-stream.
5. **A subscriber-set** — the agents currently listening on the channel.
  Subscriptions are themselves system cells; an agent subscribes by witness, unsubscribes by witness.
6. **An ordering** — the message order within the channel.
  Default: total order by send-moment.
  Some channels may be partially-ordered (e.g., causality-ordered).

## Channel as substrate

A channel is not a Python queue, not a network socket, not a message-broker abstraction.
It is a substrate entity.
Messages flowing through a channel are substrate-witnesses; subscriptions are system-cells; the channel's state at any moment (what messages are queued, what subscribers are listening) is reconstructible from the JSONL log.

This is what makes channels audit-able: a captain reading channel-state sees the polity's message-flow, the subscriber-set, and the channel-policy as substrate truth — not as runtime opacity.

## Channels and triggers

A subscriber's listening on a channel is, in [trigger](../concepts/trigger.md) terms, a subscription to message-arrival-events on that channel.
When a message lands on the channel, the channel's system-state changes; the trigger pattern-matches; the subscriber's pulse fires.

This is how channels become *agent-coupling mechanisms*: agent A sends a message; agent B (subscribed) is triggered to pulse; B reads the message during its pulse; B may act in response.

## Channel kinds

PyFARS recognizes (or admits) several channel kinds:

- **Work-queue channels** — host workitem-dispatch messages; readers are dispatcher agents and assignees.
- **Audit channels** — host audit-finding messages; readers are remediation-agents and the captain.
- **Inter-office channels** — host commands / responses between offices.
- **External-bridge channels** — host messages bridging to non-substrate systems (HTTP requests landing as messages; outbound notifications recorded as messages).
- **Coordination channels** — host cross-instance synchronization messages in federated polities.

The catalog is open; new channel kinds are added per the polity's needs.

## Channel and substrate-purity

A channel preserves substrate-purity: its messages are witnesses; its state is closure-derivable from those witnesses; its subscribers are system cells.
Replay reproduces channel-state exactly.

For external-bridge channels (where the channel mediates a non-substrate world), substrate-purity is preserved by recording the bridging-acts as observations.
A message landing on an external-bridge channel from outside is recorded as the bridge's observation; a message sent outbound is recorded as the bridge's witness of the outbound-act.

## What this object does not yet specify

- The complete channel-policy schema.
  Currently per-channel-kind.
- Channel federation.
  When polities federate, their channels may merge or remain separate; the discipline is open.
- Channel reconfiguration mid-flight.
  Changing a channel's policy while messages are in transit; partly settled.
- Performance discipline.
  High-volume channels may need system-side compression; the audit-trail vs. throughput trade-off is partly settled.
