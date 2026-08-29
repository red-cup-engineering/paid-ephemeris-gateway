---
type: concept
class: system-state
status: draft
depends-on: [substrate, settled, closure, settling]
---

# Quiescent

The state of [substrate](substrate.md)-as-a-whole when every cell is [settled](settled.md).
A quiescent substrate has no pending closure work — settling has converged (or, in higher regimes, hit a checkpoint) and the system's read-state is stable.

Quiescent is the substrate-global counterpart to settled (which is cell-local): the substrate is quiescent iff all its cells are settled.

## What quiescence enables

When the substrate is quiescent:

- **Projections are coherent.** The markdown corpus, the HTTP response, the dispatch-decision query — all return values that won't change without further witnesses arriving.
- **Reads are stable.** Two reads at the same quiescent moment return the same answer.
- **Triggers can fire.** Per the trigger discipline, triggers fire on settled cells; a quiescent substrate is one where any trigger may fire.
- **Audits are conclusive.** Audit findings reflect substrate-truth, not transient closure-mid-state.

A substrate that is *not* quiescent is mid-settling: cells are unsettled, projections are partial, triggers may need to wait.
The polity in this state is *advancing*, not yet *resting*.

## Quiescence and the tick rhythm

The tick/pulse loop's structure (per [pulsing](../morphisms/pulsing.md)):

1. Substrate is quiescent (post previous-tick-settling).
2. Tick fires; subscribed agents pulse.
3. Pulses produce witnesses; cells become unsettled.
4. Settling fires; cells return to settled.
5. Substrate is quiescent again.
6. Next tick.

The *between-tick* state is quiescent.
The *during-tick* state is non-quiescent (cells are unsettled while settling runs).
PyFARS's commitment: quiescent state is reachable between every pair of ticks, in strict and Scott-continuous regimes.
In higher regimes, full quiescence is approximated by trajectory-checkpoints.

This is what makes a tick-quanta meaningful: the substrate is in a coherent, readable state at the boundary between ticks.

## Quiescence vs. completion

Distinct concepts:

- **Quiescent** — closure has fired everywhere; no pending consequence-cells; the *current* state is stable.
- **Complete** — all witnesses that *will* arrive have arrived; the substrate has its final values.
  Stronger; rarely reached in living polities.

A polity is rarely complete (new witnesses keep arriving — new dispatches, new audits, new captain decisions).
A polity is regularly quiescent (between ticks, or after a deliberate settle, or when no work is in flight).

## Quiescence and regime

The closure-rule-system's regime classifies how quickly quiescence is reachable:

- **Strict** — quiescence reached in finite closure-ordinal steps; one tick is enough.
- **Scott-continuous** — quiescence reached at $\omega$; one tick may need to encompass an $\omega$-limit (settled lazily by checkpoint).
- **Transfinite-bounded** — quiescence reached at some definable transfinite ordinal; multiple ticks may be needed; intermediate checkpoints are the system's stable-readable states.
- **Aperiodic** — quiescence may not be reachable; the substrate is *trajectory-readable* rather than *state-readable*.

PyFARS's daily operational reality (work tracking, dispatch, witness logging) lives mostly in strict and Scott-continuous regimes.
Quiescence is the norm.
Higher-regime sub-domains (governance with aperiodic functions; cross-polity federation) are exceptional and require specific projection discipline.

## Quiescence and the captain

The captain reads substrate.
When the captain reads, they should see quiescent state — coherent, stable, audit-able.
The polity's between-tick rhythm is what makes captain-reading sensible: the polity *rests* between ticks, in a state the captain can examine without race conditions.

If a captain reads mid-tick (substrate non-quiescent), the polity should mark the response as such — partial, mid-settling, freshness-indicator.
PyFARS's commitment: never let the captain confuse mid-settling state for stable state.

## What this concept does not specify

- The quiescence-detection mechanism.
  Currently per-runtime dirty-bit tracking; surfacing quiescence as a system cell (so projections can branch on it) is partly settled.
- Multi-instance quiescence.
  When polities federate, "quiescent" must coordinate across instances; routes through bilattice network-sheaf consensus; open.
- The relation to *running* — a polity can be quiescent-and-running (between ticks, alive) or quiescent-and-stopped (no clock, frozen).
  Both are quiescent; the running-vs-stopped distinction is orthogonal.
