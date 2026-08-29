# BNSF Design (as-built)

This is the as-built disclosure: what is actually in this tree, grounded in the real source of
`@red-cup-engineering/abrash@0.1.1` and `@red-cup-engineering/cartridge@0.2.0` (both read in full
before writing any BNSF code), durante-service's real `demon.mjs`/`combat.mjs`/`arena.mjs` (read-only
reference, HOT arena lane, never edited), and the house docs (`note-on-deploy-runbook.md`,
`note-on-house-specification-standard.md`, `note-on-naming-the-three-houses.md`). Where the original
design brief and the real build diverge — a scope cut, a mechanism that turned out to need a
different shape once actually coded — that divergence is named here, not smoothed over.

## 0. What abrash actually supports

Confirmed by reading `src/*.mjs` directly:

| Capability | Real? | Detail |
|---|---|---|
| Grid-DDA raycaster, wall height ∝ 1/dist | Yes | One ray per screen column, flat 2.5D — no pitch, no eye-height (`camera()` takes only x,z,angle,fov,width,height,maxDist). |
| 4-valued bilattice wall solidity (t/f/⊥/⊤) | Yes | ⊤ = contested, HELD, split-tinted, shivering on tick-phase (deterministic), blocks by default unless `passContested`. |
| Sprites/billboards | Yes | `drawBillboard`/`projectEntity`, depth-tested per column. |
| Collision: AABB point+radius vs. grid, per-axis slide | Yes | `collision.move(g, body, dx, dz, opts)` — pure, takes a delta. |
| Velocity/momentum physics | **No** | `engine.applyIntent` is a fixed per-tick displacement, not integrated velocity. No gravity, no jump. |
| Federated append-only trace world | Yes | `settleOpts({functional: Set})` for latest-t-wins predicates; no retraction, evidence linear. |
| Doors, sound, texture-mapping | No | Not gaps to fill inside abrash — see the extensions list below for how each is handled without touching abrash's tree. |

## 1. Movement kernel (`src/movement.mts`)

Owns velocity/gravity/jump/coyote/jump-buffer state; every tick hands the resolved horizontal delta
to abrash's real `collision.move` (or, when `opts.passContestedWhere` is supplied, to this app's own
EXT-3 adapter — see §7). Vertical motion (`zHeight`) is a second, independent integration abrash's
raycaster never sees; the browser face expresses it as a canvas-compositing offset (EXT-2, §7).

Constants are disclosed as **tuned**, ported from the known shape of Quake's own `PM_Accelerate`/
`PM_AirAccelerate`, not derived from first principles: `GROUND_ACCEL=10`, `GROUND_FRICTION=6`,
`STOP_SPEED=1`, `AIR_ACCEL=0.7`, `MAX_GROUND_SPEED=MAX_AIR_WISH_SPEED=7`, `GRAVITY=20`,
`JUMP_IMPULSE=8`, `JUMP_BUFFER_TICKS=6`, `COYOTE_TICKS=4`, `ROCKET_KNOCKBACK_IMPULSE=14`.

**The one real correctness fix made during this build**: the original draft applied ground
friction/accel BEFORE checking whether this tick's input triggers a jump, which bled speed on every
jump-tick and made bunnyhopping structurally incapable of net-gaining speed. Reordered to check jump
first (matching Quake's own `PM_CheckJump`-before-`PM_WalkMove` order): a jump triggered on a
grounded tick leaves the ground for the REST of that tick, using air accel (no friction) instead.

**Numeric tests** (`src/movement.test.mts`, 8 tests): bunnyhop speed gain (a closed-form "perfect
strafe" controller — the angle that keeps `accelerate`'s addSpeed pinned at its per-tick cap —
produces ≥4 of 5 consecutive hop-over-hop increases, final speed >1.3× ground max); normal-jump apex
matches the closed-form projectile height within 5%; rocket-jump apex exceeds 1.4× normal; ground
friction reaches exactly 0 within 60 ticks; determinism (byte-identical final state across two
independent runs of an identical intent sequence); EXT-3's `passContestedWhere` actually engages
collision (not just a documented-but-inert field); no tunneling within the kernel's own achievable
speed range, AND a second test that documents tunneling as a real, disclosed limitation at velocities
far outside that range (no CCD/substepping in v1).

## 2. Level generation (`src/level-gen.mts`)

Seeded per depth tier (`makeRng(\`${seed}:tier${tier}\`)`, ONE continuous stream threaded through
every stage of that tier's generation — rooms, corridors, contested walls, beacons, anomaly/loot
placement — never restarted mid-tier). Rejection-sampled rooms (70% long "hallway" rooms, aspect
8–14:2–3; 30% small squares 3–5), MST-plus-loop corridors (35% extra-loop chance), corridors 80% one
voxel wide / 20% two wide. Grid scales per tier: 34×34 (9 rooms) / 44×44 (13) / 54×54 (17).

Every in-bounds cell gets EXPLICIT solidity evidence — a carved cell files `deny(...)`, a wall files
`predicate(...)`; there is no implicit-fog cell in a generated level (verified by test). Extraction
beacons (own `extraction` predicate, never overloading `solid`): one "early" (BFS distance
2–40%-of-max from entry), one "deep" (top 30% of BFS distance) — both solvability-checked by
construction (200 seeds × 3 tiers = 1,200 checks in `level-gen.test.mts`, zero failures). Anomaly and
loot placement continues the SAME stream, biased toward BFS-distant, low-carved-neighbor-count
("dead end") cells.

**Contested reflip sites** (The Contested, §4.4): a small number of narrow corridor cells are marked
⊤ AT GENERATION (both `predicate` and `deny` filed for the same cell) — permanently, since the
substrate has no retraction. What makes one periodically passable is NOT the trace at all; it's
`src/contested-gate.mts`'s pure `passContestedWhereFor(sites, tick)`, a 10-second cycle (5s
closed/5s open) fed to movement.mts's EXT-3 hook — reusing arena.mjs's own established "a ⊤ voxel is
a phase gate you can sometimes walk through" idiom, gated by tick-parity instead of
federation-disagreement-origin. The raycaster still renders it shivering at ALL times regardless of
the gate (castRay stops on ⊤ unconditionally — only collision reads `passContested`), so a reflip
site always LOOKS untrustworthy even during its open half.

**Ambient pre-seeded contested walls** (~2–4% of interior walls adjacent to carved cells) are a
SEPARATE mechanism: permanent background wrongness, never gated open — a route you can never walk
through, just a wall that shivers because two witnesses disagree about it existing at all.

## 3. Anomalies (`src/anomalies/*.mts`)

**Scope cut, stated plainly**: anomalies are NOT combat targets in v1 — no weapon-vs-anomaly
health/damage-fold system. demon.mjs's wound-fold template (position via functional `at`, vitality
via non-functional fold) is the right template FOR a damage system; BNSF's anomalies are evasion
puzzles (the SCP register — learn the rule, survive it), so only the POSITION half of that template
applies. Each anomaly's position is a functional trace predicate; each behavior contract is
independently, numerically tested.

1. **The Unwitnessed** (`unwitnessed.mts`) — moves only when unobserved. `isObserved` is a real
   FOV-cone + `castRay`-occlusion check (the same geometry combat.mjs proves cheap). When observed,
   `decideStep` returns an EMPTY row array — not a zeroed step, literally no row appended, so the
   functional `at` cell's value (its last-filed row) is the position, unmoved, by construction.
   Tested: alternating look-at/look-away ticks give exactly zero delta on look-at, nonzero (equal to
   the configured speed) on look-away, over 10 ticks / 5 of each.

2. **The Hum** (`hum.mts`) — sound-bound, no LOS anywhere in the module. `noiseOf(intent)` is a pure,
   in-core signal (crouch=0, fire=1.5, sprint=1.0, ordinary movement=0.4) — the same Carrier-Audit
   posture durante's own ammo/health disclosure uses: the core decides what's loud, not a cosmetic
   audio layer. Heat accumulates through walls (distance-attenuated, no occlusion), decays passively;
   crossing `HEAT_THRESHOLD=3` LATCHES a hunt toward the player's position AT THAT INSTANT (not the
   live player) and resets heat to exactly 0 on the same tick — the real fix needed during
   development: without the reset, residual heat above threshold re-triggered a fresh hunt the moment
   the first one ended (reaching a stale memory), defeating the "juke it" mechanic the design
   promises. Tested (6 tests): loudness ordering, distance attenuation, a quiet distant player never
   triggers, a loud nearby one does and latches correctly, it beelines to the memory even after the
   player relocates and goes silent, and reaching a stale memory does not instantly re-trigger.

3. **The Warden** (`warden.mts`) — territorial, pure geometric containment with ONE-SIDED hysteresis:
   entering the bare rect is always hostile; leaving is hostile-until-clear-of-rect-plus-margin ONLY
   if it was already hostile (standing just outside a rect you never entered never spontaneously
   aggros). This is the literal "bait it to the doorway" contract — no random aggro fuzz anywhere.
   Tested (5 tests) including the full approach/enter/retreat-to-doorway/clear sequence and a
   displaced-warden-drifts-home patrol test.

   **Playtest finding, confirmed intended (not a bug):** the live playtest's own retreat trials
   (`wardenRetreat`/`wardenRetreatBhop`) both die, plain walking and bhop retreat alike, once the
   Warden is already hostile and chasing from deep inside its rect — at `WARDEN_SPEED` matching a
   real player's own pace, a retreat started only AFTER full aggro is a losing race, full stop. That
   is the design working as built, not a gap: the real counterplay is retreat-BEFORE-aggro, never
   after — the rect is a marked, learnable territory (the same "bare rect always hostile, leaving is
   hostile-until-clear-of-margin only if it was already hostile" contract above), so a player who has
   scouted or been burned once can see the boundary coming and simply not cross it, or bait the
   Warden to the doorway and stop short of the line rather than walking fully in and trying to out-run
   it afterward. The dread is deliberate: once you are actually caught inside, you are supposed to
   already have lost that gamble.

4. **The Toll** (`toll.mts`) — passive until its guarded item is taken; "triggered" is a MONOTONIC
   LATCH over the trace (bare presence of a `triggered` row, never a fold — the substrate's
   append-only-ness makes "permanent once" fall out for free). Once triggered: unconditional pursuit,
   no LOS/territory escape, until `ticksSinceLosBreak >= BREAK_TICKS_TO_CALM` (180 ticks = 3s of clean
   break) OR extraction. LOS tracking itself lives in `cartridge.mts` (a plain `castRay` position-to-
   position check, no FOV cone — a pursuing anomaly looks everywhere), fed into `toll.decideStep` as a
   count, keeping the module itself LOS-mechanism-agnostic. Tested (4 tests in `toll.test.mts`).

   **TOLL BALANCE FIX (playtest finding, live-verified, now fixed):** the live playtest found the
   Toll spawning AT its warded loot's own cell — level-gen.mts used to pair `{x: warded.x, z:
   warded.z}` directly — so once pickup/contact radii were accounted for, the real gap at the
   trigger instant measured only 0.71-0.89 units: both a stationary grab and a full-momentum
   grab-and-run died within 1-2 ticks, zero counterplay, contradicting this file's own "learn the
   rule, survive it" thesis. `level-gen.mts` now places the Toll instance a real, seeded,
   BFS-reachable distance from its loot (`TOLL_SPAWN_MIN_DIST`=3.0 to `TOLL_SPAWN_MAX_DIST`=4.5
   units), tuned by testing (`src/anomalies/toll-escape.test.mts`) against the actual numbers: the
   Toll's own chase speed (0.14 units/tick = 8.4 u/s) is deliberately faster than
   `MAX_GROUND_SPEED` (7 u/s), so flat sprinting mathematically can never out-distance it — only the
   game's own learnable bunnyhop/air-strafe tech (which does clear 8.4 u/s within a single hop
   cycle) does. At the tuned distance a well-executed running-start grab-and-run genuinely escapes
   (proven never caught, `toll-escape.test.mts`), while a stationary or flat-ground-speed grab-and-run
   still dies every time — the dread stays, only real skill escapes it. Fixing the spawn position
   also exposed a second, related bug: `cartridge.mts`'s pickup handler used to pair the pickup event
   to its Toll instance by exact position match (`a.x === slot.x && a.z === slot.z`), which the
   distance fix broke outright (the trigger would silently never fire); it now pairs by the
   instance's own deterministic id convention (`…:anomaly-toll`) instead.

5. **The Contested** — see §2; not a placed entity, the engine's own ⊤ mechanic used as content.

6. **The Echo** — **not built in v1**, a disclosed cut. The design's own spec (a translucent replay of
   a prior run reconstructed via `cartridge/replay`'s `defaultReplay`) is straightforward given the
   real replay contract now wired (`src/manifest.mts#verify`), but needs a place to STORE a prior
   run's intent log first (local `IndexedDB`/`localStorage`, since v1 has no server) — sequenced as
   the first Later item, not attempted half-built.

## 4. Extraction economy (`src/economy.mts`)

Loot is append-only (`pickUp` never removes from `carrying`); banking requires the EXPLICIT `extract`
intent while standing within `EXTRACTION_RADIUS` of a beacon (never mere proximity — walking past one
on purpose is a real, supported choice). Death (`die`) is a real terminal state: whatever is still
only `carrying` at that point is left exactly where it is — not moved, not deleted — `scoreOf` only
ever sums `banked`, so THE LAW (nothing erased) is satisfied without a special case. A run can only
end once (`extract`/`die`/`voidRun`/`tickCap` are all no-ops once `ended`).

**Persistence shape, decided honestly (Carrier Audit)**: v1 is TERMINAL-ONLY. There is no cross-run
persistent stash — no MUD-style server-backed bank, no Energy Bank integration. A run's score is the
summed value of what got banked before it ended; that score (plus the run's own intent log) is what a
future leaderboard would read. This is the "local-first, signed run submissions per cartridge replay"
shape the original brief names as the honest alternative to a server-backed bank — chosen because
standing up an actual replay-verifying leaderboard backend (durante's `POST /runs` pattern) is real
work with no reachable payoff without an actual leaderboard existing to rank against; sequenced as
Later, not silently pretended to exist. **What you carry is what you can lose** — stated on the
pointer-lock prompt before a run starts, never softened.

## 5. Amenities (`src/keymap.mts`, `web/js/*`)

Remappable keys with a CI-checked completeness table (`ACTIONS`, `validateKeymap` — every action
bound, no clashes; 5 tests). FOV slider (abrash's own `camera({fov})`, live). Mouse sensitivity
(browser-boundary scaling of `intent.turn` before it reaches the deterministic core). Accessibility:
`reducedMotion` disables the EXT-2 view-lift bob in favor of a small static offset;
`prefers-reduced-motion` sets its default. `reducedFlash` — see EXT-7 below for why this is an
honest approximation, not the real thing, in v1. Run stats sourced directly from the run's own
`GameEvent` stream (never a shadow counter).

## 6. Rendering register

Palette discipline unchanged from abrash's own (t=green/f=dark-red/⊤=yellow-seam/⊥=grey) — load-
bearing information, kept. EXT-6 (the already-defined-but-unused `"not-tint":"tint"` converse pair)
and EXT-5 (module-level SKY/FLOOR/FOG constants, not `opts` fields) remain real, small, PROPOSED
abrash extensions — not exercised in v1's actual rendering path (the browser face uses abrash's
default palette as-is); listed here as still-real gaps for the abrash owner lane rather than claimed
as done.

## 7. Extensions (for the abrash owner lane — proposed, not applied to abrash's tree)

- **EXT-1** — Movement kernel is a new BNSF module (`src/movement.mts`), not an abrash change.
- **EXT-2** — Vertical view-lift (`web/js/render.mjs`) is a canvas-compositing trick, not an abrash
  change — abrash has no pitch/eye-height field to add verticality to.
- **EXT-3** (implemented, `src/ext/collision-per-voxel.mts`) — per-voxel contested-pass override:
  `movePerVoxel`/`occupiedPerVoxel` re-derive only the small per-axis-slide SHAPE abrash's own
  `move`/`occupied` already have, calling abrash's REAL, unmodified `blocks(charge, opts)` once per
  cell with a freshly computed `passContested` from a caller-supplied `passContestedWhere(subjectKey)`.
  Wired all the way through `movement.mts`'s `stepMovement` and used live by the game (§2's Contested
  reflip sites). Proposed upstream: `blocks(charge, opts, subjectKey?)` reading an optional
  `opts.passContestedWhere`, defaulting to today's global `opts.passContested` — fully backward
  compatible, would let this whole adapter file be deleted.
- **EXT-4** (implemented, `src/ext/doors.mts`) — ordinary doors need NO abrash change: reuses
  demon.mjs's own `functional` hook on an `open` predicate. Not currently placed in any generated
  level (v1's levels have no doors), but real, tested (6 tests), and ready for a future level-gen pass.
- **EXT-5** (proposed only) — `raycaster.render()`'s `SKY`/`FLOOR`/`FOG` are module-level constants,
  not `opts` fields — a real gap for a game wanting to retint its palette without forking the file.
- **EXT-6** (unexercised hook, not a change) — `world.mjs`'s `CONVERSE` map already defines
  `"not-tint": "tint"` with no current consumer.
- **EXT-7 (new, found during this build)** — abrash's raycaster computes the ⊤ shiver's pixel offset
  via a module-private `shiverOffset(phase)` with no `opts` field exposing its amplitude. A game that
  wants a genuine reduced-flash mode (clamp the shiver amplitude to 0, not just dim it) cannot do so
  through any published abrash API today. BNSF's v1 `reducedFlash` (`web/js/render.mjs`) is an HONEST
  approximation instead: composite the frame at partial opacity over the letterbox fill color, which
  provably damps whatever on-screen amplitude any phase-varying signal reaches by the alpha factor —
  real, measurable, but not amplitude-zero at the source. Proposed: a small, additive, opt-in
  `opts.shiverAmplitude` (default 1, matching today's behavior) would let this workaround be deleted.

## 8. Multiplayer judgment (unchanged from the original brief, re-affirmed as-built)

A solo run with cartridge-verified replay is the honest v1. qwzspace's real value (rooms, live intent
log, resume) is genuine but adds transport/presence/resume surface this game's core loop doesn't need
to prove, and durante's own `mergeArena` precedent ships as one static pre-merged world, not two live
sessions. The Echo (§3.6) would get the FEEL of shared presence using only cartridge's already-
required replay contract — deferred (see §3.6) because it needs a storage layer first, not because
the judgment changed. Live co-op extraction stays a legitimate Later item, gated on an actual
decision to build it.

## 9. Naming

**Hostname: `fearful.561.group`**, not `bnsf.561.group`. "BNSF" collides with a large, unrelated real
trademark (BNSF Railway) — coincidental, but exactly the kind of unrelated-brand-confusion the house's
own naming passes exist to avoid. `fearful.561.group` is short, thematically direct, collision-free,
and matches the single-evocative-word convention every live subdomain already uses (crucible,
solitaire, ruinfold, durante, farstone, aletheon). The engineering identity stays
`be-not-so-fearful-service`/`bnsf` throughout the codebase (package name, directory, doc headers) —
display name and engineering identity are expected to diverge, per the TileSlots/VaultMaze precedent.
The display title itself, **Be Not So Fearful**, is the owner's own coinage — it stands as given.

## 10. Deploy

Follows the runbook pattern: `FROM node:24-slim`, `COPY . .` (vendored `node_modules`), `CMD ["node",
"src/server.mjs"]`, the PORT/HOST convention (`PORT` env, `HOST=0.0.0.0`),
`gcloud run deploy be-not-so-fearful --source ".../services/be-not-so-fearful-service"
--min-instances 0 --max-instances 2 --cpu 1 --memory 256Mi`. No persistence-backend selector env var
— v1 has no server-side state at all (see §4's honest terminal-only economy), unlike ruinfold/
durante/farstone/aletheon's bucket-backed services. **Flag for early profiling**: the static per-tier
level fold (1,000–3,000+ voxels) happens once per tier per server process via `staticGridFor`'s
module-level cache — cheap per request after the first, but not yet measured under real concurrent
Cloud Run traffic at this memory tier. Add the hostname to the Cloudflare router's `ORIGIN_BY_HOST` +
`wrangler.jsonc`, verify with `frontdoor-walk.mjs` (a real `/` redirect, confirmed — see README.md).

**Dependencies** (zero-external-runtime, exact pins): `@red-cup-engineering/abrash@0.1.1`,
`@red-cup-engineering/cartridge@0.2.0`. No `qwzspace` in v1 (§8). `.mts` tests via `node --test`;
`check-mts.mjs` vendored (a real gap found during this build: its own header names a canonical copy at
`flickering-delve-service/check-mts.mjs` that no longer exists at that path in this tree — every
sibling copy, including this one, is still byte-functional and mutually near-identical, just pointing
at a moved/retired canonical source; not fixed here, as it touches every sibling service's own file,
outside this service's remit).
