---
type: concept
class: system-dimension
status: draft
depends-on: [substrate, predication-cell, witness, settling]
---

# Time

The system's temporal dimension: what cells are stamped with, what witnesses occur in, what persistent-state persists across, what closure ordinals enumerate.
Time is not a separate substrate dimension layered on top of predication-cells; it is constitutive of how cells *settle* and how the substrate evolves.

PyFARS commits to time as multiple distinct-but-composing senses, each load-bearing for some part of the realization.

## The four senses of time in PyFARS

### 1. Wall-clock time

The ISO-8601 timestamp on a witness event, recording when the event was produced according to the polity's clock.
Wall-clock time anchors the substrate to the world's calendar — the captain's experience of time, the audit trail's temporal grounding, the cross-polity synchronization point.

Wall-clock time has the structure of $\mathbb{R}$ (or, practically, integers at nanosecond precision).
It is dense, totally-ordered, monotone within a single instance, possibly non-monotone across federated instances (where clock skew is a real concern).

### 2. Event-order time (sequence)

The total order of events within a single PyFARS instance's [JSONL event log](../objects/jsonl-event-log.md).
Events are ordered by timestamp with deterministic tie-breaking; replay walks the log in this order.
This is the *operational* time PyFARS computes against — system state at a "point in time" is the closure of all events with sequence-number $\leq n$.

Event-order is logically prior to wall-clock for substrate-purity purposes: even if wall-clock timestamps are imprecise (clock skew, low resolution), the event-order can be recovered from the log's append-only structure.
Event-order is what makes the log replay-able.

### 3. Closure-ordinal time (settling stages)

The abstract time at which system state reaches a fixed point under the closure-rule-system.
Per the upstream [four-regime classification](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/), the closure ordinal $\kappa$ is the stage at which iterated closure stops producing new cells.
Different sub-domains live in different regimes: strict ($\kappa < \omega$), Scott-continuous ($\kappa = \omega$), transfinite-bounded ($\omega < \kappa < \omega_1$), aperiodic ($\kappa \geq \omega_1$).

Closure-ordinal time is *abstract* — it is not measured in seconds.
It is measured in *closure steps*.
A heartbeat tick that fires 5 closure rules to convergence has closure-ordinal $5$ for that tick; a settling that requires reading the limit of an $\omega$-sequence of consequences has closure-ordinal $\omega$.

### 4. Cadence time

The structured time of [recurrent practices](cadence.md): heartbeat ticks (seconds), work cycles (sprints, watches), generations (years).
Cadence time is rhythmic — it nests (heartbeat $\subset$ daily $\subset$ weekly $\subset$ generational); it has named boundaries; it carries cross-practice synchronization points.

Cadence time is what the polity *experiences* its temporality as.
Heartbeats happen at heartbeat cadence; reviews happen at review cadence; charter amendments may happen at generational cadence.

## How the four senses compose

These four senses are not independent.
They compose into PyFARS's substrate temporality:

- A **witness event** has wall-clock time (its timestamp) and event-order time (its position in the log).
- The system state **after** a witness has a closure-ordinal time (the number of closure steps run after that witness's cells were added).
- A **cadence boundary** is a specific moment marked at a specific closure-ordinal at a specific event-order at a specific wall-clock time.

The four are different *aspects* of the same temporal reality.
Different parts of the realization read different aspects.

## Time and persistent-state

Per the upstream [agentic-system three-condition characterization](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agents/concepts/agentic-system.md), persistent-state is the third condition: an agent's state must survive process termination and resume coherently.
Time is what state persists *across*.
Without time, persistence is trivial (everything is "now"); with time, persistence is the property that earlier system state is recoverable and later state can build on it.

PyFARS's substrate-purity discipline is what makes persistent-state across time tractable: every system transition is a witness with a timestamp; the substrate at any wall-clock time can be reconstructed from the log up to that timestamp.

## Time and substrate-purity

Time interacts with substrate-purity in a subtle way.
A cell's value at time $\tau$ is determined by the closure of events with timestamp $\leq \tau$.
But what about cells that *change* over time without explicit witnesses (e.g., "the current temperature outside")?

PyFARS's commitment: such cells are NOT system cells.
They live outside the substrate.
If the polity wants to track external time-varying state, it must do so by *periodic observation events* — witnessed snapshots — not by treating external state as continuous-time substrate.
This is what keeps the substrate replay-able and audit-traceable: there are no "implicit" temporal cells; every cell's history is the witness chain that produced it.

## Multi-instance time

When two PyFARS instances federate, their event-order times are distinct sequences; their wall-clock times may have clock skew.
Cross-instance time-ordering uses upstream [bilattice network-sheaf consensus](../../../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/) — the merged log's order is the d-frame consensus across instances.
This is open work for PyFARS; current realization commits only to single-instance time.

## What this concept does not yet specify

- The precise discipline for reconciling wall-clock skew across instances.
  Logical clocks (Lamport, vector) may augment wall-clock; the migration discipline is open.
- The handling of *retroactive* events — events asserting "this was true at time $\tau' < \tau$ but witnessed at $\tau$."
  Currently the witness's `effective-at:` field carries this; the closure semantics for retroactive cells is partly settled.
- The relation to physical relativity.
  PyFARS commits to a single-instance flat time model; relativistic effects (events at near-light speed, GPS-level precision) are out of scope.
- The temporal type of "concept" notes — concepts are theory entries that don't typically have temporal cells.
  Whether concepts inhabit the same temporal dimension as work-records is partly settled (yes, weakly: a concept's `created-at:` and `modified-at:` cells exist) but the substantive role of time for theory entries is mostly atemporal.
