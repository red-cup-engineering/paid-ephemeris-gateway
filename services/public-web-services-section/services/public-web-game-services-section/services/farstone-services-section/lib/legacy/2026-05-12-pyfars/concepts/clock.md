---
type: concept
class: system-temporal-source
status: draft
depends-on: [substrate, time, cadence, tick]
---

# Clock

A substrate entity that emits [ticks](tick.md) at a [cadence](cadence.md).
A clock is the *system-side* source of temporal advance: a polity has clocks, each clock has a cadence, and the clock's ticking is what makes the polity move forward through that cadence's rhythm.

A clock is concrete and system-resident: it has a `kind: clock` record carrying its identity, the cadence it realizes, its current state (running, paused, last-tick-at), and its configuration (period for clock-driven cadences, trigger-condition for condition-driven cadences).
The clock IS in the substrate, not external to it.

## Clock vs. cadence

The distinction is precise:

- A **cadence** is the abstract rhythm — a name, a nesting position, a structural role ("heartbeat", "watch", "sprint", "generational").
  The polity's vocabulary for naming its own rhythms.
- A **clock** is the concrete realization of one cadence — the running mechanism that emits ticks at that cadence's rhythm.

A polity can have one clock per cadence (typical) or none (the cadence is named but no clock realizes it yet — common during program-shaping).
A polity can also, in principle, have multiple clocks for the same cadence (federated instances; redundant clocks); this is open territory.

## Clocks are substrate

A clock is not an OS-level timer or an external scheduler.
It is a substrate entity whose state is system cells.
When a clock ticks, the tick is itself a substrate event (witness, JSONL log entry); when a clock is paused, that pause is a system cell.

This is what makes clocks audit-able and replay-able.
A polity's clock history is reconstructible from its event log: every tick was witnessed, every pause was witnessed, every reconfiguration was witnessed.

## Clock and clock-skew

Across federated instances, clocks may drift.
PyFARS's single-instance commitment means each polity has its own clock for each cadence, and cross-instance synchronization (when polities federate) routes through bilattice network-sheaf consensus.
Current realization commits only to single-instance clocks; multi-instance clocks are open.

## What a clock does not do

- It does not determine *what work fires* on a tick.
  That is [scheduling-policy](scheduling-policy.md).
  The clock provides the temporal grain; the policy says what happens at each grain-point.
- It does not maintain wall-clock truth.
  The polity's wall-clock comes from the host's system clock; the clock-substrate-entity may *observe* and *record* wall-clock readings, but it doesn't generate them.
- It does not couple directly to agents.
  Agents respond to ticks via [triggers](trigger.md); the clock emits ticks, the trigger system routes them to subscribed agents, the agents [pulse](pulse.md) in response.

## What this concept does not yet specify

- The complete clock taxonomy.
  The minimum is one clock per polity (a tick clock at the finest cadence); richer setups with multiple clocks at multiple cadences are admissible.
- Splitting clock from tick-loop.
  The current realization is the `tick_node` in `runtime/lifecycle.py`'s LangGraph StateGraph — the tick-loop is in-engine and the clock interval is a state field.
  A future refactor could make the clock system-resident (a `kind: clock` record whose interval is a cell) consumed by the engine, so tick-cadence becomes substrate-authorable.
- Clock failure and recovery.
  If a clock pauses (host crash, manual pause) and resumes, what happens to subscribed agents' pulses?
  Discipline open.
