---
type: concept
class: coupling-relation
status: draft
depends-on: [agent, channel, trigger, message]
---

# Subscription

A substrate-recordable binding from a *source* (a [channel](../objects/channel.md), a [trigger](trigger.md)-pattern, a watched-cell-pattern) to a *recipient* (an [agent](agent.md)).
The subscription is what makes an agent receive [messages](message.md) from a channel, or have its [pulse](pulse.md) fire when a trigger pattern-matches, or be notified when a watched cell changes.

Subscription is the system's mechanism for *coupling-by-binding*: agents do not poll, they subscribe.
Reads are pulled when triggered, not polled continuously.
This keeps agent-attention bounded by substrate-events rather than by clock-time.

## What a subscription has

A subscription is a system cell (or a `kind: subscription` record) carrying:

1. **A subscriber** — the agent the subscription binds to.
  The recipient of resulting messages or trigger-fires.
2. **A source-pattern** — what the subscription matches.
  May be specific (this exact channel, this exact event-pattern) or pattern-based (any channel whose `kind:` is X; any witness whose `actor:` is Y).
3. **A response-shape** — what happens when the subscription fires.
  Most often: the subscriber's pulse fires with the matched event/message in its trigger-context.
  Other responses possible (closure-rule re-evaluation; projection re-render).
4. **A start-moment** — when the subscription was created.
  Subscriptions match events from this moment forward; events before are not retroactively delivered (unless the subscription is configured to backfill).
5. **An end-condition** — when the subscription stops.
  May be open-ended (subscription-until-revoked), bounded (subscription expires at moment $\tau$), or condition-driven (subscription ends when watched-cell takes a particular value).

## Subscription and authority

A subscription requires authority: the subscriber must be permitted to receive from the source.
An agent without read-authority on a channel cannot subscribe to it; an agent without observe-authority on a substrate-region cannot subscribe to changes in that region.

Subscription-attempts outside authority produce audit-rejected witnesses.
The subscription is not silently denied; the failed attempt is in the log.

## Subscription and triggers

The substrate-internal distinction:

- A **trigger** is the causal-relation that fires when its pattern matches.
  Specific to one source-pattern → one effect.
- A **subscription** is the *registration* of a trigger by an agent.
  The subscription is the cell that *creates* the trigger-relation; revoking the subscription removes the trigger.

So subscriptions are *reified triggers* — system cells that bind an agent to a trigger-pattern.

## Subscription and channels

When an agent subscribes to a channel:

- The agent is added to the channel's subscriber-set.
- Future messages on the channel produce trigger-fires for the agent.
- The agent's pulse fires on each message, with the message's content available to the pulse.

When an agent unsubscribes:

- The subscription's end-condition is reached (or revoked).
- The agent stops receiving messages.
- Existing message-witnesses remain in the channel and the log; only the *future-receipt* is severed.

## Subscription lifecycle

A subscription's lifecycle:

1. **Created** — substrate-witness binding subscriber, source-pattern, response-shape.
2. **Active** — matching events fire the response.
3. **Suspended** — subscription paused (perhaps by the subscriber's deactivation); matching events do not fire.
4. **Revoked / expired** — subscription ends; no further matches.

Each transition is itself a substrate event; reconstructing the subscription's complete history is straightforward.

## What this concept does not specify

- The schema of subscription cells (per-source-kind currently).
- Subscription priority.
  When multiple matching subscriptions could fire on the same event, ordering is partly settled.
- Subscription delegation.
  An agent subscribing on behalf of another (e.g., an officer subscribing for their office's incumbents); partly settled.
- Cross-instance subscriptions.
  When a subscriber is in a different polity from its source; routes through bilattice network-sheaf consensus; open.
