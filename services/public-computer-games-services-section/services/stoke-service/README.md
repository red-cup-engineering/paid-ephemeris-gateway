# stoke.561.group — Stoke

An idle/incremental game where prestige is not an authored curve — it is the dominant
Perron–Frobenius eigenvalue of the production graph the player actually built, computed by real
power iteration (`src/eigen.mts`). The prestige "loadout" is literally the eigenvector: the fixed
mixture the graph regrows itself in if ticked forever without resetting. See `DESIGN.md` for the
math behind that and the disclosure discipline it's built on.

**No dark patterns, structurally.** No payments, no ads, no energy system, nothing that
regenerates only by waiting. `src/kind-design.test.mts` checks this three independent ways: a
static scan proving no domain module reads the wall clock or schedules a timer, a static scan of
the real `applyStokeIntent` reducer proving no `buy-energy`/`skip-wait`-shaped intent has a
handler wired up, and a behavioral proof that `ticksBetween` (the one function turning elapsed
real time into elapsed game ticks) ignores all state and purchase history by construction.

## Run it

```
npm install
npm run check && npm test   # node --check on every src/web file, then node --test
npm run serve    # http://localhost:8794/ (or: node web/server.mjs <port>)
```

Open `http://localhost:8794/` in a browser. Every game action (build/connect/upgrade/prestige/
tick) is persisted as an intent log in `localStorage`; reopening the tab replays that log plus one
catch-up `tick` intent to the current time, via the same `advance(state, fromTs, toTs)` offline-
progression path `src/tick.mts` uses for every ordinary tick.

## The disclosure discipline — every number tagged, never both

`src/provenance.mts`'s `Tagged<T>` is the single source of truth every UI badge reads from —
nothing in `web/js/` invents a provenance of its own:

| Provenance | Meaning | Where it shows in the UI |
|---|---|---|
| `computed-from-your-graph` | Direct output of real linear algebra over your production graph. | Every node's stock count; prestige's `lambda` and mixture percentages. |
| `designed-flavor` | A designer-chosen constant or curve, possibly informed by a computed number, but authored. | Build/connect/upgrade costs; the prestige starting-stock bonus. |

A purely acyclic graph (the game you start with) is nilpotent — every eigenvalue is exactly 0 —
so prestige is refused with the reason "no growth loop yet — this production graph is acyclic,"
not a fabricated multiplier. Closing the first reinvestment loop is the first real decision the
game asks of the player.

## Cartridge

`src/cartridge.mts` implements `@red-cup-engineering/cartridge`'s contract (`createEngine(seed)`,
`applyIntent`, `replay`, `serialize`/`deserialize`) directly against `src/intents.mts`'s single
reducer — there is no second, parallel implementation. The client's "Verify replay" button
recomputes the session from `(seed, intentLog)` from scratch and compares its `stateHash` against
the live state, the same check `src/cartridge.test.mts` runs.

## Architecture

- `src/graph.mts` — `ProductionGraph` as data; `toMatrix`/`baseVector` turn it into the
  `number[][]` linear algebra runs on. Negative edge rates are rejected at construction
  (`NegativeEdgeRateError`) — Perron–Frobenius's guarantees don't survive them.
- `src/eigen.mts` — `dominantEigen` (power iteration → `lambda` + eigenvector + convergence
  history) and `assessGraphMatrix` (the validity gate: nonnegative, and a real cycle).
- `src/tick.mts` — `advance(state, fromTs, toTs)`, the whole offline-progression story in one
  pure, wall-clock-free call, via `(I+M)^n` by binary exponentiation (never a per-tick loop).
- `src/prestige.mts` — `previewPrestige`/`reset`: bank `(lambda, mixture)`, apply the disclosed
  authored starting bonus, return to the starter graph.
- `src/state.mts` — `StokeState`, the one plain-JSON value the whole game is a function of.
- `src/intents.mts` — `build`/`connect`/`upgrade`/`prestige`/`tick`, as pure
  `(state, intent) -> {state, events}` reducers; the (flat, authored) cost model.
- `src/cartridge.mts`, `src/cartridge.manifest.mts` — the `@red-cup-engineering/cartridge` adoption.
- `web/server.mjs` — zero-dependency `node:http` static server: strips `.mts` types for the
  browser (`node:module`'s `stripTypeScriptTypes`), vendors `@red-cup-engineering/cartridge`'s
  subpaths at `/vendor/red-cup-engineering-cartridge/*`, serves `GET /api/manifest`.
- `web/js/kernel.mjs` — the browser's one door into the domain engine: a straight re-export of
  `src/*.mts`. No rule is reimplemented for the browser.
- `web/js/layout.mjs`, `web/js/format.mjs` — pure, unit-tested presentation helpers (graph
  geometry; number/provenance formatting).
- `web/js/render-graph.mjs` — the SVG production-graph canvas.
- `web/js/app.mjs` — the browser controller and the one impure boundary in this codebase: the only
  file that reads `Date.now()`, turning it into an ordinary `{kind:"tick", toTs}` intent once per
  second.

## Keyboard

Every action is a native `<button>`/`<select>`/`<input>` — no drag, no click-only control. The
graph canvas (SVG) is decorative (`aria-hidden`); the same facts it draws are always also present
as an accessible text list (stocks, edges) and as `<select>` options in the build/connect/upgrade
forms. Access keys: `Alt+B` build-name field, `Alt+C` connect, `Alt+U` upgrade, `Alt+P` prestige,
`Alt+V` verify replay, `Alt+D` theme toggle (exact modifier key is browser/OS-dependent — Chrome
on Windows/Linux uses `Alt`, Firefox `Alt+Shift`, macOS `Ctrl+Option`). Dark/light follows the
system `prefers-color-scheme` by default, with an explicit toggle that persists to `localStorage`.

## Known limitations

- `web/js/app.mjs` (the DOM-wiring/event-glue layer) has no automated test coverage — there is no
  headless browser in this toolchain. A bug in the event wiring itself (a form submitting the
  wrong intent shape, a stale `select` value) would surface only by opening the page.
- Trust is client-side only. The "Verify replay" button proves determinism to the player — it
  recomputes their own session and shows the match — but nothing server-side checks it. A player
  who edits their own `localStorage` intent log can give themselves anything. That is not an
  anti-cheat system; a real one would need a server that stores and independently re-verifies logs.
- The cost model (`BUILD_COST=10`, `CONNECT_COST=5`, `UPGRADE_COST=3`, `UPGRADE_RATE_STEP=0.01`,
  `MAX_EDGE_RATE=0.1`, one tick per real second) is honest, flat, and disclosed as
  `designed-flavor`, but its pacing (how many real minutes to a first viable prestige loop) has
  not been evaluated for fun — only for numerical soundness. `tick.mts` clamps every matrix entry
  and stock to a finite ceiling (`STOCK_CLAMP = 1e250`) after every multiplication, so compounding
  growth saturates at a large finite number rather than overflowing to `Infinity`/`NaN`; see that
  module's header for why the clamp matters (a `NaN` stock would otherwise pass every future
  affordability check for free).
