---
title: "Sessions wrap each tick"
type: goal
milestone: m4-memory-feedback
status: open
horizon: later
theory-basis: [session-as-entity, recurrent-practice, three-tier-memory]
tasks:
  - author-session-record-type
  - emit-session-open-and-close-witnesses
  - bind-event-log-entries-to-session-id
---


After this goal, every [tick](../recurrent-practices/tick.md) opens a `session-record` at boot and closes it at halt.
Every event the tick emits — eligibility settlements, dispatch decisions, agent invocations, observation cells — is bound to the session via a `session-id` cell.
Querying "what happened in this tick?" becomes a substrate read by session, not a log scan by timestamp.

## Why

[M4 — Memory and Session Feedback](../milestones/m4-memory-feedback.md) needs cross-tick memory that survives process restart.
The substrate already persists settled cells (event-log replay), but it doesn't yet carry **session boundaries** — the cuts that make per-tick consolidation, per-tick audit, and per-tick budget accounting possible.

Without session entities, you can compute "all events between two timestamps", but you can't ask "all events in *this tick*" without re-deriving the boundary from the timestamps.
With session entities, the boundary is a substrate fact other rules read.

Sessions are the load-bearing unit for [`observation-cells-from-invocations`](observation-cells-from-invocations.md), [`instinct-cells-via-consolidation`](instinct-cells-via-consolidation.md), and [`openclaw-session-close-syncs-to-substrate`](openclaw-session-close-syncs-to-substrate.md): each of those goals reads or writes session-bound cells.

## Theory grounding

**1.
Session-as-entity** ([`flatfile-agentic-resource-system/concepts/session-as-entity`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/session-as-entity.md)).
Sessions are first-class substrate entities with their own fibers — not ambient runtime context. **This makes session-bounded queries and per-session audit trails possible**; both depend on the session having a substrate identity that persists past process restart.
The fiber discipline matters: session cells live in the session's fiber, not on the events the session contains; that's what lets multiple sessions reference the same event without cell-pollution.

**2.
Three-tier memory** ([`flatfile-agentic-resource-system/concepts/three-tier-memory`](../../../../../theories/theories/engineering/theories/tech/theories/computing/theories/predicated-computing/theories/agential-orchestration-platform/theories/flatfile-agentic-resource-system/concepts/three-tier-memory.md)).
The session is the **bottom tier** (one tick or conversation).
Cross-session memory (one agent, many sessions) is the middle tier; long-term memory (the corpus) is the top.
Sessions are what give the bottom tier substrate identity — without them, the tier is a ledger of timestamps, not an addressable set of contexts.

**3.
Recurrent-practice as the session's container** ([`work/recurrent-practices/tick.md`](../recurrent-practices/tick.md)).
The [tick](../recurrent-practices/tick.md) is a recurrent practice; each cycle of the practice is one session.
The session's `cycle-of: tick` cell binds it to the practice; the tick practice's $T_R$ (cycle-boundary ordinals) are the session-open timestamps.
This is exactly the predwork [recurrent-practice](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/recurrent-practice.md) §"Identification of the cycle and its phases" reading: a single cycle is a sub-settling, an ordinal segment of the operations settling restricted to the cells the practice's closure rules act on.

### Design constraints from this grounding

- **Session ID must be derivable from the substrate, not chosen by the runtime.** The tick's boot-witness emits a fresh `session-id` (e.g., a `uuid7` or content-hash of the boot context); the runtime reads it from the substrate going forward.
  This is what keeps replay-determinism: the session ID is part of the substrate state, so a replay of the event log produces the same session ID.
- **Sessions don't write back into the events they contain.** Every event entry adds `(event, in-session, <session-id>) = T` on the *event*'s fiber, not on the session's.
  Walking session-bound queries goes from session-id outward via reverse-edges.
  Per the predwork [observation](../../../../../theories/theories/humanities/theories/sociology/theories/work/theories/predicated-work/objects/observation.md) fiber-isolation discipline applied to sessions.
- **The session record's body is empty at open and gets cells added at close.** At open: `(session, opened-at, <ts>) = T`, `(session, cycle-of, tick) = T`.
  At close: `(session, closed-at, <ts>) = T`, `(session, dispatch-count, <n>) = T`, `(session, observation-count, <n>) = T`.
  Mid-session, the session record itself doesn't change; its cells accumulate via consequents of in-session rules.

## Acceptance

- [ ] A `session` record type exists at `tools/platform/pyfars/governance/templates/session.md` with the canonical frontmatter shape.
- [ ] The lifecycle's boot phase emits a `(session, is-a, session) = T` record under the substrate's session location, with `opened-at`, `cycle-of: tick`, and a content-derived `session-id`.
- [ ] The lifecycle's halt phase closes the session: emits `(session, closed-at, <ts>) = T` and aggregate-count cells.
- [ ] Every event-log entry produced during a tick carries `session-id` in its frontmatter or cell-form.
- [ ] A walker query "what happened in session `<id>`?" returns the event set in $O(\text{session-event-count})$ without a log scan.
- [ ] Replay determinism is preserved: two replays of the same event log produce the same session IDs.
