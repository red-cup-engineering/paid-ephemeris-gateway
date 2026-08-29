---
type: concept
class: system-event
status: draft
depends-on: [event, clock, moment, cadence]
---

# Tick

One discrete emission of a [clock](clock.md).
A tick is an [event](event.md) at the system level: it has a [moment](moment.md), it is witnessed in the JSONL log, it advances the system's cadence-position by one.
Each tick is what makes a polity *move forward* through a cadence — between ticks, the cadence is at a particular position; on a tick, it advances.

A tick is to the clock what a heartbeat is to a heart in the upstream metaphor — but with the metaphor cleaned up: ticks are *system-level* (the clock emits them), pulses are *agent-level* (the agent's response to a tick), and the connection between the two is a [trigger](trigger.md).

## What a tick is

A tick has:

1. **A clock** — the clock that emitted it.
  Always exactly one; ticks belong to clocks.
2. **A moment** — a [moment](moment.md) locating the tick in time.
3. **A cadence-position** — the index of this tick within its clock's cadence (tick #173 of the heartbeat cadence; tick #4 of the sprint cadence).
4. **A witness** — the JSONL log entry recording the tick.
  The tick IS the witness, in the system's serialized form.
5. **Optional triggers fired** — the [triggers](trigger.md) this tick activated, naming the agents/processes whose [pulses](pulse.md) it caused.

## Tick vs. ticking

A *tick* is the noun: one discrete emission. *Ticking* is the gerund: the clock's ongoing emission of ticks.
The distinction is the same as event vs. eventing or pulse vs. pulsing — the noun names the discrete unit, the gerund names the dynamic.

In substrate terms: every tick is a system cell (a `kind: tick` record in the log); ticking is the system's coverage-of-tick-cells over time.
Asking "did the clock tick at $\tau$?" is a substrate-cell question; asking "is the clock ticking?" is a substrate-trajectory question.

## Tick vs. pulse

The split is load-bearing:

- A **tick** is system-level — the clock's emission, observable from outside the agent.
- A **pulse** is agent-level — the agent's internal activation in response to a tick.

A clock ticks regardless of whether any agent is subscribed.
An agent pulses only when triggered.
One tick may produce many pulses (many subscribed agents) or zero pulses (no subscriptions).
Ticks and pulses are connected, but distinct.

## Ticks and dispatch

When the polity's primary clock ticks, the tick triggers the dispatch process's pulse.
The dispatch-process's pulse is what reads ready work, settles, and produces witness events.
Per-tick, the pulse-of-dispatch is what advances the polity's work-state.

But this is *one configuration*.
Other agents can subscribe to the same clock and produce their own pulses — a heartbeat-monitor agent, a metrics-collector agent, a watch-boundary agent.
The clock's ticking is the rhythm; what pulses the rhythm produces depends on subscriptions.

## What this concept does not specify

- The schema of tick witnesses.
  A tick is a witness; its JSONL line includes clock-id, moment, cadence-position, and any agent-pulses it triggered.
  The exact format is partly settled.
- Tick skipping.
  If the system is overloaded and a clock would have ticked but cannot keep up, what happens?
  Drop the missed tick (catch up to current time) vs. fire the missed ticks in sequence (replay) is a program-shaping question.
- Tick's relation to wall-clock.
  The clock's tick may carry a wall-clock timestamp (the host's clock at emission), but the tick *itself* is a logical event distinct from wall-clock.
  A tick's identity is its (clock, cadence-position) pair, not its wall-clock-time.
