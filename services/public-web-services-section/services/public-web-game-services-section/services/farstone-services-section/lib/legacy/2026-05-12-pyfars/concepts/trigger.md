---
type: concept
class: causal-relation
status: draft
depends-on: [event, agent, tick, pulse]
---

# Trigger

The substrate-recordable causal relation by which one [event](event.md) causes a subsequent act in another entity.
A [tick](tick.md) triggers an agent's [pulse](pulse.md); a witness's arrival triggers a watching agent's pulse; one agent's witness triggers another's pulse.
Triggers are how substrate-events propagate from one locus to another.

A trigger is not itself an act — it is a *relation* between an event-that-fires and an act-that-follows.
The relation has system content: there is a subscription cell binding the cause-event-pattern to the effect-agent, and when an event matching the pattern fires, the trigger fires the effect-agent's pulse.

## The trigger structure

A trigger has:

1. **A source pattern** — what kind of event triggers this.
  May be specific (this exact clock's ticks) or pattern-based (any witness with `kind: assignment`).
2. **A subject** — the entity (typically an agent) whose act follows.
  The trigger's "fires-to" target.
3. **A response shape** — what happens when triggered.
  Most often: a pulse fires for the subject.
  Sometimes: a closure rule re-evaluates; a projection re-renders.
4. **System cells** binding the above — typically `(trigger, source-pattern, target, response)` with witness-record of registration.

Triggers are substrate entities: there is a `kind: trigger` record (or, equivalently, subscription-cells in the agent-record) carrying these.
When the corpus is read, the polity's full trigger-graph is reconstructible.

## Why triggers are first-class

Without triggers, the substrate is a passive store: events fire, cells settle, but nothing *responds*.
Triggers are the system's mechanism for coupling: clock-tick → dispatch-agent's pulse; witness-arrival → watching-agent's pulse; cadence-boundary → review-agent's pulse.

Substrate-purity is preserved: triggers are not external listeners (they are not Python callbacks registered in some runtime).
They are system cells; the polity can be replayed with the same trigger-graph; the trigger-firing is itself a witness event.

## Trigger vs. closure-rule

A closure rule is *settling-side*: it produces consequence cells from existing cells, deterministically.
A trigger is *act-side*: it produces a pulse (an act) from an event.
The difference:

- A closure rule fires *cells*; deterministic; settling.
- A trigger fires *acts*; the agent's pulse is non-deterministic in general (the agent decides what to do); coordination.

Both are system-mediated.
Both are recorded.
But they sit on opposite sides of the act/cell distinction.

## Trigger composition

Triggers compose in two ways:

1. **Source-side composition**: one event can trigger many subscribers.
  A clock's tick triggers all subscribed agents' pulses.
  The fan-out is per the system's subscription cells.
2. **Sink-side composition**: an agent can have many triggers, all of which (when fired) cause its pulse.
  The fan-in means the agent's pulse may be triggered by clock-tick *or* by witness-arrival; the agent's system state distinguishes which trigger fired this pulse.

Bilattice values may show up here: in adversarial subscription scenarios, conflicting triggers may produce $\top$-valued "trigger-fire-or-not" cells; the substrate surfaces the conflict rather than resolving it silently.

## Triggers and authority

A trigger requires that the subscriber have authority to be triggered by the source.
An agent cannot subscribe to triggers it has no authority to receive — this is a subscription-time check, recorded as a witness.
Authority for trigger-subscriptions is usually granted by an officer (the office that controls the clock; the office that controls the resource being watched).

This matters for least-privilege design: an agent's trigger-graph constrains what it can pulse in response to.
An agent with no triggers does not pulse spontaneously; an agent with limited triggers has a limited reactive surface.

## Trigger latency

Triggers do not fire instantly.
The trigger-to-pulse path involves: event fires → witness lands in log → trigger pattern-match runs → subscribed agent's pulse-queue receives the trigger → agent's pulse fires.
Each step has latency; the substrate can record the moments at each step (event-moment, trigger-fire-moment, pulse-start-moment) and audit the latency.

In strict-regime configurations, latency is bounded.
In higher-regime configurations (where pulse queues may backlog), latency is bounded only as a trajectory.

## What this concept does not specify

- The complete trigger taxonomy.
  Clock-tick triggers are the canonical case; substrate-watches and peer-witness-triggers are also load-bearing; external-signal triggers (HTTP requests, OS signals) bridge to external systems.
- Trigger persistence.
  Triggers persist across polity sessions; their system cells are durable.
  But how triggers behave across federation events (when polities merge) is open.
- Trigger debugging.
  When a pulse should have fired but didn't, the diagnostic chain (was the event recorded? did the trigger match? was the agent active?) is partly settled.
- Throttling and back-pressure.
  When a high-frequency event would produce overwhelming pulse-fan-out, what discipline applies?
  Open.
