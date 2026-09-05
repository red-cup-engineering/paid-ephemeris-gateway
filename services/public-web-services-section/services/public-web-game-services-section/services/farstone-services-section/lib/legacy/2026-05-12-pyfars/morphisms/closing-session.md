---
type: definition
class: system-morphism
status: draft
realizes: [witnessing-completion, settling]
depends-on: [session-record, opening-session, consolidating, ticking]
implementation: pyfars.runtime.session.close
---

# Closing session

The morphism that runs at the end of each tick: it freezes the per-session observation buffer, writes a `closed-at` cell, transitions the session's status to `closed`, and emits the matching causal events.
Every observation cell carrying `(observation, in-session, <S>) = t` is now eligible for consolidation by [`consolidating`](consolidating.md) on the next consolidation pass.

Pairs with [`opening-session`](opening-session.md): every tick is bracketed by exactly one open and one close.
The session-record is what makes per-tick observation lifecycle explicit and replay-deterministic — observations belong to a specific session, not to a wall-clock window.

## Signature

$$\mathrm{close\text{-}session}\colon \mathrm{Substrate} \;\longrightarrow\; \mathrm{Substrate}'$$

— produces system state with the open session transitioned to closed and observations marked consolidatable.

## What the morphism does

1. **Verify session is open.** Read `(session, status, open) = t`.
  If absent or already closed, emit a $\top$-cell on `guard` (the tick is malformed).
2. **Freeze observation buffer.** Mark all observation cells emitted within this session as consolidation-eligible: `(observation, eligible-for-consolidation, t) = t` for each.
3. **Compute session aggregates.** Per-session statistics (observation count, instinct cells produced this tick, contradictions surfaced) are written as session cells: `(session, observation-count, <n>) = t`, etc. These feed the M11 audit-export and M18 publishing.
4. **Emit cells.**
   - `(session, closed-at, <ts>) = t`
   - `(session, status, closed) = t`
   - `(session, duration-ms, <n>) = t`
5. **Emit causal event.** A `session-closed` event on the `observation` channel; `caused-by` includes the `session-opened` event for this session.
6. **Schedule consolidation.** If the session count since last consolidation exceeds the polity's `consolidation-cadence` cell, emit a `(session, triggers-consolidation, t) = t` cell that fires the next [`consolidating`](consolidating.md) pass.

## When the morphism fires

At the very end of [`ticking`](ticking.md)'s tick body — after all closure-rule firings have reached quiescence (or the tick budget is exhausted), after all agent invocations complete, after [`witnessing-completion`](witnessing-completion.md) has emitted any completion witnesses for the tick.

## What this morphism commits to

1. **No retroactive observations.** Once `closed-at` is written, no further observation may be added to the session; the substrate refuses with a `guard`-channel cell.
2. **Aggregate cells are derived, not asserted.** The observation-count and similar stats are computed from session-scoped cells, not authored.
  Consistency follows.
3. **Consolidation is decoupled.** Closing the session does not run consolidation; it merely makes the session's observations eligible.
  The actual consolidation runs at the polity's chosen cadence, possibly batching multiple sessions.

## What this morphism does not specify

- Garbage collection of closed-but-consolidated sessions.
  Currently sessions persist indefinitely; whether to compact session records into per-day rollups after consolidation is an open audit-tier decision.
- Discipline for sessions that close with unresolved $\top$-cells on `guard`.
  Currently the session closes (the tick must end); the $\top$-cells persist and surface in the next tick's startup.
  Whether to block tick close pending adjudication is open.
- Cross-session causal-chain compaction.
  A long-running consolidation that reads N sessions builds a causal predecessor chain of depth N; whether to checkpoint causal hashes at session-close boundaries is open optimization.
