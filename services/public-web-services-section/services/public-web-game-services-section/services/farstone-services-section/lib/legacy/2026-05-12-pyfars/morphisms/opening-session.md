---
type: definition
class: system-morphism
status: draft
realizes: [executing]
depends-on: [session-record, ticking, jsonl-event-log]
implementation: pyfars.runtime.session.open
---

# Opening session

The morphism that runs at the start of each tick: it materializes a fresh [`session-record`](../objects/session-record.md), pins the active closure-rule-system version (for replay-determinism), opens a fresh observation buffer, and emits an `(session, opened-at, <ts>) = t` cell.

Every tick begins with this morphism; every observation, instinct write, and witness emitted during the tick references the open session via `(observation, in-session, <session-id>) = t`.
At tick end, [`closing-session`](closing-session.md) writes the matching close cells.

The session is the system's per-tick boundary discipline.
Without an open session, no observation cell may be emitted (the substrate refuses on `guard`); without a closed session, no instinct-consolidation may run (consolidation reads observations *of a closed session*).

## Signature

$$\mathrm{open\text{-}session}\colon \mathrm{Substrate} \;\longrightarrow\; \mathrm{Substrate}'$$

— produces system state extended by the cells of a new session record.

## What the morphism does

1. **Generate session-id.** A monotonic per-tick identifier (typically `tick-N` or a UUID; the choice is a system cell at the polity level).
2. **Pin closure-rule-system version.** Read the current `dispatch-closure-rule-system`'s `rsv_hash` and write `(session, pinned-rsv-hash, <hex>) = t`.
  Per [`replay-determinism`](../claims/replay-determinism.md), this lets replay reconstruct the exact rule-system in effect during the session.
3. **Open observation buffer.** Initialize the per-session observation buffer where [`observing`](observing.md) accumulates cells.
4. **Emit cells.**
   - `(session, type, "session-record") = t`
   - `(session, opened-at, <ts>) = t`
   - `(session, pinned-rsv-hash, <hex>) = t`
   - `(session, status, open) = t`
5. **Emit causal event.** A `session-opened` event on the `observation` channel with `caused-by` pointing to the prior `tick-boundary` event.

## When the morphism fires

At the very start of [`ticking`](ticking.md)'s tick body — before any closure-rule firings, before any agent invocations.
The session is open for the entire tick body; no rule reads or writes session-relevant cells before this.

## What this morphism commits to

1. **One session per tick.** The tick body operates within a single session; no nested sessions, no cross-tick session-spanning.
2. **Pinned rule-system.** A session's `pinned-rsv-hash` does not change mid-session even if the rule-system is hot-reloaded mid-tick (the next session picks up the new hash).
3. **Observation gating.** No observation cell is admitted unless an `(session, status, open) = t` cell exists.
  This is the discipline that prevents stray observations from dispatching outside the per-tick framing.

## What this morphism does not specify

- The session-id format (UUID vs sequential vs hierarchical).
  Currently per-deployment; the polity's `governance/session-id-policy.md` (when authored) carries the choice.
- Discipline for *crash-recovery* mid-session (the engine dies between open and close).
  Currently the next start emits a `(prior-session, status, abandoned) = t` cell on `guard`; no consolidation runs over abandoned sessions.
  Whether to attempt recovery from the partial event log is open.
- Multiple parallel sessions for parallel substrates (one process running two polity-instances).
  Currently one polity per process; multi-tenant deployment is open work.
