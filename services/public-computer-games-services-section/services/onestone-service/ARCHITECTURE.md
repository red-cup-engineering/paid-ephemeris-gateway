# onestone-service (TileSlots) — architecture

Companion to `DESIGN.md` (module contracts), `TILESLOTS-DESIGN.md` (rendering/juice/saga-map spec),
`ROADMAP.md`, `DEPLOY.md`, and `README.md`; written against the house
[Specification Standard](../../../../../../../../../561-group-gaming-enterprises-services-section/content/text/documents/articles/notes/house-specification-standard.md).

## 1. Introduction and goals

onestone (storefront name **TileSlots**) is a browser match-3 whose differentiator, per
`DESIGN.md`, is "the one thing no incumbent has touched in a decade: the grid itself." Chapter 1 is
an onboarding-free square 8×8 board; chapter 2 moves to hex; chapter 3 to rhombille — the same one
match/cascade engine (`engine.mts`) runs every tiling unmodified, because every tessellation
compiles down to one shared `BoardGeometry` (`types.mts`, `tiling-core.mts`). This is the fleet's
second-generation service: its `DESIGN.md` inherits flickering-delve-service's doctrine — a pure
domain layer, one stateful scene, one thin native-HTTP transport, a `PaymentProvider` boundary
behind a balanced double-entry ledger.

## 2. Constraints

- **Determinism.** `seed.mts` (FNV-1a `hashSeed` + mulberry32 `makeRng`) is the only randomness
  source `engine.mts` and `levels.mts` consume. `Math.random()` appears nowhere in `src/`; the one
  `Date.now()`-adjacent call site is `payments.mts`'s default `date` constructor parameter, an
  injected default at the impure boundary, always overridable and never called from inside a pure
  function.
- **Zero runtime dependencies beyond the pinned `@red-cup-engineering/*` house exception.**
  `package.json` depends only on `@red-cup-engineering/cartridge` (installed from the local
  Verdaccio registry via the project-level `.npmrc`), per the house standard's exception for
  vendored `@red-cup-engineering/*` packages. `sideEffects: false` and Node builtins otherwise.
- **One stateful scene.** `scene.mts` is the sole mutable-state module: "Every other module in this
  repo is a pure function of its arguments... This module is where that purity earns its keep."
  `engine.mts`, the largest domain module, is entirely pure: every exported function takes its
  geometry/state as a parameter and returns a fresh object, and no code path mutates a passed-in
  `BoardState`/`BoardGeometry`.
- **Vendor, don't import.** `ledger.mts` and `payments.mts` are near-verbatim ports of
  flickering-delve-service's own modules (same `PaymentProvider` boundary, all three adapters, the
  same settle/idempotency logic), retargeted onto `types.mts`'s shared `Sku`/`Order` — the house
  pattern of vendoring a copy rather than importing across services.

## 3. Context

Deploys as `onestone.561.group`; listed in `play.561.group/catalog.json` as `"onestone"` /
displayName `"TileSlots"`. `DEPLOY.md` documents a Google Cloud Run target (`--max-instances 1`,
`--session-affinity`).

## 4. Solution strategy

"The board is a graph, not a grid." One compiler (`tiling-core.mts::compileGeometry`) turns any
tiling's unit-scale polygon output into a shared, tiling-agnostic `BoardGeometry`: shared-edge
adjacency (discovered by canonical quantized edge keys, never proximity or shared vertices — a
corner-touch at a square-grid diagonal must *not* count as adjacency), a baked `fallTo`/`fallFrom`
+y gravity field (not a live physics sim, because settle order must be exactly reproducible), and
precomputed straight-line `rails` generalizing "row/column" to any tiling via a 30°-tolerance
"opposite-ish neighbor" walk. `engine.mts` never branches on `TilingKind` — the string literals
`'square'`/`'hex'`/`'rhombille'` appear nowhere in `engine.mts`, only in `tiling.mts`'s one
dispatch switch and the three `tiling-*.mts` cell producers.

## 5. Building block view

| Module | Pure? | Responsibility |
|---|---|---|
| `types.mts` | data only | The shared contract: `BoardGeometry`, `Tile`, `MatchGroup`, `CascadeStep`, `SettleResult`, `LevelSpec`, `PlayerMeta`, `Sku`, `ClientFrame`/`ClientInput` (the wire protocol) |
| `seed.mts` | pure | FNV-1a `hashSeed`; mulberry32 `makeRng` |
| `tiling-core.mts` | pure | `compileGeometry` — the one shared geometry compiler: edge-key adjacency, gravity-field baking with nearest-center contention resolution, rail-family extraction |
| `tiling-square.mts` / `-hex.mts` / `-rhombille.mts` | pure | Per-tiling `cells(size): RawCell[]` unit-scale polygon producers — the *only* tiling-specific code in the repo |
| `tiling.mts` | pure | `buildGeometry` registry dispatch; `defaultSize` per tiling |
| `engine.mts` | pure | The match/cascade heart: `spawnBoard` (rejection-sampled fill), `findMatches`, `legalMoves`, `applyMove`, `applyBooster`, the full special-blast/blocker-hit/settle-loop machinery |
| `validate.mts` | pure | The math QA oracle: `pebbleIndependent` (a real (2,3)-pebble game), `lamanCount` (the insufficient prefilter, kept for the double-banana demonstration), `meanCoordination`, `loadBearing`, `validateLevel` |
| `levels.mts` | pure (module-load-time generation) | The 60-level v1 ladder, generated by seeded rejection sampling against `validate.mts`'s own oracle; `rateLevel`, `goalProgressFrom` |
| `economy.mts` | pure | `PlayerMeta`; lives/regen (`tickLives`, lazy — no background clock); sparks soft-retry credits (`tickSparks`/`spendSpark`/`sparksAt`); `winReward`; the shard/prism booster shop; `SKUS`; `grantSku` |
| `progression.mts` | pure | Unlock frontier (`isUnlocked`), max-wise star bookkeeping, Lattice Garden trophy minting, `applyResult` — the single fold-point for a finished run |
| `ledger.mts` | pure (class) | `AuditLedger` — append-only double-entry audit journal, ported from flickering-delve |
| `payments.mts` | pure factories + manager class | `PaymentProvider` boundary, ported from flickering-delve, retargeted onto `types.mts`'s shared `Sku`/`Order` |
| `cartridge.mts` | pure | `@red-cup-engineering/cartridge` adoption: `OnestoneRunState`, `createEngine`/`applyIntent`/`replay`, wrapping `engine.mts`/`levels.mts`/`tiling.mts` unchanged |
| `cartridge.manifest.mts` | pure | The generated `CartridgeManifest` (one config per shipped level) and `verify`, built from the package's own `createVerifier` |
| `scene.mts` | **the one stateful module** | `SceneImpl` — per-account `PlayerMeta` + active `Run`; `login`/`frame`/`input`/`grantSku`; atomic-JSON persistence |
| `server.mts` | impure (transport) + injectable `ServerDeps` | Native `node:http`/SSE, structural `SceneLike`/`PaymentsLike`/`LedgerLike` interfaces so the module is independently testable; per-account FIFO input queue; SSE stream caps; session rate limiting |
| `client.mts` | browser UI | `CLIENT_HTML` — single no-build document, the largest file in the service by a wide margin |

Identity is token-based: `scene.mts::slugAccount` plus `SceneImpl`'s own `login()`/session `Map`
provide the identity layer, wired through every `server.mts` route. Every module above ships a
co-located `.test.mts`, plus two cross-cutting suites (`engine-topology-specials.test.mts`,
`render-projection.test.mts`) that are not 1:1 with a single domain module.

`cartridge.mts`/`cartridge.manifest.mts` are not wired into `server.mts` or `scene.mts` — the
service's actual gameplay routes (`/session`, `/input`, `/stream`) run through `scene.mts`. The
cartridge modules are a second, standalone replay-verifiable read/write path over the same domain
modules (`engine.mts`, `levels.mts`, `tiling.mts`, none modified), scoped to one level attempt
(board state, moves, goal progress, the finished `LevelResult`) rather than the account-level
bookkeeping (wallet, lives, streak) `scene.mts`/`economy.mts` own. `cartridge.manifest.mts`'s
`manifest` export is consumed outside this service, by `play.561.group`'s catalog generation and
its own `validateManifest` schema check — it is real, external API surface for this package, not
dead code, even though nothing inside `onestone-service` itself calls it.

## 6. Runtime view

**Scenario A — a swap that fires a compound special pair, traced through the settle loop.**
`POST /input {token, input:{kind:'swap', a, b}}` resolves the account via the per-account FIFO
(`makeFifo()` — ensures two concurrent requests for the same account apply in arrival order to the
synchronous scene) and calls `scene.input(account, input)`. `dispatchInput` routes to `handleSwap`,
which calls `engine.mts::applyMove`: the two tiles swap, `findMatches` runs on the swapped state,
and — if at least one side carries a special — `swapFire` is built with the **post-swap** cell
positions (`aCell`/`bCell` name where each original tile *landed*, not where it started).
`settleLoop` then runs to a fixed point: each iteration calls `runStep`, which mints specials at
match origins, drains chained special fires via a BFS-style queue (`drainSpecials`), resolves the
swap's own compound pair through `fireSwapSpecials` (the four named pairs: striped+striped,
striped+nova, prism+prism, prism+striped; every other combination falls through to independent
solo fire, so no combination is ever silently dropped), resolves blocker hits (`resolveHits`,
direct-hit and adjacency-effect passes), falls tiles to a fixed point (`settleFall`), and refills
spawn mouths from the same seeded draw stream refill uses (`refill` → `drawColor`,
rejection-sampled, with an exhaustive deterministic fallback if every random attempt in
`paletteSize * 6` tries lands on an unsafe color). `scene.mts::applySettleToRun` folds the
resulting `CascadeStep[]` into goal progress via `levels.mts::goalProgressFrom`, and
`finishOrContinue` checks whether every goal is now met (or moves are exhausted) before deciding
whether the level just ended.

**Scenario B — level generation as a seeded search against the pebble-game oracle, not a formula.**
`levels.mts::buildChapter` walks 20 levels per chapter, feeding each level's *achieved* mean
coordination forward as the next level's floor (never regressing the ramp). For each level,
`buildBlockers` sweeps blocker counts upward, at each count sampling several random placements via
the level's own in-module mulberry32 RNG, calling `validate.mts::blockerEdges` then
`pebbleIndependent` on the resulting constraint graph, and keeping whichever independent layout
minimizes the gap to the target mean coordination — never the first layout that merely clears a
threshold. `buildLevel` then runs the whole candidate `LevelSpec` back through
`validate.mts::validateLevel` (which independently re-derives the geometry, spawns the board,
applies blockers, and checks palette bound / legal-move existence / pebble-independence /
coordination-within-0.05 / goal achievability), retrying with salted reseeds up to 12 times if
validation fails. The 60-level `LEVELS` export is a module-load-time computation, and
`levels.test.mts`/`validate.test.mts` assert all 60 pass `validateLevel` as the final word.

**Scenario C — a `/pay` purchase resolving synchronously through the mock provider.** `POST /pay
{token, skuId}` calls `payments.intent()` then immediately calls
`payments.settle(intentResult.orderId)` in the same request — for the mock provider this clears
instantly — and the route calls `scene.grantSku(grant.order.account, grant.sku)` before responding.
`scene.mts::grantSku` calls `economy.mts::grantSku` (a pure switch over the SKU's bounded `grant`
union — `prisms`/`booster`/`lives`/`pass`, never anything else, enforced by TypeScript's
exhaustiveness check) and emits the updated frame to any subscribed SSE stream.

## 7. Deployment view

`node src/server.mts`; `ONESTONE_PORT`/`PORT`, `HOST`, `ONESTONE_SAVE`, `ONESTONE_LEDGER`, the same
three provider credential sets as flickering-delve. `DEPLOY.md` documents a Cloud Run target with
an explicit correctness rationale for `--max-instances 1` ("game state lives in one process
(tmpfs save file). Do not raise it until the roadmap's durable-store work lands") and a stated
pre-condition for enabling real payment credentials (durable state must exist first, *and* the
shared-vs-separate Stripe identity decision named in `ROADMAP.md` must be made).

## 8. Crosscutting concepts

- **Replay verification.** `applyMove` and `applyBooster` are pure and deterministic given
  `(geometry, state, move)`, which is what makes replay possible: `src/cartridge.mts::replay`
  delegates to `@red-cup-engineering/cartridge/replay`'s `defaultReplay`, and
  `src/cartridge.manifest.mts::verify` is the standalone
  `(seed, configId, intents) => {valid, finalState, events, stateHash}` function a settlement
  backend or the storefront's audit page can call. `cartridge.test.mts` asserts the determinism
  property directly: same seed + same intent log, replayed twice, yields byte-identical
  `finalState` and `stateHash`.
- **Ledger invariants.** `AuditLedger.record` refuses unbalanced entries. `payments.mts::Payments.settle`
  posts only to `assets:cash:{provider}` / `income:premium` — an income-only posture, since no
  `liabilities:*`/`expenses:payout:*` account family exists here (there is no payout direction to
  account for).
- **Ethics as executable tests.** `types.mts`'s doc comment on `Sku['grant']` states the constraint
  in the code itself: never a flat resource grant, never a level-solvability shortcut (solvability
  is a validated mathematical property of the board; selling around it would falsify the game's own
  math claim). This is enforced structurally by `validate.mts::validateLevel` gating every one of
  the 60 shipped levels at generation time (Scenario B), and the shop (`economy.mts::SKUS`) has no
  grant kind that could touch board solvability at all — the TypeScript union makes an unbounded
  grant a compile error, not a review-time judgment call. `economy.test.mts` and `levels.test.mts`
  assert pieces of this directly.
- **Accessibility.** `TILESLOTS-DESIGN.md` §1.4 specifies a `prefers-reduced-motion` fallback for
  screen shake (a single flash-white frame instead) and a color-blind-considerate palette
  requirement (distinct lightness + glyph per color). These are specified but not yet implemented:
  `client.mts` still renders via inline SVG + CSS transitions, the pattern `TILESLOTS-DESIGN.md`
  names as the gap to replace with layered Canvas 2D.

## 9. Decisions

- **Rejection-sampled fill, not a proper graph coloring.** `engine.mts`'s header is explicit: fill
  is NOT a proper coloring of the adjacency graph in the graph-homomorphism sense.
  `chi(K4)=4` and the 5-color headroom are real, useful facts about the palette size; "graph
  homomorphism into K_palette" does not accurately describe what `wouldCreateMatch` enforces.
- **Cascade termination is graph-theoretic acyclicity, not Knaster–Tarski.** `engine.mts`'s header:
  refill injects brand-new RNG-drawn tiles every round, so there is no fixed lattice for
  Knaster–Tarski to apply to. The actual reason the happy path terminates is that
  `tiling-core.mts`'s `fallTo` requires strictly-greater-y alignment, so the fall graph is acyclic
  and every tile can fall only a bounded number of times.
- **`server.mts` takes every collaborator as an injected structural interface** (`SceneLike`,
  `PaymentsLike`, `LedgerLike`, declared locally rather than imported as values from
  `scene.mts`/`payments.mts`) rather than importing concrete siblings at module scope. The concrete
  wiring happens only inside `main()`, gated by `isMain()` so it never runs on import —
  `server.test.mts` exercises the whole route surface against mocks with none of the concrete
  sibling modules present.
- **No standalone `accounts.mts`.** Account identity lives entirely in `scene.mts::slugAccount` plus
  `SceneImpl`'s own `login()`/session map. A separate `accounts.mts` module existed briefly as an
  independently-maintained port of the same slug-and-bearer-token pattern; nothing ever called it,
  so it was deleted rather than wired in, to avoid a second implementation of already-correct,
  already-tested identity code.

## 10. Quality

Run `npm test` (`node --test src/*.test.mts`) for the current pass/fail state — this document does
not pin a test count, since one goes stale the moment a test is added or a module is touched. The
suite includes real property tests, not only fixed examples:
`validate.test.mts::"double banana: lamanCount passes... but pebbleIndependent rejects it"` is the
textbook independence-vs-count-sufficiency demonstration running as an executable assertion;
`tiling-core.test.mts::"grid tiles the plane with no gaps or overlaps: every non-boundary edge is
shared by exactly two cells"` is a structural invariant over the compiled geometry itself, checked
for all three shipped tilings; `levels.test.mts` asserts all 60 generated levels individually pass
`validateLevel`, a compound property check, not a single assertion.

## 11. Risks and technical debt

1. **`TILESLOTS-DESIGN.md`'s renderer/accessibility spec** (layered Canvas 2D, reduced-motion
   fallback, color-blind palette) is specified but not yet built against the SVG/DOM client that
   ships today.
2. **Lives are a hard gate.** Starting a level at 0 lives is refused outright; recovery is the
   30-minute regen or the `life-refill` SKU. `TILESLOTS-DESIGN.md` §4.3's sparks system softens the
   very next retry after a loss without touching this gate, but the hard gate itself remains — a
   real, named exception to the house's "no hard gate" ideal.
3. **Stripe identity decision (shared vs. separate account across the fleet) remains open**, per
   `ROADMAP.md`'s "Ops decisions to make before production" — `payments.mts`'s stripe adapter is
   identity-agnostic today (it takes a bare `secretKey` string, no fleet-identity concept baked in),
   so nothing in code forces the decision, but nothing resolves it either.
4. **Season-pass storefront UI is unbuilt.** The economy models the grant (`passUntil` raises the
   life cap); nothing sells it yet.
5. **`@red-cup-engineering/energy-bank` is not adopted.** `ledger.mts`/`payments.mts` are real but not
   wrapped as `EnergyHooks`; the cartridge manifest's `energy` field is left absent rather than
   wired to a not-yet-consumer-ready package.

## 12. Glossary

**Rail** — a maximal straight chain of cells generalizing "row/column" to any tiling
(`tiling-core.mts`). **Chaos Six** — the Ramsey-inspired (not Ramsey-computed) tuned threshold: 6+
concurrently-live specials trigger a guaranteed score-burst. **Mean coordination** — `2E/N` over the
blocker constraint graph, the rigidity-percolation difficulty dial ramping toward the
Phillips–Thorpe isostatic point 2.4. **Lattice Garden** — the per-chapter completion trophy case
(`progression.mts::gardenPieces`).

## 13. Theory binding

Six mechanics are load-bearing on proved or published mathematics, each honestly labeled by
`DESIGN.md`/`README.md` themselves. None of these cite `@red-cup-engineering/math`; onestone's math
binding is to general graph-theory/rigidity-theory results (Laman's theorem, the
Jacobs–Hendrickson pebble game, Ramsey's theorem, chromatic number) implemented as this service's
own code.

1. **`validate.mts::pebbleIndependent` is a real, unmodified implementation of the
   Jacobs–Hendrickson (2,3)-pebble game** deciding independence in the generic 2D bar-joint rigidity
   matroid (Laman's matroid, rank `2n−3`). `lamanCount` is kept specifically because it is
   insufficient, to make the double-banana counterexample runnable as a test (`validate.test.mts`).
2. **`meanCoordination`/the level-generation ramp cite the Phillips–Thorpe isostatic point (⟨r⟩ =
   2.4) as a real, provably continuous (second-order) rigidity-percolation transition**, and
   `levels.mts` ramps every chapter's blocker graph toward it — "no difficulty cliffs by
   construction" is a direct, checkable consequence of which side of 2.4 a level's graph sits on,
   not a tuning assertion.
3. **`chi(K4)=4` genuinely lower-bounds the palette at king-adjacency junctions** — real as a fact
   about the palette-size bound. The fill algorithm itself does not perform a graph coloring; see §9.
4. **Cascade termination's real citation is fall-graph acyclicity, not Knaster–Tarski** — see §9.
5. **Chaos Six (threshold 6) is Ramsey-*inspired*, not Ramsey-*computed***. The engine counts
   concurrently-live specials against a threshold; it never constructs the compatible/incompatible
   edge-2-coloring `R(3,3) ≤ 6` is actually a theorem about — the module's own header is explicit
   about this, and no six-way relation is ever constructed anywhere in `engine.mts`.
6. **Ring specials exist because cycles exist on hex/rhombille and provably cannot on square** — a
   real, checkable graph-topology fact (`closesRing`'s bounded-interior test), a genuine structural
   property of the compiled `BoardGeometry` itself, not a citation to external published mathematics.

## 14. Ludics

- **Core loop.** Swap → match → mint/blast → fall/refill → rescan-to-fixed-point → (level end check).
  Traced in Scenario A. The loop is a conventional match-3 shape at the mechanical level; the
  differentiator is entirely in what geometry the loop runs over (§4).
- **Skill expression.** Two real axes: (1) ordinary match-3 tactical play (setup, combo chaining,
  reading the board) — unchanged by which tiling is active, since `engine.mts` never branches on
  it; and (2) **topology literacy**, a genuinely new axis no other match-3 has: recognizing when a
  hex or rhombille board's cycle structure permits a `ring` special that would be geometrically
  impossible on square (§13 item 6). Whether players actually perceive and use this second axis is
  an open design question — the mechanic is real and present in the engine; its skill-legibility to
  a real player has not been validated by playtesting.
- **Session shape.** Bounded — a level, with a fixed move budget (`movesFor`, 18-30 per
  `levels.mts`'s chapter ramp) and a hard win/loss resolution per attempt. This is structurally
  different from flickering-delve's unbounded session and shapes retention design toward "come back
  for the next level," not "check in on an always-running system."
- **Retention surfaces.**
  - *Lives* (`economy.mts::tickLives`, cap 5/8, 30-min regen) — a hard gate today (starting a level
    at 0 lives is refused outright), the pattern the genre's market critiques most often as
    predatory friction; `TILESLOTS-DESIGN.md` §4.3's sparks system is the non-monetary soft-retry
    fix layered on top (§11 item 2).
  - *Star ratings and streak bonus* — `winReward`'s bounded quadratic-in-stars formula, with a
    capped streak window (10 wins) so streak farming plateaus rather than compounding forever
    (`economy.test.mts`).
  - *Season pass* — real (`passUntil` raises the life cap to 8), but its storefront UI is roadmap
    ("Settling Pass UI," `ROADMAP.md`) — the economy models the grant; nothing sells it yet.
  - *Lattice Garden* — permanent, monotonic trophy tracking (`progression.mts::gardenPieces`), no
    gate, no expiry — the house's "progress is permanent, never a shrinking bar" retention posture.
- **Kind-design constraints enforced.** No level-solvability shortcut is *structurally* possible to
  sell (§8, §13 item 1) — an ethics constraint enforced by the type system itself, not merely policy.
  Lives remain a real, named exception to the "no hard gate" ideal.

## Roadmap

**Finished means** (per `the-suite-and-the-studio.md` directive 4): complete + polished + no
live-ops dependency + content pipeline documented. onestone meets three of four today — complete
(60 levels, three tessellations, full economy) and polished (real payment adapters, a documented
deploy path) hold; "no live-ops dependency" holds in the sense that nothing about play requires a
running live-ops team, though the season-pass storefront UI is still unbuilt; "content pipeline
documented" holds for levels (`levels.mts`'s generator is itself the pipeline, re-validated at
build time) but not yet for tessellation chapters beyond the shipped three (Cairo/Penrose/hat/Wang
each need their own, not-yet-written cell-producer pipeline, §"Later" below).

**Now**: three tessellations on one tiling-agnostic engine, 60 pebble-game-validated levels, real
Stripe/Hive payment adapters with a documented Cloud Run deploy path, topology-native special
pieces per `TILESLOTS-DESIGN.md`'s own parity check, and a replay-verifiable
`@red-cup-engineering/cartridge` adoption (`src/cartridge.mts`/`cartridge.manifest.mts`) with a
generated, all-60-levels manifest.

**Next** (scoped, buildable with no new design decision required):
- Build the layered-Canvas-2D renderer and `projectFrame` pure-function seam per
  `TILESLOTS-DESIGN.md` §2 — the spec is already written in implementable detail, including the
  exact `RenderCommand`/`Tween` shapes.
- Extend `cartridge.mts`'s intent set to cover boosters bought with wallet currency (today's
  cartridge scope is board-level only, per its own header — a future pass could fold in
  `economy.mts`'s `buyBooster`/`buyBoosterWithPrisms` as intents if a full-session, not just
  full-level, replay becomes a real product need).

**Later** (blocked on a decision or dependency that doesn't exist yet):
- Cairo/Penrose/hat/Wang chapters (`ROADMAP.md`'s tessellation ladder rungs 4-7) — each needs its
  own cell-producer and, for the aperiodic rungs, offline deflation-asset baking; genuinely new
  content-authoring work, not a rewrite.
- Wrap `ledger.mts`/`payments.mts` behind `@red-cup-engineering/energy-bank`, once that package is
  ready for consumers.
- The Stripe shared-vs-separate identity decision — blocked on a board decision, not engineering.
- ZBD reward-loop adoption — `zbd-micropayment-rails.md` §11 names onestone as a natural flagship
  for this rail specifically because its replay/validate machinery is well-suited to proof-of-play;
  `cartridge.mts` is exactly the replay-verified proof-of-play artifact that adoption would consume.
