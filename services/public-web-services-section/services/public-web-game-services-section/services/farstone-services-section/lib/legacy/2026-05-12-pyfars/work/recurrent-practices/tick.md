---
title: "Tick"
type: recurrent-practice
status: active
cadence: per-tick
aggregation: markov
constitutes: [validate-rule-system, boot-engine-state, dispatch-graph, halt-and-witness]
fires-at: timer-or-on-demand
formality-layer: F3
phases: [validate, boot, tick, halt]
---


The engine's primary recurrent practice.
Each tick is one cycle; the cycle's per-phase rules (LangGraph nodes for `validate → boot → tick → halt`) constitute the practice's $\mathcal{S}_R$.

## What this practice is

A single firing of the engine: the `pyfars run` lifecycle's main loop.
Each tick:

1. **Validate.** Confirm the loaded rule system matches its declared `rsv_hash`; abort with a witness if not.
2. **Boot.** Project the substrate into a `pypredcalc.
  PredicationStore`; load eligibility rule instances; load workitems.
3. **Tick.** Run the dispatch graph: `load_store → apply_eligibility_rules → select_winners → invoke_agent`.
  Per workitem with a winner, an agent invocation produces an execution-event.
4. **Halt.** Emit a tick-completion witness with `rsv_hash`, observation cells from invocations, and any `⊤`-anomaly witnesses.

## Cycle structure

A single cycle is one tick.
Phase boundaries are LangGraph state transitions; the phase-boundary witnesses drive the transition from one phase's active rules to the next.

The PDCA reading: `validate` ≈ check (rule-system integrity), `boot` ≈ plan (project substrate, load rules), `tick` ≈ do (dispatch and invoke), `halt` ≈ act (emit witnesses, surface anomalies).

## Aggregation

**Markov.** Each tick reads only the prior tick's settled cells (via the substrate's persisted state) and the current tick's increments (new workitems, new observations from the prior tick's invocations).
It does not read further back than one cycle.

This matters for the [step-n substitution rule](../../theories/theories/humanities/theories/math/theories/categories/theories/predication-categories/objects/step-n-substitution-rule.md) classification: the tick is depth-1, Perron-Frobenius eigenvalue 1, geometric — the cohomological signature of "stable repeating practice without higher-order memory at this scale."

Higher-order aggregation lives in the [consolidation-cycle](consolidation-cycle.md) practice (introduced in [M4 — Memory and Session Feedback](../milestones/m4-memory-feedback.md)), which reads many ticks' worth of observations to produce instinct cells.
The two practices nest: consolidation cycles span many ticks; ticks are inner.

## Constituent rules

The closure rules and skills that comprise the tick:

- `validate-rule-system` (per the lifecycle graph in `runtime/lifecycle.py`)
- `boot-engine-state` (substrate projection + rule loading)
- The dispatch graph as a workflow ([workflow: dispatch-graph](../workflows/dispatch-graph.md))
- `halt-and-witness` (witness emission and observation projection)

## Fire condition

Currently: external trigger via `pyfars run` on the CLI, or a host-level timer once [`engine-runs-as-supervised-service`](../goals/engine-runs-as-supervised-service.md) lands (it's part of [M3 — Continuous Autonomous Loop](../milestones/m3-continuous-loop.md)).
Post-M3: the engine ticks autonomously on a configured cadence (default once-per-second when work is present, longer when idle).

## Theory grounding

- [Recurrent practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) — formal definition.
- [Regime-of-recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/theorems/regime-of-recurrent-practice.md) — recurrent practice has a different cohomological signature than one-shot tasks; [M3 — Continuous Autonomous Loop](../milestones/m3-continuous-loop.md) transitions PyFARS into recurrent practice.
- [Tick-as-iteration](../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/) — the FARS-side concept (when present in self-theory).

## Regime

**Strict.** The constituent rules are strict-regime (eligibility, selection, dispatch); phase boundaries are deterministic state transitions; aggregation is Markov (depth-1, finitary).
The tick is in the strict regime; completion of one tick is always computable in bounded time.

## Synchronization

Ticks **synchronize** with downstream rate-limit windows (each tick reads the rate-limit cells emitted at the *prior* tick's halt; [`rate-limit-observations-close-loop`](../goals/rate-limit-observations-close-loop.md) makes this a synchronized practice once landed).
They **nest inside** consolidation cycles introduced in [M4 — Memory and Session Feedback](../milestones/m4-memory-feedback.md).
