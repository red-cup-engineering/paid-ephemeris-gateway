---
title: "Consolidation cycle"
type: recurrent-practice
status: planning
cadence: per-N-ticks
aggregation: finite-history
history-depth: 1
constitutes: [promote-runner, instinct-emission-rule]
fires-at: every-N-tick-boundaries
formality-layer: F2
phases: [read-observations, settle-instincts, emit-witness]
nested-in: null
---


The recurrent practice that promotes [observations](../observations/_index.md) into instinct cells.
Fires at a coarser cadence than [tick](tick.md): every N ticks (default N = 60 — once per minute when ticking once per second, configurable per host's computer-system record).

## What this practice is

A periodic execution of `runtime/promote.py` (the existing settlement-path operator) over the observations emitted since the prior cycle.
The output: instinct cells per dispatchable per workitem-class, each with provenance back to the observations that produced it.

The cycle is **not a tick**: it doesn't dispatch workitems, doesn't invoke agents, doesn't write assignment cells.
It walks observations, applies settlement rules, writes instincts, witnesses what it did.

## Cycle structure

Three phases per cycle:

1. **Read observations.** Walk all observation records emitted since the prior cycle's boundary.
  Group by dispatchable and by workitem-class.
2. **Settle instincts.** For each `(dispatchable, workitem-class)` group, apply the consolidation rule set: aggregate observations per Stevens scale, compute confidence, emit `(instinct, of-dispatchable, D) = T`, `(instinct, for-workitem-class, C) = T`, `(instinct, value, V) = T`, `(instinct, confidence, K) = T`, `(instinct, derived-from-observations, [O1, O2, ...]) = T`.
3. **Emit witness.** Write a cycle-completion witness with `rsv_hash` of the consolidation rule system, observation count consumed, instinct count emitted.

## Aggregation

**Finite-history, depth 1 (Markov).** Each cycle reads only the prior cycle's instinct cells (as a starting point) plus the observations emitted since.
It does not read further back.
This is replay-deterministic and bounded-cost.

Raising depth (e.g., to depth 4 for Tetranacci-shaped consolidation that weights the prior 4 cycles) is a future capability that requires substrate-witnessed authorization (an [adjustment](../adjustments/_index.md) record).
Per [predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) §"Finite-history practices as step-n rules", depth-4 consolidation has a different cohomological invariant ($\mathrm{cl}\text{-}\mathrm{inv}^{(4)} \in \mathbb{Z}^4$, Tetranacci-type) than depth-1 — adopting it changes the practice's structural type, not just its parameters.

## Constituent rules

- **`promote-runner`** — the existing `runtime/promote.py` settlement-path operator.
  Already built; this practice binds it to the cadence.
- **`instinct-emission-rule`** — the closure rule that takes aggregated observation values and emits the instinct cell with provenance.
  Authored as part of [`emit-instinct-cells-with-provenance-back-to-observations`](../tasks/engineering/emit-instinct-cells-with-provenance-back-to-observations.md).

## Fire condition

Every N ticks: at the close of every Nth [tick](tick.md), the supervisor (or the lifecycle's halt phase, if N=1) invokes the consolidation cycle.
The cycle's first phase reads the observation increments since the prior cycle's boundary; without observations, the cycle still fires but produces no instincts (a no-op witness).

## Theory grounding

- [Predwork recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — formal definition; this is a depth-1 finite-history practice.
- [FARS consolidation-as-settlement](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/consolidation-as-settlement.md) — the algebraic content: instincts are settled, not authored.
- [FARS three-tier-memory](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md) — this practice is what promotes from the bottom (sessions/observations) to the middle (instincts) tier.

## Regime

**Strict.** The constituent rules are strict-regime; aggregation is finite-history depth-1 (finitary).
The cycle is in the strict regime; one cycle is computable in bounded time.

## Synchronization

The consolidation cycle is **nested inside** the [tick](tick.md) practice — its cycle-boundaries are a subset of tick-boundaries (every Nth tick-boundary opens a consolidation cycle).
It **synchronizes with** the [`selection-reads-instinct-cells`](../goals/selection-reads-instinct-cells.md) goal's selection rule: the consolidation cycle's witness emission is what tells selection that fresh instincts are available.
