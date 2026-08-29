---
type: concept
class: temporal-coordinate
status: draft
depends-on: [time, predication-cell, substrate]
---

# Moment

A specific point in [time](time.md): the temporal coordinate that locates an event, a witness, a cell-value-assertion, or any system transition in the system's temporal dimension.
Moments are what wall-clock timestamps name; what witnesses are stamped with; what closure rules read when reasoning "at this point."

A moment is to time what a point is to a line — the indivisible locus where a happening is positioned.
The system's full history is a sequence (or partial order, in federated cases) of moments at which events occurred and cells changed value.

## What constitutes a moment

In PyFARS realization, a moment is identified by a 4-tuple corresponding to the [four senses of time](time.md):

$$\text{moment} \;=\; (\text{wall-clock-ts},\; \text{event-order-idx},\; \text{closure-ordinal},\; \text{cadence-position})$$

Concretely: - **Wall-clock-ts**: the ISO-8601 timestamp. - **Event-order-idx**: the sequential position in the JSONL log (effectively the line number with shard-prefix). - **Closure-ordinal**: the closure-step at which the moment is being observed (typically 0 for the moment-of-witness, larger as closure-derived consequences fire). - **Cadence-position**: which cycle of which cadence(s) the moment falls within (heartbeat-tick #4239, sprint #12-day-3, etc.).

Most moments in operational use specify wall-clock-ts and event-order-idx; the other coordinates are derived or implicit.

## Moments are not intervals

A moment is *point-shaped*, not interval-shaped.
An interval — the duration between two moments — is a separate concept.
Statements about "during a session" or "across a sprint" reference intervals; statements about "at this instant" reference moments.

The distinction matters for system cells.
A cell asserts a value AT a moment (or has been asserting that value SINCE a moment).
The cell's truth at any later moment depends on whether closure rules have changed it.
The substrate is, at each moment, a snapshot — a point-shaped slice of the temporal evolution.

## Moments and witnesses

Every [witness](witness.md) names a moment: when the witness fired, which corresponds to when the event the witness records occurred.
Multiple witnesses may name the *same* moment if they were produced simultaneously (a complex action that produces multiple cells in one operation produces multiple witnesses with the same wall-clock-ts and adjacent event-order-idx values).

This is the "atomic witness fires multiple cells" pattern: one moment, many cells.

## Moments and cells

A cell's value can be considered "at a moment":

$$\text{cell-value-at}(s, p, o, \tau) \;\in\; \mathbf{FOUR}$$

— the bilattice value of cell $(s, p, o)$ at moment $\tau$.
Computing this requires: 1.
Reading the JSONL log up to event-order-idx $\leq \tau$'s.
2.
Applying closure rules through the closure-ordinal at which $\tau$ is observed.
3.
Returning the resulting cell value.

The substrate at any moment is a complete (but possibly mid-settling) snapshot of cells.

## Distinguishing moment from related concepts

- **Moment vs. time**: time is the dimension; moment is a point in it.
- **Moment vs. timestamp**: timestamp is one coordinate of a moment (the wall-clock part).
  A moment carries more.
- **Moment vs. event**: an event happens at a moment.
  The moment is the "when"; the event is the "what."
- **Moment vs. tick**: a heartbeat tick fires at a moment.
  A tick is a specific kind of event; the moment is the temporal coordinate of that event.

## Moments in cross-polity federation

When two PyFARS instances federate, "the same moment" is ambiguous: each instance has its own event-order, possibly clock-skewed wall-clock.
Cross-instance moments are partial-orders (per Lamport / vector clocks) plus the d-frame consensus structure.

For single-instance PyFARS deployments (current state), moments are totally ordered.
Multi-instance moment-discipline is open structural work.

## What this concept does not yet specify

- The handling of moments with imprecise wall-clock timestamps (older systems with millisecond resolution; future high-precision events).
  Currently nanosecond resolution is the floor.
- The discipline for "moment-equivalent" events — multiple events the polity treats as happening "at the same moment" even though their individual coordinates differ slightly.
  Sometimes useful for batched operations; the discipline is partly settled.
- The relation to *spatial* coordinates.
  Per upstream, predication is spatiotemporal; PyFARS-side has no formal spatial dimension yet, but a future deployment may want spatial moments (events at locations).
