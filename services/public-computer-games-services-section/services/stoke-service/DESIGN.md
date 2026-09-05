# Stoke — design document

**stoke.561.group** — the kind incremental: an idle game whose prestige multiplier is not an
authored curve, it is the dominant Perron–Frobenius eigenvalue of the production matrix the
player actually built, computed by real power iteration, with the prestige "loadout" being
literally the eigenvector.

## Identity

The genre's usual hook — number goes up, curve compounds, prestige resets and multiplies — is
kept. What's removed is the part most idle games hide: that the compounding curve, the prestige
multiplier, and the "optimal" build order are all hand-tuned numbers picked to hit a target
session length. In Stoke, the player's own choice of what feeds what (a real, player-built
directed graph with reinvestment rates on the edges) *is* the economy — there is no second,
authored curve running underneath it pretending the graph is cosmetic.

## The disclosure discipline

Computed and authored numbers can coexist as long as the game never lies about which is which.
That rule is made into an actual type (`src/provenance.mts`'s `Tagged<T>`) every number reaching
the UI is forced through. There are exactly two provenances, never a silent third:

| Provenance | Meaning | Examples in this build |
|---|---|---|
| `computed-from-your-graph` | The direct output of real linear algebra over the player's own production graph — nobody hand-tuned it. | Every node's stock (`(I+M)^n` applied to the graph, `src/tick.mts`); prestige's `lambda` and `mixture` (power iteration, `src/eigen.mts`). |
| `designed-flavor` | A designer-chosen constant or curve. May be *informed* by a computed number, but its shape was authored. | `BUILD_COST`/`CONNECT_COST`/`UPGRADE_COST` (`src/intents.mts`); the prestige starting-stock bonus curve (`src/prestige.mts`). |

`provenance.mts`'s `combine()` is the only sanctioned way to mix a computed and an authored value,
and its result is always re-tagged `designed-flavor` — a value touched by even one authored input
carries the weaker label, by construction.

Notes on the underlying math:

1. `@lenticule-science/metrologic`'s documented `./spectral` subpath is polynomial-only (exact ℤ/ℚ root
   location) and never touches a matrix or eigenvector. `@lenticule-science/metrologic/verdier/spectral`
   (`isPrimitive`, `perronPoly`, `perronConvergent`) does have real dominant-eigenvalue machinery,
   but is built on unary (von-Neumann successor-chain) integers with no magnitude cap and is
   unusable at game-relevant matrix sizes (`src/eigen.fixture.test.mts` characterizes this).
   `src/eigen.mts` is this engine's own pure, floating-point power-iteration module; the exact
   tools are used only offline, in that fixture test, never on the hot path.
2. A purely acyclic production graph (no reinvestment loop) is nilpotent — every eigenvalue is
   exactly 0. `assessGraphMatrix` (`src/eigen.mts`) gates this honestly: prestige is refused, not
   fabricated, until the player closes at least one real loop. The starter graph ships acyclic on
   purpose (Wood → Plank → Furniture → Gold, no loop).
3. A dead-end node (fed, feeds nothing back) cannot move `lambda` — a reducible matrix's dominant
   eigenvalue is the max over its irreducible blocks, and a dead-end's own block is the 1×1 zero
   matrix — but it is not dropped from the eigenvector; it claims a real, nonzero slice of the
   prestige mixture. `pf-edge-cases.test.mts` exercises this directly.
4. Negative-synergy edges (a building whose output actively drains another's) are not
   representable in a `ProductionGraph` at all — `graph.mts`'s `assertValidGraph` throws
   `NegativeEdgeRateError` at construction: Perron–Frobenius's positivity guarantee does not
   survive a negative entry. A "pollution" mechanic, if ever wanted, should be modeled as a
   separate, `designed-flavor`-tagged penalty applied to displayed output after `lambda` is
   computed, never inside the matrix `lambda` comes from.

## Module map (pure unless noted)

- `src/graph.mts` — `ProductionGraph` (nodes + edges, data only), `toMatrix`/`baseVector` (the one
  place a graph becomes the `number[][]` linear algebra actually runs on).
- `src/eigen.mts` — `dominantEigen` (power iteration; `lambda` + eigenvector + convergence
  history) and `assessGraphMatrix` (the validity gate: nonnegative, and a real cycle).
- `src/tick.mts` — `advance(state, fromTs, toTs)`: the whole stock-evolution story, one call,
  whether the elapsed gap is a second or a season, via `(I+M)^n` computed by binary exponentiation
  (never a per-tick loop, never a wall-clock read).
- `src/prestige.mts` — `previewPrestige`/`reset`: bank `(lambda, mixture)`, apply the disclosed
  `designed-flavor` starting-stock bonus, return to the starter graph.
- `src/provenance.mts` — the `Tagged<T>` type and the two-provenance discipline described above.
- `src/state.mts` — `StokeState`, the one plain-JSON value the whole game is a function of.
- `src/intents.mts` — the player's vocabulary (`build`/`connect`/`upgrade`/`prestige`/`tick`) as
  pure `(state, intent) -> {state, events}` reducers; the cost model, disclosed as `designed-flavor`.
- `src/cartridge.mts`/`src/cartridge.manifest.mts` — the `@red-cup-engineering/cartridge`
  adoption (`createEngine`/`applyIntent`/`replay`/`serialize`/`deserialize`, `CartridgeManifest`).
- `web/server.mjs` — zero-dependency `node:http` static server; strips `.mts` types for the
  browser, vendors `@red-cup-engineering/cartridge`'s subpaths, serves `GET /api/manifest`.
- `web/js/kernel.mjs` — the browser's one door into the domain engine: a straight re-export of
  `src/*.mts`, no reimplementation.
- `web/js/layout.mjs`, `web/js/format.mjs` — pure, unit-tested presentation helpers (graph
  geometry; number/provenance formatting) — no domain rule lives here.
- `web/js/render-graph.mjs` — the SVG production-graph canvas; draws only from a graph + stocks,
  invents no rule.
- `web/js/app.mjs` — the browser controller, and the one impure boundary in this codebase: it is
  the only file that reads `Date.now()`, and it does so once per real-time tick, to build a
  `{kind:"tick", toTs}` intent that `src/tick.mts`'s pure `advance` then consumes.

## Kind design — the executable rule, not just a promise

An idle game's offline progression must be a pure function of `(lastSeen, now)` parameters, never
wall-clock reads inside domain logic. This is the specific thing that makes the genre's classic
dark pattern (a resource that refills only by waiting, paired with a purchase that shortens the
wait) structurally impossible, and `src/kind-design.test.mts` checks it three independent ways:

1. **Static scan** — no domain `.mts` module's code (comments stripped first) contains
   `Date.now()`, `new Date()`, `setTimeout`, `setInterval`, or `performance.now()`.
2. **Static scan of the real reducer** — `applyStokeIntent`'s own `switch (intent.kind)` in
   `intents.mts` is parsed for its literal `case` labels (and `StokeIntent`'s declared union is
   parsed the same way), each asserted to be exactly `build`/`connect`/`upgrade`/`prestige`/
   `tick`: no `buy-energy`/`skip-wait`/`watch-ad`-shaped intent has a real handler wired up
   anywhere. The scan reads the actual source text of the reducer and the type declaration, not a
   fixture disconnected from either.
3. **Behavioral proof** — `tick.mts::ticksBetween(fromTs, toTs)` is the only function anywhere in
   this codebase that turns elapsed real time into elapsed game ticks, and its signature takes
   nothing else: no state, no purchase history, no player. The test mutates every piece of global
   state a hostile caller could reach (including monkey-patching `Date.now()` itself) between two
   calls and confirms the tick count is unaffected — there is no parameter through which a
   "speed-up" item could ever reach it.

`web/js/app.mjs` is the one legitimate exception to rule 1: an idle game's client has to read the
real clock somewhere to know what "now" is. The discipline is that the read happens once, at the
boundary, and is immediately turned into an ordinary `{kind:"tick", toTs}` intent — from that
point on, every downstream computation is the same pure function whether `toTs` came from a live
clock or a test fixture.

## The cost model, disclosed as what it is

Building a node, connecting an edge, and upgrading an edge each spend a flat, `designed-flavor`
amount of stock drawn from a node the player names (`BUILD_COST=10`, `CONNECT_COST=5`,
`UPGRADE_COST=3`, `src/intents.mts`) — an ordinary idle-game currency sink: nothing regenerates on
a timer, nothing is sold for real money, every cost is paid out of stock the player already
produced by playing. `MAX_EDGE_RATE=0.1` is a genuine numerical-stability ceiling, not a balance
choice, but it is not by itself sufficient: one-second-tick compounding can still overflow float64
within an ordinary offline gap. `tick.mts` clamps every matrix entry and every stock to a finite
ceiling (`STOCK_CLAMP = 1e250`) after every multiplication, chosen to sit far above anything a
real graph produces so it only engages once growth is already past the point of being a
meaningful number; `intents.mts`'s `spend()` also independently refuses any non-finite balance, as
a second layer. See `tick.mts`'s and `intents.mts`'s own headers for the full account and the
regression tests (`tick.test.mts`, `intents.test.mts`) that pin this down.

## Cartridge-native from day one

`src/cartridge.mts` implements the `@red-cup-engineering/cartridge` contract directly against
`src/intents.mts`'s single reducer (`applyStokeIntent`) — there is exactly one implementation of
every verb in this codebase, never a second copy wrapped for the contract. `createEngine(seed)` is
a pure function of seed, anchored at the epoch (`nowTs = 0`); every subsequent moment in a run is
an explicit `tick` intent carrying its own `toTs`, never a fresh clock read inside the engine.
`replay` delegates to the package's own `defaultReplay`. `cartridge.test.mts` proves same-seed,
same-log determinism (`stateHash` equality) end to end, and the browser client (`web/js/app.mjs`'s
"Verify replay" button) re-runs the identical check live against the running session's own intent
log.

This engine currently has no randomness anywhere in its domain logic (the production graph,
ticks, and prestige are all deterministic functions of the player's own choices and injected
timestamps), so two different seeds produce byte-identical play today except for the `seed` field
itself carried in `StokeState`. It is threaded through end to end anyway because the cartridge
contract requires `createEngine(seed)` to be a real seed-parameterized function and because a
future seeded event would need the wiring already in place.

## Deliberately omitted (not stubbed)

- **`regime` on `CartridgeManifest`** (a computed `finite`/`scott`/`transfinite`/`aperiodic`
  field): proposed but not adopted — cartridge schema changes get one deliberate pass rather than
  picking up a field ahead of that decision.
- **`energy` on `CartridgeManifest`**: this build has no real-money surface at all — no payout, no
  ad settlement, nothing `@red-cup-engineering/energy-bank`'s `EnergyHooks` would wrap. If that
  ever ships, the manifest gains an `energy` block then, not a placeholder now.

## Playtest: does topology actually earn different lambda?

Two players who spend the same "budget" of upgrades on differently-shaped graphs get genuinely
different, honestly computed prestige multipliers — not two numbers that happen to differ in the
fifth decimal. Driven through the real engine, starting from the acyclic starter graph, each
spending exactly 10 upgrade-intents:

| Topology | Shape | `lambda` (computed) |
|---|---|---|
| A | Tight 2-cycle: `wood <-> plank`, all 10 upgrades on those 2 edges | 0.0645 |
| B | Long 4-cycle: `wood -> plank -> furniture -> gold -> wood`, 10 upgrades spread evenly over 4 edges | 0.0388 |
| C | Same tight 2-cycle as A, plus `furniture`/`gold` left as an unconnected dead-end branch | 0.0645 (identical to A) |

Concentrating the same upgrade budget into a short, tight loop (A) earns about 66% more `lambda`
than spreading it across a long loop (B) — a structural consequence of matrix exponentiation (a
shorter cycle's per-step compounding dominates faster), not an authored "shorter is better" rule.
Topology C confirms the dead-end-mixture-share property (`pf-edge-cases.test.mts`'s Graph C):
adding an unconnected branch doesn't move `lambda` at all (A and C are identical on that front)
but does dilute the prestige mixture, since `furniture`/`gold` still claim a real, nonzero share
even though they contribute nothing to growth.

## Known limitations

See `README.md`'s "Known limitations" section.
