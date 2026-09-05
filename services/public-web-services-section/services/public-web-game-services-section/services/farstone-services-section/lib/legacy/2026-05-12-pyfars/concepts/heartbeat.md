---
type: concept
class: cadence-instance
status: draft
depends-on: [time, moment, event, cadence, settling, dispatch]
realizes: [cadence, recurrent-practice]
---

# Heartbeat

PyFARS's most basic [cadence](cadence.md) — the system clock tick that drives the substrate forward.
The heartbeat is what makes PyFARS a *running* substrate rather than a passive one: between ticks the substrate sits at quiescence; on each tick, dispatch fires, witnesses arrive, settling closes the consequences, and the substrate moves to a new quiescent state.

The heartbeat is the *finest-grain* cadence in the polity's cadence-nesting (heartbeat ⊂ watch ⊂ sprint ⊂ generational).
Coarser cadences fire over many heartbeats; the heartbeat itself is bounded, strict-regime, finite-state per tick.

## The tick

A heartbeat tick is itself an [event](event.md) — a system transition at a [moment](moment.md), with a witness.
Each tick has:

- **A moment** — the wall-clock timestamp + event-order-idx + closure-ordinal-of-tick-completion + cadence-position (tick-#).
- **A producer** — the heartbeat process (a long-running [process](process.md) workitem).
- **An effect** — the cells the tick produces by firing dispatch and settling.

A tick has internal structure:

1. **Read system state** — the current quiescent state at the tick-moment, including any pending intents and active dispatches.
2. **Select ready work** — dispatch-readiness predicates fire: which intents are ready to be picked up, which tasks are unblocked, which agents are available.
3. **Dispatch** — assign ready work to capable agents/offices via the [dispatch](dispatch.md) morphism.
4. **Witness** — record the dispatch decisions as substrate events (JSONL log appends, each with their own moments adjacent to the tick's).
5. **Settle** — closure rules fire over the new cells; consequences propagate within the tick's bounded closure-ordinal.
6. **Quiescence** — substrate reaches a new fixed point; tick ends; tick-completion-witness fires.

The next tick fires after the configured interval (currently 20 seconds in the running 561 realization, per the dispatch-heartbeat service).

## Heartbeat and regime

The heartbeat itself is in the *strict* regime: each tick completes in bounded closure-ordinal, performing finitely many dispatch decisions and settling steps.
The substrate as a whole may live in higher regimes (governance settles in aperiodic; some closure rules are Scott-continuous), but the heartbeat tick is strict — bounded by clock and bounded by ready work.

This is by design and load-bearing.
A heartbeat that did not complete in bounded time (or bounded closure-ordinal) would block all subsequent ticks — the polity would freeze.
PyFARS's commitment is that any single tick is bounded; long-running settlings happen *across ticks*, with intermediate quiescent states between.
The captain (or auditor) reading substrate at any moment between ticks sees a complete-and-stable snapshot.

This is the operator-regime distinction from upstream [predicated-work work-regime](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/work-regime.md): the heartbeat's *settling-regime* per tick is strict even when the polity's *operator-regime* (across all sub-domains) is higher.
The heartbeat is the mechanism that keeps the strict-regime tick available no matter what the rest of the polity is doing.

## What the heartbeat does not do

- It does not run code that the substrate hasn't dispatched.
  The heartbeat dispatches *what's ready*; it does not invent work.
- It does not skip settling.
  Settling fires every tick (over the cells that changed); skipping it would leave substrate non-quiescent and corrupt projections.
- It does not advance time.
  PyFARS does not commit to a model of time-as-system-content; the heartbeat tick is a *trigger*, not a *time event*.
  Time-aware system operations (e.g., scheduled tasks, timeouts) are a separate discipline.

## Heartbeat as a service

In a running PyFARS instance, the heartbeat is the `tick_node` of the lifecycle StateGraph (`runtime/lifecycle.py`) — a node within the `validate → boot → tick → halt` LangGraph that sleeps for the configured interval, increments the tick counter, and runs the dispatch graph.
The engine is typically launched as `pyfars run --tick-interval N` (or as a systemd user-service wrapping that command).
The engine's state (running, started-at, last-tick) is system content available via the engine's UDS-bound API per `governance/specifications/wiring-protocols.md` §4.2.

The running engine is what distinguishes a *ticking* substrate from a *static* one.
A static substrate (a corpus on disk with no engine) is dispatch-frozen; ready work doesn't move.
A ticking substrate moves forward.

## What this concept does not specify

- The interval.
  Currently 20 seconds; configurable per-deployment.
  Whether faster or slower intervals trade off responsiveness vs. settling overhead is a program-shaping question.
- Multi-tick coordination.
  When settling can't complete within one tick (transfinite-bounded sub-domains), the heartbeat must defer to subsequent ticks; the discipline for cross-tick settling continuation is partly open.
- The relation to other temporal cadences (sprints, watches, generations).
  The heartbeat is the most basic; richer cadences compose with it.
