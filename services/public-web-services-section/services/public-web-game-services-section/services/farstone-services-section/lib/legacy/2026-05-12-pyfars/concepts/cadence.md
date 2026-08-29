---
type: concept
class: rhythmic-time
status: draft
depends-on: [time, moment, event, settling, work-regime]
realizes: [cadence]
---

# Cadence

The polity's structured rhythm — the temporal grain of [recurrent practices](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md).
Realizes the upstream [predicated-work cadence](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/cadence.md) at the PyFARS-substrate scope: cadences are how PyFARS organizes operational time into named, countable cycles.

Cadence is one of the four senses of [time](time.md).
Where wall-clock time is continuous, event-order time is sequential, and closure-ordinal time is abstract, cadence time is *rhythmic* — a partition of operational time into named cycles with structural roles.

## Cadence as system-tracked rhythm

A cadence in PyFARS is:

- **A name** — heartbeat, sprint, watch, generational, etc. The polity's vocabulary for its own rhythms.
- **A cycle-boundary set** — system cells of the form `(cadence, cycle-boundary-at, moment) = t` recording when cycles begin and end.
- **A nesting position** — most cadences nest inside larger ones (heartbeat ⊂ watch ⊂ sprint ⊂ release ⊂ generational).
  The nesting is itself system content.
- **A closure-rule for cycle transitions** — the rule whose firing produces the cycle-boundary witness.

Per upstream cadence theory, cadence boundaries are *substrate-algebraic facts*, not externally imposed timestamps.
The boundary fires when the cadence's cycle-transition closure rule's antecedent is satisfied — typically either a clock-stage counter (clock-driven cadence) or an operational-state cell (condition-driven cadence).

## Cadences in PyFARS-realization

PyFARS commits at minimum to:

- **Heartbeat cadence** — the system tick.
  Fires every N seconds (typically 20s in current 561 deployment).
  Produces tick-events that drive dispatch and settling.
  This is the strict-regime cadence: each tick is bounded, finite-state.
- **Watch cadence** — the duty-shift period.
  Different offices may have different watch lengths.
  Watches fire watch-start and watch-end events; office incumbencies may be watch-bounded.
- **Sprint cadence** — the work-cycle period.
  A sprint groups work-records by completion target; sprint-boundaries are review/retrospect points.
- **Generational cadence** — long-time-scale (years).
  Charter amendments, structural reviews.
  Lives in transfinite-bounded or aperiodic regime.

Polities may add more (release cadence, fiscal cadence, ecological cadence) or specialize within these.
The catalogue is open.

## Cadence and regime

Per upstream [`cadence`](../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/concepts/cadence.md), the cadence's order type bounds the regime:

| Cadence order type | Maximum regime |
|---|---|
| Strict (uniform spacing, $\omega$) | Scott-continuous |
| Variable strict ($\omega$ with variable spacing) | Scott-continuous |
| Transfinite countable cofinality ($\omega < \kappa < \omega_1$) | Transfinite-bounded |
| Transfinite uncountable cofinality ($\kappa \geq \omega_1$) | Aperiodic |

The heartbeat cadence is strict; daily/weekly/sprint cadences are strict (or variable strict for condition-driven sprints); generational and aim-revision cadences may climb into higher regimes.

## Cadence nesting and synchronization

Cadences nest: heartbeat inside watch inside sprint inside generation.
A *coarser* cadence's boundary fires *after* the inner cadences have settled within it.
The system's natural reading is bottom-up — heartbeat ticks happen, watches close, sprints retrospect, generations review.

Multiple practices may share a cadence boundary (synchronization).
Per upstream, synchronized cadences are coordination-free for positive boundary-witness: once both cadences' boundary-witnesses settle, the polity can confirm they're synchronized without central coordination.

## Cadence and persistent-state

Per the [agent-foundations](../../../../theories/theories/engineering/theories/tech/theories/computing/theories/artificial-intelligence/theories/agent-foundations/) treatment of bounded rationality, an agent's memory is bounded; it cannot retain everything across all cadences.
Cadences provide the structure for memory-tiering: in-tick memory (ephemeral), in-watch memory (carried across ticks), in-sprint memory (carried across watches), etc.

PyFARS-side: system cells persist across all cadences (substrate is durable); but agents may attend to subsets of the system at different cadence scales.
A heartbeat-tick agent reads recent events; a sprint-review agent reads sprint-summary cells; a generational-review agent reads generation-spanning patterns.

## Cadence as substrate primitive

In PyFARS, cadences themselves are substrate entities — typically `kind: cadence` records under `governance/cadences/` or similar.
Each cadence record carries:

- Name and description
- Period (for clock-driven) or trigger-condition (for condition-driven)
- Nesting position
- Active cycle-boundary witnesses
- Optional: synchronization-points with other cadences

The polity's full cadence-set is the union of these records.

## What this concept does not yet specify

- The complete cadence taxonomy for any specific polity.
  Heartbeat is universal; others are per-polity.
- Cadence-skew across federated instances.
  When two polities have different watch lengths, synchronizing them is open.
- Variable-cadence migration — when a polity decides to change its sprint length, the discipline for transitioning is partly settled.
- The relation to [`scheduling-policy`](scheduling-policy.md).
  Scheduling within a cadence (which work fires this tick) is policy; cadence (when does the tick fire) is rhythm.
  They compose but are distinct.
