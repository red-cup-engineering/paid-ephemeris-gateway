---
type: concept
class: agent-internal-event
status: draft
depends-on: [event, agent, tick, trigger]
---

# Pulse

An agent's internal activation event — the agent's own beat, occurring while the agent is active.
A pulse is the moment at which an agent reads substrate, considers its situation, and produces witness events.
Where a [tick](tick.md) is the *system's* discrete advance (emitted by a [clock](clock.md)), a pulse is the *agent's* discrete activation (triggered by a tick, or by another act).

A pulse is an [event](event.md) — it has a moment, it is witnessed, it advances substrate.
But its locus is an agent, not the polity-as-a-whole.
Two agents subscribed to the same clock pulse independently; their pulses share a tick-of-origin but are otherwise distinct events.

## Pulse vs. tick — the load-bearing split

The split is what we used to conflate as "heartbeat":

- A **tick** is the clock's emission.
  System-level.
  The clock ticks regardless of who's listening.
- A **pulse** is the agent's response.
  Agent-level.
  The agent pulses only when triggered (and only if active).

This separation matters because it cleanly accommodates:

- **Multiple agents per clock**: one tick can trigger many agents' pulses.
- **Agent inactivity**: a paused agent does not pulse on a tick; the tick still fires, but no pulse follows.
- **Agent-internal cadences**: an agent can pulse in response to a non-clock trigger (a witness arriving, a peer's pulse completing).
  Not all pulses come from clock-ticks.
- **Pulse delay**: a triggered pulse may not fire instantaneously; the agent's pulse-queue may have backlog.
  The tick-to-pulse latency is real and substrate-trackable.

## What a pulse has

A pulse has:

1. **An agent** — the agent whose pulse this is.
  Always exactly one; pulses belong to agents.
2. **A trigger** — the [trigger](trigger.md) that caused this pulse.
  Most often a tick; sometimes a peer's witness, a substrate-watch, or an external signal.
3. **A moment** — the moment at which the pulse fired (which may be after its triggering moment due to queueing).
4. **A duration / closure-ordinal** — the closure-ordinal of work done within the pulse.
  A pulse is bounded; its work completes within finite closure-ordinal (in strict-regime agents) or within a checkpointable closure (in higher regimes).
5. **Witnesses produced** — the substrate events the agent emitted during its pulse.
  A pulse is a *unit of agent productivity*; what it produces is its trace.

## Pulse vs. pulsing

The same noun/gerund discipline as tick/ticking:

- A *pulse* is the noun: one discrete activation.
- *Pulsing* is the gerund: the agent's ongoing emission of pulses.

An agent that is *pulsing* is the agent that is currently active in the polity — receiving triggers, producing pulses.
An agent that has *pulsed* (past tense, specific moment) produced a particular pulse-event in the log.

## Pulse and bounded rationality

Per upstream [agent-foundations](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agent-foundations/) bounded-rationality, an agent has finite working memory and finite per-step reasoning.
A pulse is the system's accommodation of bounded rationality: each pulse is finite, the agent reads what it can read, decides what it can decide, witnesses what it can witness, and the pulse ends.
Continuation across pulses is via persistent-state — system cells the agent reads on subsequent pulses.

This is why pulses are bounded: the agent cannot pulse forever within one pulse.
Long-running agent activity decomposes into many pulses linked by persistent-state.

## Pulse and dispatch

The dispatch process is itself an agent (or a process executed by an agent).
When the polity's primary clock ticks, dispatch's pulse fires: it reads the work-queue, checks ready predicates, makes assignment decisions, witnesses the assignments.
The dispatch pulse is what we used to call "the heartbeat tick's dispatch step" — but now we can say it cleanly: a tick triggers dispatch's pulse; dispatch's pulse witnesses assignments; settling closes the consequences before the next tick.

## What this concept does not specify

- The complete set of trigger-types that produce pulses.
  Clock-ticks are the canonical case; substrate-watches, peer-witness-arrivals, and external-signals are also valid; the catalog is open.
- The relationship between agent-pulses and OS-process scheduling.
  A pulse is a logical unit; its execution may consume host-OS scheduling time; the relation between substrate-pulse-moment and host-OS-wall-time is partly settled.
- Pulse cancellation.
  If a triggered pulse hasn't yet fired and the trigger condition reverses, can the pulse be cancelled?
  Discipline open.
- Pulse priority.
  Multiple triggers in flight; which agent's pulse fires first?
  Currently per-trigger-arrival-order; richer policies open.
