---
title: "Heartbeat is the scheduler"
type: decision
status: committed
date: "2026-05-07"
theory-basis: [recurrent-practice, task-cell-system, dispatch-readiness]
---


## What

Work dispatch in PyFARS happens on tick, not on request.
The lifecycle StateGraph's `tick_node` (`runtime/lifecycle.py`) is the scheduler; workitems are selected and dispatched during each tick cycle by the dispatch graph (`runtime/dispatch_graph.py`).
No work bypasses the lifecycle's tick except interactive human sessions through OpenClaw.

## Why

Wall-clock-driven dispatch (cron, systemd-timer with ad-hoc triggers) is non-deterministic and produces audit gaps — work that happens between ticks is not witnessed.
The FARS spec's `tick-as-iteration` concept and the `heartbeat-cycle` morphism require that the tick be the single point of work selection, dispatch, and state advance.

The lifecycle's StateGraph realizes this commitment: `validate → boot → tick → halt` is a LangGraph; the tick node sleeps for the configured interval, increments the tick counter, and runs the dispatch graph.
Per-firing provenance is captured as `RuleFiring` records and witnessed; a deterministic `rsv_hash` stamps each tick's dispatch run for replay determinism.

## Rules out

- Running dispatch from cron or systemd-timer as the primary mechanism.
  The lifecycle's tick subsumes the timer.
- Ad-hoc agent invocation outside the dispatch graph.
  Every agent invocation must be traceable to a `(workitem, dispatchable)` pair selected by `select_winners_node`.
- OpenClaw agents (or other external clients) bypassing the tick by direct dispatch invocation.
  The engine's API queues intents that the next tick drains.

## Does not constrain

- The tick interval.
  It's configurable via `pyfars run --tick-interval`; default is 20 seconds (per `runtime/lifecycle.
  EngineState.tick_interval`).
- Whether `--autonomous` is on.
  Off by default — boot/halt audits and replay-determinism tests run the dispatch graph through selection without firing real PydanticAI agent calls.
- Whether to run multiple engines for different scopes (engineering substrate vs. theory derivation substrate).
  Multiple engines are admissible; each runs its own lifecycle StateGraph against its own substrate root.
