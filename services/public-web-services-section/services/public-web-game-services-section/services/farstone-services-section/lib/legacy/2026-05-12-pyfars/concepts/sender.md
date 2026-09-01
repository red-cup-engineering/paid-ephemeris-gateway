---
type: concept
class: agent-role-per-act
status: draft
depends-on: [agent, message, channel, messaging]
---

# Sender

The agent-role of *emitting a message*.
A sender is an [agent](agent.md) considered in their role-relative-to-a-particular-message; the role is transient (it applies to one message-act) rather than durable (it does not characterize the agent's standing).

Sender is the counterpart to [recipient](recipient.md).
A [message](message.md) has exactly one sender; its recipient-set may be one or many.

## What sender-status binds

When an agent $A$ is the sender of message $m$:

- The substrate-cell `(message $m$, sender, $A$)` is recorded by the [messaging](../morphisms/messaging.md) witness.
- $A$'s authority to send on the message's channel is checked: $A$ must be in the channel's writer-set per the channel's access-policy.
- $A$ is accountable for $m$'s content.
  Subsequent audit can read "who sent this?" and the answer is $A$.
- $A$ is reachable for response: if $m$ provoked a recipient-side reply, the reply is addressed back to $A$ (where the channel and protocol support replies).

## Sender vs. agent forms

Sender is not an [agent-form](persona.md) (durable kind of agent — persona, personnel, officer, endpoint).
Sender is a *role* an agent occupies for the duration of one message-act.
A captain may be sender of one message and recipient of the next; the role is per-act.

This is the same distinction as command-issuer (per-command) vs. officer (durable office-holding).

## Sender and impersonation

The system's discipline: the sender of a message is the agent whose authority backs the send.
An agent cannot send-as-another (impersonation) without the substrate recording it as an audit-rejected witness.
If an agent sends on behalf of another, the system records the *delegation* (an explicit "agent A sending under delegation from agent B") rather than presenting the message as B's.

This is what keeps the messaging audit trail trustworthy: every message's sender is the actual emitter, not a presented identity.

## What this concept does not specify

- The schema of sender-attribution within message-witnesses (per-channel currently).
- Multi-sender messages (joint-authorship).
  Partly settled.
- Anonymous sending.
  Some channels may permit pseudonymous sending; the discipline depends on the channel's policy.
- Cross-instance senders (a sender in another federated polity).
  Open.
