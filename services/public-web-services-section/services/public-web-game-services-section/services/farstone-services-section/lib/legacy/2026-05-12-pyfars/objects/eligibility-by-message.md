---
type: closure-rule-record
class: closure-rule
status: active
regime: strict
shape: subscription-arrival
consequent-predicate: eligible-by-message
realizes: [scheduling-policy, dispatch-closure-rule-system, channel-arrival-trigger]
depends-on: [dispatch-closure-rule-system, channel, message, subscription, predication-cell]
---

# Eligibility by message

A closure rule in the dispatch-closure-rule-system that fires when a [Channel](channels/_index.md) has a pending [Message](../concepts/message.md) AND a [Subscription](../concepts/subscription.md) binds a Subscriber to that Channel.
The subscriber becomes T-eligible to consume the message, letting the dispatch loop see new channel work without polling.

## Why it matters

Without this rule, message-driven work stays invisible to dispatch — the runtime would have to poll every channel each tick.
With it, the dispatch graph's substrate-walk picks up new pending messages, the closure runner emits T-eligibility cells for their subscribers, and `select_winners_node` returns those subscribers as winners on the next tick.

This is how the polity becomes **agent-coupling** rather than just agent-running: agent A sends a message; the message lands as a system cell; the rule fires; agent B (subscribed) becomes the next dispatch winner; B reads the message during its invocation.

## Rule statement

For each Subscription record $\sigma$ with `subscriber: S` and `channel: C`, and each pending message $M$ on channel $C$:

$$\big( \sigma, \mathtt{type}, \mathtt{"subscription"} \big) \wedge \big( \sigma, \mathtt{subscriber}, S \big) \wedge \big( \sigma, \mathtt{channel}, C \big) \wedge \big( C, \mathtt{has\text{-}pending\text{-}message}, M \big) \;\Longrightarrow\; (M, \mathtt{eligible\text{-}by\text{-}message}, S) = \mathbf{t}$$

## Antecedent and consequent cells

Antecedent (per (subscription, channel, message) triple):

- `(σ, type, "subscription") = T`
- `(σ, subscriber, S) = T`
- `(σ, channel, C) = T`
- `(C, has-pending-message, M) = T`

Consequent: `(M, eligible-by-message, S) = T`.

## Composition

Like the other eligibility rules, this composes with the disqualification rules under knowledge-meet.
A subscriber whose rate-limit is exhausted (`eligible-by-rate-limit = F`) won't be selected even if the message-arrival rule fires — the dispatch layer's `_is_disqualified_on_any_axis` check applies.

## Polity-extension

- *Filter predicates*: a Subscription's `filter:` field (free-form predicate) is evaluated by the runtime *after* this rule fires, narrowing the candidate set further.
  The closure rule only produces the unfiltered set.
- *Per-channel ordering*: when the channel's `ordering` is `total`, the runtime delivers messages in send-order; with `causal` or `partial`, additional cells track the ordering relation and a separate composition rule respects it.
  This rule is order-agnostic — it just produces eligibility.

## Open structural questions

- **Multiple subscribers on the same message.** When two subscribers are eligible for the same message, the runtime currently picks one via lexicographic tiebreak.
  Whether to broadcast to all (each consuming independently) or queue for one is a polity-policy choice; the rule produces both candidates equally.
- **Message-consumed cell shape.** When a subscriber consumes a message, the substrate should record `(M, consumed-by, S)` and remove `(C, has-pending-message, M)` (or transition it to `consumed`).
  The retraction discipline is partly settled.
