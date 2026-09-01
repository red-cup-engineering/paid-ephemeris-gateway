# crucible-service

A daily-seeded, single-player browser puzzle. The daily seed generates a **tangle** — a reaction
network of claims (nodes) and bonds (edges) — and the player spends furnace energy on four moves
(**merge**, **split**, **rebond**, **catalyze**) to bring it to settlement: the network's spatial
H¹ (independent cycle count) reaching zero.

Every move's energy cost is computed by the real obstruction mathematics in `@lenticule-science/metrologic` —
literal calls to `cohomologyOfRelation` (spatial H¹, real union-find cohomology of the bond graph)
and `settling`/`classify`/`h1` (temporal regime, settling depth, temporal H¹). See
`src/obstruction.mts`'s header for exactly which parts of the resulting cost are literal package
output and which are this game's own authored structure.

## Running it

```sh
npm install    # resolves @lenticule-science/metrologic 0.1.0 from the Verdaccio registry (.npmrc)
npm run check  # check-mts.mjs over every src/*.mts and web/test/*.test.mts, node --check over web/js/*.mjs and web/server.mjs
npm test       # node --test over src/*.test.mts and web/test/*.test.mts
npm run serve  # node web/server.mjs [port]  (default 8787)
```

Then open `http://localhost:8787/web/index.html`. `?date=YYYY-MM-DD` plays a specific day's
tangle; `?seed=anything` plays an arbitrary seed directly.

## Modules

| Module | Job |
|---|---|
| `src/types.mts` | Shared vocabulary: `Tangle`, `Claim`, `Bond`, the four `Move` variants, `MoveCost`, `RunState`, `HistoryRecord`. |
| `src/seed.mts` | FNV-1a hash + mulberry32 `Rng`. |
| `src/daily.mts` | `dailySeed(date)` — UTC calendar date -> `crucible-daily:<YYYY-MM-DD>`. |
| `src/tangle.mts` | `spawnTangle(seed)` — pure daily generation: a random spanning tree of `pinned` bonds plus `k` extra `exchangeable` chord bonds. |
| `src/obstruction.mts` | The only module that imports `@lenticule-science/metrologic/...`. Wraps `cohomologyOfRelation` and `settling`/`classify`/`h1` into `costOfMove`. |
| `src/engine.mts` | `applyMove`, `legalMoves`, `isSettled` — pure move application. |
| `src/validate.mts` | `certifyTangle(seed)` — builds and replays a certified solving sequence, attaches a real `energyBudget`. |
| `src/replay.mts` | `replay`/`replayTo`/`undo`/`redo` — folds `applyMove` over a fresh `spawnCertifiedTangle(seed)`. |
| `src/history.mts` | Pure history/histogram model, Node/browser-agnostic. |
| `src/history-store.mts` | Node-only atomic local persistence (not exported to the browser). |
| `web/js/kernel.mjs` | The browser's single re-export door into `src/*.mts`. |
| `web/server.mjs` | Static server: strips `.mts` types on the fly, serves `node_modules/@lenticule-science/metrologic/**` under `/vendor/lenticule-science-metrologic/`. |
| `web/js/project.mjs` | Pure state -> screen-space projection (layout, keyboard-nav geometry). |
| `web/js/render-svg.mjs` | SVG renderer, drawing from `project.mjs`'s view model. |
| `web/js/app.mjs` | Bootstrap: resolves the seed, wires selection/keyboard/click, mounts the move panel, energy gauge, undo/redo. |

## The four moves

- **MERGE** — adds a permanent (`compliant-permanent`) bond between two claims. Always closes a
  new cycle, so it never helps settle the tangle; only forced SPLIT can reverse it.
- **REBOND** — moves one end of an `exchangeable` bond to a new claim. Free reserve is unchanged.
- **SPLIT (clean)** — removes an `exchangeable` bond at low cost (Scott regime).
- **SPLIT (forced)** — removes any non-`pinned` bond (`exchangeable`, `compliant-permanent`, or
  `catalyzed`) at higher (transfinite) cost. This is the recovery valve: it can reverse a player's
  own MERGE or CATALYZE lock, so neither move can strand a cycle permanently.
- **CATALYZE** — locks an `exchangeable` bond to `catalyzed` without touching the graph's edges.
  Cost is charged against the catalyst's local 2-hop neighborhood cycle count, so it is never
  free. Like MERGE, only forced SPLIT can reverse it.

`pinned` bonds mark the daily generator's own spanning tree and are never selectable by any move,
at any cost.

Since the pinned bonds always form a spanning tree (acyclic by construction), forced-splitting
every non-`pinned` bond always leaves spatial H¹ = 0 — so no sequence of MERGE/CATALYZE locks can
make a daily truly unwinnable, only more expensive than necessary. `engine.test.mts`'s "no
permanent softlock" test exercises this directly.

## Deterministic replay

`src/replay.mts#replay(seed, moveLog)` folds `engine.mts#applyMove` over a fresh
`spawnCertifiedTangle(seed)`. Nothing in that fold reads a clock or `Math.random()`, so the same
`(seed, moveLog)` pair always reproduces the identical final tangle and total cost.

`src/history.mts#HistoryRecord` is shaped as `{ seed, moveLog, totalCost, finishedAt }`. A future
shared leaderboard would verify a submitted run by recomputing
`replay(record.seed, record.moveLog).totalCost` server-side and rejecting the submission if it
does not match `record.totalCost` (or if `replay` throws, which it does on any illegal move).
`web/js/history-ui.mjs` currently stores history only in `localStorage`, in this same record
shape.

## Known limitations

- MERGE and CATALYZE are strictly cost-adding moves; the UI does not currently warn the player of
  this before they commit to one.
- `certifyTangle` proves the daily's start is reachable *within budget*; it does not prove every
  reachable state stays *within budget* — a careless player can always overspend and still finish,
  with a worse score. `SAFETY_MULTIPLIER` (`src/validate.mts`) is a single global constant, so a
  per-seed or size-scaled multiplier would be needed to tighten small dailies without loosening
  large ones.
- No test in this repository drives `index.html` in an actual browser DOM with real click/keydown
  events; the web client is covered by `web/test/*.test.mts` under Node (a real `web/server.mjs`
  instance, `node --check` on every `.mjs` file, and pure-function tests on `project.mjs`), not by
  an end-to-end browser test.

## What is literal math vs. game-authored

See `src/obstruction.mts` for the full account.

- **Spatial H¹** (`cohomologyOfRelation`) is literal, always: the tangle's actual bonds go in, the
  package's real cycle-rank comes out.
- **Temporal regime/depth/H¹** (`settling`/`classify`/`h1`) are also literal outputs, but the
  *settling* they're computed on is authored by this game per move-verb — a plain bilattice floor
  descent can only ever land in the `finite` regime, so the non-finite regimes (`scott`,
  `transfinite`, `aperiodic`) exist in this game only because `src/obstruction.mts` deliberately
  constructs stage sequences with limit-stage firings that encode each move's chemistry.
