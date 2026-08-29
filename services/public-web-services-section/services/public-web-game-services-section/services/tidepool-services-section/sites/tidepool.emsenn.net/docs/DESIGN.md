# Tidepool — Build Design

*Design deliverable for the `tidepool-llm-mud` lane. All claims below trace to files read in that
design session — module names, function signatures, and file paths are exact, not paraphrased.
`lib/legacy` and everything named `teraum` were read-only-avoided or skipped entirely. This
document is the original design brief, preserved as the canonical rationale; where the shipped
build necessarily diverged (a real bug found and fixed, a detail firmed up during implementation)
that divergence is noted inline in the relevant source file's own header comment, not here.*

## 0. Substrate assessment (what's actually there)

**FizzOS** — active tree at `.../computer-mud-services-section/apps/fizzos`, package
`@red-cup-engineering/fizzos@0.2.1`, one runtime dependency (`@lenticule-science/metrologic`, exact-pinned).
Kernel laws (from `content/architecture.md`): assertions are an immutable trace; FOUR (Belnap)
evidence joins without explosion; functional predicates settle by admitted sequence; perception is
a *structural* restriction (`world.mjs`'s `perceive()`), not a presentation filter; only an ordered
`step()` (`engine.mjs`) writes. Everything else — ecology, markets, crafting, skills, reputation,
NPCs, governance, ships, Lisp automation, instancing, federation — is optional, composed via
`capabilities.mjs`'s `defineCapability`/`composeCapabilities`, never mutating the kernel.

Built-in verbs live directly in `engine.mjs`'s `execute()`: `look`/`l`, `inventory`/`i`,
`go`/`move`, `take`/`get`, `drop`, `say`/`'`. Everything else is an unknown command routed to
`runtime.command(verb)` — i.e., a capability. This is the extension seam Tidepool's own verbs use.

**Verdaccio currency check**: `@red-cup-engineering/fizzos` published to Verdaccio is **0.2.0**;
the active tree is **0.2.1**. Published lags. Per the farstone precedent, Tidepool vendors the
tree, doesn't downgrade — see `vendor/@red-cup-engineering/fizzos/VENDORED.md`.

**qwzspace** — published `@red-cup-engineering/qwzspace@0.3.0` (checked by extracting the actual
tarball from Verdaccio storage, not just trusting the source tree, since its tree is stated HOT
with two concurrent lanes). This **is current** — no vendoring needed. Read from the tarball:
`room.mjs`/`room-registry.mjs` (first-class rooms, each with its own tick cadence, intent log, and
snapshot cache — rooms never share a clock), `protocol.mjs` (the wire spine:
`hello`/`join`/`intent`/`snapshot`/`delta`/`event`/`bye`), `intent-queue.mjs` (the single-writer
trust boundary), `resume.mjs` (HMAC resume tokens + per-actor delta ring buffer),
`intent-log.mjs`/`replay.mjs` (canonical `{tick,seq,actorId,kind,args}` records, server-bound
provenance, self-audit), `client.mjs` (isomorphic SDK: interpolation buffer, reconnect policy,
`createWorldView`).

**Farstone's landed persistence pattern** (post `mud-persistence-hardening`, confirmed live in
`world-runtime.mts`, `world-store.mts`, `clock-store.mts`, `gcs-retry.mts`, `http-wiring.mts`):
**flush-on-mutation + catch-up-on-request**, not the old interval-tick model. This is the current
pattern and Tidepool uses it — see §4.

**Capability home**: grepped the whole estate for `multi-user-dungeon` — no service home existed.
`gaming-services-section/services/` held exactly two flat siblings: `aletheon-services-section`,
`farstone-services-section`. Tidepool got a new sibling, same shape:

```
.../web-services-section/services/gaming-services-section/services/tidepool-services-section/
  sites/tidepool.emsenn.net/
    src/            (all domain + wiring code, .mts)
    web/             (zero-dep static client)
    terminal/        (arnold-based TUI client)
    agents/          (reference agent player)
    vendor/@red-cup-engineering/fizzos/   (vendored 0.2.1, farstone precedent)
    package.json    (@red-cup-engineering/tidepool-emsenn-net, mirroring farstone's naming)
```

---

## 1. World model: The Tidepool

A tidal shore, small enough to hold in one head, split into three registers that only some verbs
and some tide phases connect: **shore** (always walkable), **pools** (isolated at low tide,
flooded and connected at high tide), **underwater** (reachable only by `dive`, only when the tide
is high/rising). This is new material — tidal/shore/underwater register only, nothing Teraum.

Full room-by-room and verb-by-verb reference: `docs/WORLD.md`. Two aging contradictions (the
permit-23 precedent), functional-predicate schema, and the governance mechanic that lets a real
quorum settle `the-weir`'s harvest-rights dispute onto a new common law without ever rewriting the
immutable original trace — all documented there.

---

## 2. The agent-player protocol

Full reference: `docs/PROTOCOL.md`. Summary: versioned `tidepool.protocol.v1`; the perception frame
is qwzspace's own opaque per-subscriber entity, defined as the fizzos perception frame itself; every
cell carries its FOUR evidence-name; every subject carries its own in-band affordance list; one
command string in, wire-identical to qwzspace's own intent envelope; two-tier reconnection
(qwzspace's resume token for seconds-to-minutes, fizzos's `actorIdFor(name)` for cold starts).

**Build-time finding, not in the original brief**: qwzspace's `create-server.mjs` binds a
subscriber's interest-filtering identity to the raw per-connection object at `subscribe(conn)` —
*before* `room.mjs`'s own `wireConnection` ever assigns the room-level actorId that binding. A
naive `interest(id, subscriberId) => id === subscriberId` predicate (comparing a cache-entry id
string against that raw connection object) can never match, which silently means **zero entities
ever reach any subscriber** — every client, human or bot, would see nothing. Found by running the
reference bot end-to-end against a live server (not caught by any queue-level unit test, which
bypasses this layer entirely) and fixed in `src/tidepool-room.mts`'s `tidepoolInterestFor` by
correlating via `room.members()` (which room.mjs itself populates with `{ conn, ... }` *before*
the first point interest can possibly be evaluated for a fresh connection) — see that function's
own header for the full trace. No qwzspace source was edited.

---

## 3. Tick model — request-driven, not `setInterval`

This is the one place the design deliberately departs from qwzspace's own default cadence, for a
reason grounded in both the farstone-hardening lane's findings and the brief's "turn pacing
tolerates thinking latency" requirement.

`room.mjs` exposes `stepOnce` explicitly as "the deterministic sibling, for tests (no timers)"
alongside the timer-driven `start()`. Tidepool never calls `start()`. Instead, a `WorldRuntime` (a
direct structural port of farstone's proven `world-runtime.mts`) wraps `room.stepOnce` instead of
`mud.tick()` — see `src/tidepool-runtime.mts`'s own header for the full catch-up/flush model.

Recommended defaults (farstone's are `FIZZOS_TICK_MS=1000`, `FIZZOS_MAX_CATCHUP_TICKS=30` —
real-time-granular, right for its combat/permit pacing): Tidepool's is a *tidal* world, so a
coarser grain reads truer — `tickIntervalMs = 300_000` (5 real minutes/tick) puts
`TIDE_LENGTH=8` ticks at ~40 minutes and a full day at 2 hours.

**Practical consequence found during build**: a client that only ever sends WS intents (no other
HTTP traffic) never generates the "visitor" that drives catch-up, so its own commands can sit
queued indefinitely with nothing to process them. This is the honest, intended shape of
"the harbor sleeps between visitors," not a bug — but it means a standalone reference bot or
terminal client needs *some* periodic visit to keep the world moving in an otherwise-quiet
deployment. The reference bot supplies its own lightweight `GET /health` nudge for exactly this
reason (documented in its own header, and in `catalog-entry.json`'s `statusNote`) — in production,
ordinary traffic or a Cloud Run health probe already provides it.

---

## 4. Persistence — the bucket pattern, exactly per the landed farstone precedent

Structurally identical to `world-store.mts` + `clock-store.mts` + `gcs-retry.mts`, ported (not
reinvented). Clock written FIRST, engine snapshot SECOND, so a mid-flush crash fails toward
"under-count owed ticks" (bounded, safe) never "double-apply" (unsafe) — proven empirically, not
just argued, by `src/persistence-churn.test.mts`.

**Fizzos vendoring**: `vendor/@red-cup-engineering/fizzos/` — see that directory's own
`VENDORED.md` for the full, current account (what was copied, what was excluded, and the empirical
proof the vendor copy actually works). qwzspace and arnold, being genuinely current on Verdaccio,
are normal pinned dependencies — no vendoring.

---

## 5. Human faces

### 5.1 Web — `web/`

Zero-dep, native ESM, no build step, dark/light theme, keyboard-first. Consumes qwzspace's own
isomorphic browser client, served live off the installed dependency at `/vendor/qwzspace/*` (never
copied/forked — see `src/http-wiring.mts`'s own header for why).

### 5.2 Terminal — `terminal/tidepool-term.mjs`

A small `stack()` of arnold's own published shelf primitives (`Screen`, `layout.stack`,
`widgets.text`/`list`/`input`/`statusLine`) over qwzspace's Node client SDK. Consumes arnold's
published surface only — never touches arnold's own tree.

### 5.3 Reference agent player — `agents/reference-bot.mjs`

A scripted bot, zero LLM calls, connecting via the exact same wire protocol as any client — the
executable proof the protocol suffices for a program. Its own header documents exactly how a real
LLM agent drives the identical surface as a thin adapter.

---

## 6. Deploy

Per the runbook's farstone/aletheon rows: Cloud Run, `--min-instances 0 --max-instances 1`,
router untouched, `FIZZOS_BUCKET` set for durable persistence. See `docs/DEPLOY.md`.

---

## 7. Deferred / explicitly out of scope for v1

Named, not silently dropped:

- **Energy-bank integration** — guest-name identity only in v1.
- **Durable play-graph** — stdout/log-only in v1 (structured `{tick, actorId, verb, room,
  coOccupants}` lines per admitted command); bucket persistence is a follow-up.
- **qwzspace self-audit / replay-verification** — wired but off by default (`selfAuditEvery: 0`);
  a correctness dial, not required for v1 durability, which rests entirely on fizzos's own
  bucket-persisted trace.
- **Vendor re-cut** — a snapshot of 0.2.1, not a live mirror; needs a fresh copy if the active
  tree changes in a way Tidepool depends on, or can be dropped once Verdaccio publishes ≥0.2.1.
- **Underwater-only content depth** — three rooms is enough to make `dive` meaningful, not a full
  second map; expansion is additive, not a redesign.
