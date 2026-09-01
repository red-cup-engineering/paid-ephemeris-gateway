---
type: morphism
class: clock-emission
status: draft
depends-on: [clock, tick, cadence, time]
---

# Ticking

The morphism by which a [clock](../concepts/clock.md) emits [ticks](../concepts/tick.md).
Ticking is what a clock *does*: each application of ticking advances the clock's cadence-position by one and fires a tick-event into the substrate.

Ticking is the gerund-form of tick.
Where a *tick* is a discrete event (a system cell, a witness in the log), *ticking* is the ongoing dynamic — the clock's continuous emission of ticks at its cadence's rhythm.
Asking "did the clock tick at $\tau$?" reads a system cell; asking "is the clock ticking?" asks about the dynamic — is the clock active, emitting at its expected rhythm.

## Action

For a clock $C$ with cadence $\gamma$ at system state $S$:

$$\mathrm{ticking}_C \colon S \;\longrightarrow\; S'$$

where $S'$ extends $S$ with a new tick-event for $C$ at the next cadence-position.
The action is repeated each time the cadence's trigger-condition is met (clock-driven: every period; condition-driven: when condition holds).

Iterated ticking produces the sequence of ticks comprising the clock's lifetime.
The cadence's order type ($\omega$, transfinite, etc.) bounds how many ticks the clock can emit.

## Ticking and pulse-triggering

A tick is a substrate event; per the [trigger](../concepts/trigger.md) discipline, events trigger acts in subscribed entities.
So ticking *fans out* — each tick fires the [pulse](../concepts/pulse.md) of every agent subscribed to the clock.

The pattern: ticking emits a tick → trigger-system pattern-matches → subscribed agents' pulse-queues receive the trigger → agents pulse.
The morphism `ticking` emits the tick; the morphism `pulsing` is what each subscribed agent does in response.
The two are coupled but distinct.

## Ticking and clock state

A clock's state distinguishes:

- **Running** — ticking is active; ticks fire at cadence rhythm.
- **Paused** — ticking is suspended; no ticks fire even if cadence-trigger fires.
- **Stopped** — ticking has ended; clock will not tick again.

State transitions (start → running, running → paused, paused → running, running → stopped) are themselves substrate witnesses.
A clock's complete lifecycle is reconstructible from its log of ticking-state transitions.

## Ticking and regime

Ticking is in the *strict* regime: each tick takes bounded closure-ordinal to fire (read clock state, advance cadence-position, emit witness).
The system's response to a tick (subscribed agents' pulses, settling under closure rules) may live in higher regimes; but the ticking morphism itself is strict.
This is by design: a clock that could not tick in bounded time would block its own next tick.

## Ticking failure

If a clock cannot tick (host crashed, host clock wildly skewed, pause-witness in flight), the cadence's expected tick fails to fire.
PyFARS's discipline:

- Missed ticks are *substrate-visible* — there is a `(clock, missed-tick-at, moment)` cell when a tick should have fired but didn't.
- Recovery may either *fire the missed ticks* (catching up; may be appropriate for cadence-position-counting) or *skip them* (jumping to current; appropriate for wall-clock-paced cadences).
  Discipline is per-cadence, set by configuration.

## What this morphism does not specify

- The exact mechanism of clock-emission.
  In the current realization, the lifecycle StateGraph's `tick_node` (`runtime/lifecycle.py`) sleeps for the configured tick interval and emits the tick event by running the dispatch graph; the clock is parameterized by `EngineState.tick_interval` rather than authored as a system cell.
  Making the clock system-resident (a `kind: clock` record whose interval lives in a cell) and having the engine consume that record is a future refactor.
- Multi-clock coordination.
  When a polity has multiple clocks at different cadences, their ticking is independent; cross-clock synchronization (e.g., "watch-clock ticks fire only at heartbeat-clock-tick boundaries") is open.
- Clock-skew detection.
  When a host clock drifts, ticking may emit ticks with non-monotone wall-clock timestamps.
  The substrate detects and surfaces this; remediation is open.
