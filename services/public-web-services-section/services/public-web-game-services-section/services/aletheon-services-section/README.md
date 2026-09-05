# aletheon

> A browser 3D fantasy MMORPG whose world-truth **is** voidmath.
> The realm is settled out of the Void; every vital fact is a bilattice cell — **⊥** unknown · **t** real · **f** slain · **⊤** a contradiction the world *holds as a situation* and lets walk as a Corrupted Anomaly.
> Zero dependencies, zero build, pure ESM.
> A from-scratch WebGL2 engine over a from-scratch WebSocket server over the cleaned-up voidmath kernel.

`aletheon` (`@561/development.experimental.aletheon`) is the game member of the voidmath stack.
It takes the repo at its word — *rederive everything* — and builds a real-time multiplayer 3D game with **no game engine, no graphics library, no networking library, and no bundler**.
The renderer, the 3D math, the WebSocket framing, and the world simulation are all in-tree.
The one thing it does *not* reinvent is the logic the world runs on: that is the kernel.

Live at **https://aletheon.561.group/** (Cloud Run, `us-central1`; see "Deploy" below — the old
`aletheon.experimental.development.561.group` nginx/systemd target named below is decommissioned).

## Quick start

Requires Node ≥ 20. Three real dependencies (`@561-group/{computer,math,qwzspace}`), resolved
from the house Verdaccio registry — `npm install --registry http://127.0.0.1:4873/` if
`node_modules/@561-group/` isn't already populated.

```sh
node scripts/aletheon-server.mjs        # serve the client + run the world on a 15 Hz tick (PORT=8787)
#   then open http://localhost:8787/ in a WebGL2 browser

npm test                                # the real suite — see "Tests" below
```

**Controls:** `WASD` move · `mouse` look (click to capture) · `LMB` / `Space` strike · `1–4` speak a force (or, in a Parley, play it) · `Z X R B` powers (Reflect/Banish/Reveal/Bind) · `F` settle a Cairn · `P` parley a foe · `K` stake a claim at an Altar (with the focused force) · `Enter` chat.

## Why this is voidmath, not flavour

**The world's truth is the bilattice — literally.** Every creature carries one load-bearing predication, `(self, alive, self)`, whose charge is computed by the kernel's own charge operations (`@561/development.experimental.voidmath-kernel-cleanup`).
Combat is **evidence**: a blow appends *negative* evidence; when it overwhelms the positive face the cell settles to **f** and the creature dies.
Re-assert *positive* life-evidence onto an already-slain cell — corruption near an Anomaly — and the kernel's `joinKnowledge` returns **⊤**: the creature does not die, it rises Corrupted.
That ⊤ is not a bug or a flag; it is the join of life and death evidence, a contradiction the world keeps as a situation, exactly as `tab` files Building Permit #23 at tick 30.
(`server/world/value.mjs` runs the real kernel; `tests/world.test.mjs` also drives the full four-regime descent `articulate → predicate → posit → settle` on minted utterances.)

**The geometry is voidmath's own 3 + 1.** `cosmogenerating.md` classifies the kernel's four regimes by `(κ, H¹)`: three — strict-finite, scott-continuous, transfinite — have `H¹ = 0` (they only rearrange evidence already present), and exactly one — the **aperiodic** corner — "extends the base with genuinely new entities and facts… the only corner that needs the outside."
Read the three as **space** (reversible — move ◇/□ back and forth, nothing new is made) and the one as **time** (irreversible novelty — the EAVT trace, the tick), and voidmath is **3 spatial + 1 temporal**.
So Aletheon's time **is** the append-only trace, and its map is the **void-monoid manifold** ported from the archive (`lab/archive/.../void-monoid/manifold_dpm.py`): concentric grade-rings, the Settled Reach at the origin, strangeness rising with grade outward.
See [`docs/dev/notes/voidmath-spacetime-3plus1.md`](docs/dev/notes/voidmath-spacetime-3plus1.md).

## Shape

```
scripts/aletheon-server.mjs   entry: node:http static + hand-rolled ws upgrade + the 15 Hz loop
server/
  app.mjs                 composition root (shared by the bin and the net test)
  http.mjs                static-asset serving for the browser client (the repo had none)
  net/ws.mjs              a zero-dependency WebSocket server: RFC 6455 handshake + frame codec
  net/session.mjs         one player: join, input intake, interest-filtered delta sync
  world/kernel.mjs        the single seam to voidmath-kernel-cleanup (charge ops + the descent)
  world/value.mjs         world-truth: the alive cell's ⊥/t/f/⊤ verdict via joinKnowledge
  world/store.mjs         the EAVT trace (TIME, the aperiodic axis) + its folded entity projection
  world/spacetime.mjs     the 3+1 geometry; re-exports the shared void-manifold + terrain
  world/combat.mjs        THE pillar: damage = negative evidence; death = f; corruption = ⊤
  world/ticking.mjs       the autonomous advance: movement, NPC AI, corruption spread, reaping
  world/seed.mjs          enacts the starting region on the grade-rings (incl. a true ⊤ Anomaly)
  world/claims.mjs        CLAIM ALTARS: the player-authored claim cell, settled by the real kernel
shared/                   imported verbatim by BOTH server and client
  constants.mjs · protocol.mjs · encoding.mjs · worldgen.mjs (terrain + void-manifold)
client/                   native browser ESM, no bundler
  main.mjs                boot · input (intent only) · the frame loop
  math/{vec3,mat4,quat}   rederived 3D math (no gl-matrix, no Three.js)
  gl/{shader,mesh,terrain,camera,renderer}   the WebGL2 engine; procedural geometry, inline GLSL
  net/connection.mjs      the browser WS client + entity interpolation
  ui/{hud.mjs,hud.css}    vitals, target frame, void-ring minimap, combat/chat log
deploy/                   ws-aware nginx + systemd, for the subdomain (modeled on website-server)
tests/                    math · world (incl. the real descent) · net (the real handshake)
```

## Systems (all kernel-grounded)

The engine started engine-deep on one pillar (real-time **combat**: strike → evidence → settle → f / ⊤, with corpses and emergent ⊤-corruption), then grew a set of voidmath-native systems on top:

- **Combat & world-truth** — every creature's life is a bilattice cell settled by the real kernel charge ops; death is `f`, life re-asserted on a slain cell is `⊤` (a Corrupted Anomaly the world holds and lets walk; corruption spreads on its own).
- **Codex of the Four Ways** (`shared/codex.mjs`) — you *learn* the bilattice by witnessing each value in play (⊥ on arrival, t/f/⊤ as the world shows them), taught by peaceful **Keeper** NPCs.
- **The Laplacian void-tension field** (`server/world/field.mjs`) — a scalar field diffused each tick by the discrete graph Laplacian (the repo's sheaf-Laplacian/H¹ idea); Anomalies radiate it, Keepers and Cairns drain it, corruption takes where it pools; painted as a heat wash in the 2D view.
- **The Four Illocutionary Forces** (`shared/illocution.mjs`) — Assert(t)/Deny(f)/Abstain(⊥)/ Contest(⊤) speech (keys 1–4), composing by knowledge-join (Assert ∨ Deny = Contest); Keepers teach the matching Way.
- **Marks, the base quantum** (`server/world/marks.mjs`) — the kernel's distinction/mark made playable: conserved marks transfer on kill, condense, and **settle into a Cairn** (a standing `t`, raised through the real four-regime descent) that calms the tension field.
- **The K₄ gauge as powers** (`shared/powers.mjs`, `server/world/powers.mjs`) — voidmath's Klein-four gauge ⟨negate, conflate⟩ + the two modal ops, each a player power that **spends marks** and is computed by the actual kernel op: **Reflect** (`negate` — a living `t` reflected to `f`, slain), **Banish** (`conflate` — a ⊤ Anomaly's contradiction sent to ⊥, dissolved), **Reveal** (`possibilize` ◇ — a knowledge-raise that widens your sight), **Bind** (`necessitate` □ — a knowledge-lower that roots a creature still).
  Keys `Z X R B`; a power bar dims what you can't afford.
- **The bilattice economy** (`shared/items.mjs`, `server/world/richness.mjs`, `server/world/trade.mjs`) — value is not a number, it is **fiber RICHNESS**: the count of an item's DETERMINED predicate cells (⊥ counts 0; ⊤ — a thing the world argues about — counts and is *contested value*; a FUNCTIONAL/settled cell weighs more, because "scarcity is settledness").
  A slain creature drops **loot** by kind into the slayer's inventory (conserved, minted onto the trace); two players **trade** by dual-filed `held-by` moves (the append IS the double-entry — no ledger), conserving the combined marks + items exactly.
  Inventory panel `I`, trade prompt `T`.
  Grounded in tab's `richness.mjs` / `trade.mjs` and `docs/dev/notes/economy-is-predicate-richness.md`.
- **The Ludics Dispute** (`server/world/dispute.mjs`) — **a Parley**: agon's two-sided contest driver, the piece `ludics-grounding.md` names as missing ("a two-sided contest driver — agon's harness").
  A **non-lethal win path**: each side holds a **stance** (a kernel charge), and the four illocutionary forces ARE the moves — **assert** pushes a foe toward `f` (loses ground), **deny** defends, **contest** forces `⊤` (PLAY itself), **abstain** yields.
  Moves resolve against the opponent's stance with the REAL kernel ops (`meetTruth ⊙`, `joinKnowledge ∨ₖ`, read with `present`/`isTop`). **Convergence** = one side's stance settles to `f` and **YIELDS** (the daimon †): a yielding hostile NPC is **pacified** (hostile off, hunt laid down); a yielding player takes a brief stun + a few marks. **Divergence** = repeated mutual `⊤` → **stalemate** (no winner).
  The panel (`P`, against the nearest hostile foe) shows both stances, the move log's last outcome, the **FLOW** meter (`flow()` — the four-glyph histogram, "active" when ≥3 kinds appear) and the **DEEP-PLAY** `⊤`-count (`deepPlay()` — Geertz's depth).
  Keys `1–4` play a force into the dispute.

- **Settle the World — CLAIM ALTARS** (`server/world/claims.mjs`) — the **keystone**: it makes the world's truth **player-authored**.
  A **Claim Altar** (`KIND.altar`, one on each grade ring — standing, peaceful, immobile, never a valid target) carries a **claim cell**: a bilattice cell whose verdict is co-authored by players who STAKE evidence through the four illocutionary forces.
  Standing by an altar you stake (key `K`, or the panel's four-glyph palette): **Assert** stakes a POSITIVE mark, **Deny** a NEGATIVE, **Contest** BOTH, **Abstain** retracts your last stake — and the marks are **conserved**, moving *into* the altar's evidence (tracked per staker, so abstain returns them and dividends can pay).
  The cell re-settles through the **REAL kernel** after each stake (`joinKnowledge` of the accumulated evidence, read with `present`/`isTop`) — the same algebra a creature's life cell runs on.
  The settled face then **ripples through the existing systems**: settle to **t** → **SANCTUARY** — the altar DRAINS void-tension in its cell (`field.mjs`, like a big Cairn) and pays a periodic marks **DIVIDEND** back to its claimants (coherence rewards); settle to **⊤** (asserted AND denied) → **ERUPTION** — a **real** `⊤` Anomaly rises at the altar (the same slay→`corrupt` path `seed.mjs` uses — a genuine `joinKnowledge` of life and death, not a flag) and the altar RADIATES tension as a **contested-value** site dropping richer loot for whoever clears it; settle to **f**/`⊥` → dormant.
  Resolution needs **no new code**: the erupted Anomaly is already **Banishable** (K₄ `conflate`), **fightable**, or **parley**-able (the Ludics Dispute) — once it is removed or calmed, the altar **decays** its contested evidence and settles **back to t**.
  The panel (shown when you stand by an altar) paints the settled glyph in its bilattice colour, the pos/neg evidence bars, and the four forces as stakes.

Deferred / next-phase (shaped in the EAVT model, not yet built): entropy/Pisot growth laws, affordance-as-richness reads, marks/inventory/claims on the persisted trace (see "Persistence" below).

## Status

- **Working:** everything above — the full client↔server loop (browser WebGL2 client + 2D fallback, hand-rolled WS, 15 Hz authoritative server), the kernel-backed world-truth, the tension field, the Codex/Keepers, illocution, and marks/Cairns; the void-manifold map + shared terrain; NPC AI; interest-filtered delta sync with client interpolation; the K₄ gauge as mark-spending powers; the bilattice economy (items as fiber richness, loot on kill, conserved player-to-player trade); the Ludics Dispute (a Parley — the non-lethal, force-vs-force win path that pacifies a foe); and **Settle the World** — Claim Altars whose player-staked, kernel-settled truth makes the world co-authored, draining tension as Sanctuaries (t) and erupting real ⊤ Anomalies as contested-value sites that ripple through the field/corruption/economy. **46 tests pass** (`npm test` — see "Tests" below for what they cover).
- **Honest about its reach:** procedural art only (no assets); one zone; no player auth (a session is a bare name, not an account); persistence covers world topology/combat/life-state but not the economy layer (see "Persistence" below for exactly what does and doesn't survive a restart).

## Tests

`npm test` (`node --test`, house convention) → **46 tests, all passing**, across `tests/`:

- `boot.test.mjs` (5) — the server actually starts, serves the real client over HTTP, and the
  seeded entity count is **deterministic** (38 — ring()/keeper/altar loops in `seed.mjs` are all
  fixed-count; only cosmetic NPC *names* draw from `Math.random()`, never how many things spawn,
  so no seeded-RNG plumbing was needed to make this assertable).
- `ws-session.test.mjs` (2) — a real client (Node's native `WebSocket`) over the real RFC 6455
  wire this server speaks in production: join, movement + a landed attack (real combat, real
  damage), speaking a force (illocution → a real `said` broadcast + codex teaching), chat, and a
  garbage-frame-doesn't-crash-the-session check.
- `tick-stability.test.mjs` (2) — 3000 unattended ticks (≈200s sim time) with zero player input:
  no exception, no NaN/negative HP, the bounded in-memory trace (`TRACE_CAP`) actually stays
  bounded, the population neither vanishes nor explodes.
- `persistence-replay.test.mjs` (5) — the local-file save/load round trip through `store.replay()`
  (fresh world, a real kill+raise sequence, a mid-corpse state, id-collision safety after restore),
  plus one test that PROVES — rather than assumes — the one real gap: marks/inventory never
  survive a replay, because those mutations never call `store.append()` in the first place.
- `gcs-client.test.mjs` (5) + `log-store.test.mjs` (11) — the GCS transport (consumed from
  `@red-cup-engineering/footing`'s `./gcs-client`/`./gcs-retry`, `retry: true` at every real call
  site) and the bucket log-store (backend resolution, buffered append, batched conditional-write
  flush with 412 retry under genuine two-writer contention, and the same round-trip fidelity as
  the local-file path — proved against a fake-GCS double, not mocked at the HTTP-call level).
- `gcs-retry.test.mjs` (11) — footing's retry-with-backoff wrapper against a fake-GCS double that
  injects failures: a transient 503/thrown network error is retried and recovered; a permanent
  failure exhausts its bounded attempt count and is surfaced loudly (`onExhausted`), never
  silently dropped; 412/404 pass through untouched on the first attempt (retrying either would
  corrupt `log-store.mjs`'s own optimistic-concurrency contract); backoff genuinely grows between
  attempts (jittered, not fixed-delay); retry is opt-in per call site and this package passes
  `retry: true` on every production path.
- `compaction.test.mjs` (3) + `snapshot-equivalence.test.mjs` (2) — the fix for the OOM crash-loop
  named in "Persistence" below: measured idle-growth *without* compaction (reproducing the
  original bug honestly), measured idle-growth *with* compaction (the tail never exceeds the
  threshold band for as long as idle-ticking continues), a 3000-tick memory-ceiling run that
  keeps the tail's peak byte size under a stated bound, and the equivalence proof that
  snapshot+tail replay produces an IDENTICAL folded-state hash to full-log replay — including
  when the tail alone carries a brand-new entity's entire spawn-to-raise lifecycle.

## Persistence

Two backends, selected by env (`server/world/log-store.mjs`, `scripts/aletheon-server.mjs`):

- **`WORLD_LOG=<path>`** (local disk). The EAVT trace at that path is read once at boot — if it
  already has rows, the world **restores** from it (via `store.replay()`) instead of seeding
  fresh; every subsequent `append()` still writes there too. This is a **behavior change** made
  this session: `store.mjs`'s own header comment always said the point was "so a crashed world
  replays from disk," but nothing actually called that path at boot before — restart used to
  silently reseed even with `WORLD_LOG` set. If you were relying on the old silent-reseed-every-
  restart behavior for local iteration, delete the file between runs.
- **`ALETHEON_BUCKET=<gcs-bucket-name>`** (GCS, the deploy backend — "data in buckets," this
  estate's standing persistence decision). Same restore-on-boot; rows are **buffered in memory**
  between writes (a network call per EAVT row would stall the 15Hz tick) and flushed as a batch —
  a conditional read-modify-write of the whole object, retried on `412` — every `WORLD_AUTOSAVE_MS`
  (default 30000) and once more on `SIGTERM`. `WORLD_LOG` becomes the **object name** within the
  bucket in this mode (default `aletheon-world.jsonl`), not a filesystem path.

**What genuinely restores**: entity identity (kind/name/id), position, hp/maxHp, hostility, and
life-state (alive/dead/⊤ Anomaly) — including a raised Anomaly's kind/name/hostile flip, which
mirrors `combat.corrupt()`'s mutation exactly (a real bug found and fixed this session: the fold
used to leave those stale after a raise).

**What honestly does NOT restore** (real, pre-existing gaps in the trace's own coverage, not
something this pass could fix without redesigning several subsystems' write paths):
- **Marks and inventory** — `combat.mjs`/`trade.mjs`/`powers.mjs`/`marks.mjs`/`claims.mjs`/
  `dispute.mjs` all mutate `.marks`/`.inventory` directly; none of those call `store.append()`.
  Proven, not assumed — see `persistence-replay.test.mjs`'s dedicated test.
- **Claim-altar state** — an altar's `.claim` cell (the co-authored evidence players stake) is
  never itself filed onto the trace, only the *derived* "claimed"/"erupted"/"claim-decayed"
  events are; a restored altar exists (as an entity) but starts with a **fresh, blank** claim.
  Safe (every call site in `claims.mjs` already null-checks `.claim`), just not faithful.
- Autosave granularity, not shutdown-save reliability: the periodic flush is what's proven durable
  end-to-end (see "Deploy" below); the `SIGTERM`-triggered final flush's completion within Cloud
  Run's termination grace period was not independently confirmed — up to one autosave interval
  can be lost on an abrupt scale-down (the same caveat Farstone's own deploy carries).

### Snapshot + log compaction (fixed — was the live OOM crash-loop)

This was an open, live-incident bug, not a theoretical one: the 2026-08-19 deploy runbook
records the persisted EAVT log growing from a fresh 38-entity seed to **96,014 rows / 8.28MB in
~19 minutes** of ordinary idle-ticking traffic, exceeding the 256MiB Cloud Run memory limit and
causing five confirmed OOM kills in an eleven-minute window — each restart reloading a strictly
larger log and crashing sooner than the last. Root cause: `ticking.mjs` files a "moved" row on
essentially every 15Hz tick once any entity is wandering or hunting (already coalesced against a
true no-op — a row is only appended when position/yaw actually changed — but real wandering
changes it almost every tick), and nothing ever truncated the accumulated tail.

Fixed by **`server/world/snapshot.mjs`**: once the buffered tail reaches
`DEFAULT_COMPACT_THRESHOLD_ROWS` (**2000** rows — chosen from the measured ~84 rows/sec, ~86
bytes/row growth rate so a compaction lands within a single `WORLD_AUTOSAVE_MS` cycle and the
tail never re-accumulates toward the 8MB+ blowup regardless of how long the process stays idle;
see the constant's own comment in `snapshot.mjs` for the full arithmetic), the tail is replaced
with the MINIMUM row set that reconstructs the identical folded state through the SAME
`store.replay()` fold every boot already uses — not a second, parallel format. Boot is
**snapshot + tail**: load the compacted snapshot object, then replay only the rows appended
since. `snapshot-equivalence.test.mjs` proves this produces a byte-identical state hash to a full
historical replay, not just "currently agrees by luck". Measured, honestly, in
`compaction.test.mjs`:
- **Without compaction** (the original bug, reproduced on demand): the tail grows strictly every
  flush — 3,811 rows/324KB at t=100 ticks, up to 28,685 rows/2.46MB by t=600.
- **With compaction** (threshold 500 rows, for a fast test run): the tail is repeatedly truncated
  back near zero (25 compactions across 300 idle ticks / 60 flushes) and never exceeds the
  threshold band for as long as idle-ticking continues — the unbounded-growth curve above is
  flattened into a sawtooth that never climbs past its ceiling.
- **Memory ceiling**: a 3000-tick (~200s sim time) idle run keeps the tail's peak byte size under
  a stated 65,536-byte bound throughout — the long-run version of the same guarantee.

Known, pre-existing, and unchanged by compaction: marks/inventory and claim-altar state (see the
two gaps above) were never on the trace to begin with, so a snapshot can only compact what full
replay already carried — compaction introduces no new fidelity gap beyond the two already named.

### GCS write retries (fixed — was a silent-failure risk on the autosave path)

Both this tree's writes (`server/world/log-store.mjs`, via `@red-cup-engineering/footing`'s
`./gcs-client`) and Farstone's own (the sibling `farstone-services-section` site) hit an
intermittent live `fetch failed` error on their autosave path (see the deploy runbook's "Known
open issues"). Before this fix a single transient failure was fatal and silent — thrown straight
out of `getObject`/`putObject` with no retry and no distinguishable log line. Footing's
`./gcs-retry` (the shared owner both sites and this package consume) wraps every outbound call with
bounded, jittered exponential backoff: transient failures (thrown network errors, 5xx/408/429)
retry up to a capped attempt count and recover; `412`/`404` — the application-level
optimistic-concurrency and legitimately-absent-object signals `log-store.mjs` itself depends on
seeing immediately — pass through untouched on the first attempt; a permanent failure that
exhausts its attempts is surfaced loudly (`onExhausted`, a stderr line naming the attempt count)
and still re-thrown to the caller, never swallowed. `tests/gcs-retry.test.mjs` (11) proves all of
this against a fake-GCS double that injects failures on demand, not against a real network.

## Deploy

**Live**: https://aletheon.561.group/ (routed through the Cloudflare Worker at
`sites/cloudflare-router/` to `https://aletheon-1019481907460.us-central1.run.app`, Cloud Run
`us-central1`, `--min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi`, env
`ALETHEON_BUCKET=five-six-one-aletheon`). This replaces the decommissioned nginx/systemd VPS
target `deploy/README.md` still describes in full (kept there as history, not as the current
path) — `CONSOLIDATION.md` independently confirms that old deployment is fully decommissioned.

**Why `max-instances 1`, not `min-instances 1`**: earlier (pre-persistence) guidance in this
estate's `deploy-runbook-2026-08-19.md` recommended pinning Aletheon to exactly one always-on
instance, because the world was in-memory-only and either a cold start or a second concurrent
instance would silently discard or fork live state. Real GCS persistence (above) removes that
constraint for cold starts — a scale-to-zero restart now restores from the bucket — but
`max-instances 1` is still real and load-bearing: two *concurrent* instances would each hold a
disjoint in-memory world and race the bucket's conditional-write on every autosave, which
`log-store.mjs`'s retry loop is a correctness backstop for (an autosave overlapping the shutdown
flush), not a substitute for.

**Redeploy**:
```sh
gcloud run deploy aletheon \
  --source "<this directory>" \
  --region us-central1 --platform managed --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --cpu 1 --memory 256Mi \
  --set-env-vars ALETHEON_BUCKET=five-six-one-aletheon
```
Run `npm test` first and confirm it's still green — do not deploy on a red suite.

**Bucket**: `gs://five-six-one-aletheon` (`us-central1`, uniform bucket-level access, public
access prevention enforced), `roles/storage.objectAdmin` granted to
`1019481907460-compute@developer.gserviceaccount.com` — same IAM shape as the ruinfold/Farstone
precedents.

**Verified live, this session**: a fresh revision (`aletheon-00001-txh`) booted seeded (0 rows,
fresh bucket); a real `wss://` session (native `WebSocket`, the same RFC 6455 wire the tests use)
joined, moved, attacked, spoke, and chatted for real — combat landed, `said`/`codex`/`altar`/
`chat`/`field` all fired. After the first autosave, a **forced redeploy** (`aletheon-00002-shn`,
a genuinely new container, confirmed serving 100% of traffic) booted logging
`persistence = gs://five-six-one-aletheon/aletheon-world.jsonl (16699 rows on boot)` and
`world seeded (62 entities) (restored...)` — a real instance churn, a real restored world (62
entities, not the fresh-seed 38), and a second live `wss://` session against that restored
instance played identically (combat, chat, said all fired again). Negative control:
`GET /does-not-exist-xyz` → 404.

**Router**: `aletheon.561.group` added to `sites/cloudflare-router/` (`src/index.mjs`'s
`ORIGIN_BY_HOST` + `wrangler.jsonc`'s `routes`), following the same pattern as
`farstone.561.group`/`ruinfold.561.group` before it.
