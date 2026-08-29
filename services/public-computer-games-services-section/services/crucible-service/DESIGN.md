# crucible-service — DESIGN.md

## Doctrine, stated up front

**The math is load-bearing, and honestly labeled.** Every move's energy cost is computed by
`@lenticule-science/metrologic/obstruction` — a real spatial cohomology (`cochain.mjs`'s `cohomologyOfRelation`,
literal cycle-rank of the tangle's bond graph) and a real temporal firing cohomology
(`settling.mjs`'s `settling`/`classify`/`h1`, computed on a small settling this game constructs
per move). `src/obstruction.mts`'s module header states exactly which numbers are literal
`@lenticule-science/metrologic` output (all of them, once a settling/relation is built) and which part is
game-authored (the *shape* of the settling per move verb — how many stages, whether a limit
stage occurs). Nothing in this codebase invents a cost number by hand; nothing hides a designer
spreadsheet behind a plausible-looking function name.

**Never a solvability shortcut.** `src/validate.mts` proves, by actually replaying a concrete
solving sequence through the real engine (`src/engine.mts#applyMove`), that every daily tangle
`src/tangle.mts#spawnTangle` produces is settleable within its `energyBudget` — for every seed
tested, not asserted once. See `src/validate.test.mts` for the executable check (300 stress
seeds + a full year of real UTC daily dates).

**Deterministic engines only.** No module under `src/` reads `Date.now()` or calls
`Math.random()`. The only randomness anywhere is `src/seed.mts`'s seeded `Rng` (FNV-1a hash +
mulberry32), and the only clock read in the whole client happens once, at browser bootstrap, in
`web/js/app.mjs` (`new Date()` to resolve "today" into a seed string) — everything downstream of
that only ever sees the resulting seed or already-computed state. `src/history-store.mts`'s
`randomUUID()` is I/O bookkeeping (a tmp-file suffix for atomic writes), never game-state
randomness — the same exception onestone-service's `scene.mts` already establishes as house
precedent.

## Module map

| Module | Job |
|---|---|
| `src/types.mts` | The shared vocabulary: `Tangle`, `Claim`, `Bond`, the four `Move` variants, `MoveCost`, `RunState`, `HistoryRecord`. |
| `src/seed.mts` | FNV-1a hash + mulberry32 `Rng` — the house PRNG, copied in shape from onestone/solitaire. |
| `src/daily.mts` | `dailySeed(date)` — UTC-only calendar date -> `crucible-daily:<YYYY-MM-DD>`. |
| `src/tangle.mts` | `spawnTangle(seed)` — pure daily generation: a random spanning tree of `pinned` bonds plus `k` extra `exchangeable` chord bonds, so the tangle's spatial H¹ starts at exactly `k`. |
| `src/obstruction.mts` | The ONE file that imports `@lenticule-science/metrologic/...`. Wraps `cohomologyOfRelation` (spatial H¹) and `settling`/`classify`/`h1` (temporal regime/depth/H¹) into `costOfMove`. |
| `src/engine.mts` | `applyMove`, `legalMoves`, `isSettled` — pure move application for merge/split/rebond/catalyze. |
| `src/validate.mts` | `certifyTangle(seed)` — the executable solvability guarantee: builds and replays a real certified solving sequence, attaches a real `energyBudget`. |
| `src/replay.mts` | `replay`/`replayTo`/`undo`/`redo` — THE trust anchor. Folds `applyMove` over a fresh `spawnCertifiedTangle(seed)`. |
| `src/history.mts` | Pure histogram/record model — Node/browser-agnostic (re-exported to the browser via `kernel.mjs`). |
| `src/history-store.mts` | Node-only atomic local persistence (onestone's `scene.mts` doctrine) — NOT re-exported to the browser, since it imports `node:fs`. |
| `web/js/kernel.mjs` | The browser's single re-export door into `src/*.mts` — nothing ported, nothing duplicated (`history-store.mts` deliberately excluded). |
| `web/server.mjs` | Zero-dep static server: strips `.mts` types on the fly, and serves `node_modules/@lenticule-science/metrologic/**` under `/vendor/lenticule-science-metrologic/` for the browser's import map. |
| `web/js/project.mjs` | Pure state -> screen-space projection (layout, keyboard-nav geometry). No game rules. |
| `web/js/render-svg.mjs` | SVG lattice-in-crucible renderer, drawing from `project.mjs`'s view model. |
| `web/js/app.mjs` | Bootstrap: resolves the seed, wires selection/keyboard/click, mounts the move panel, energy gauge (with an over-budget indicator), and Undo/Redo (`replay.mts`'s `undo`/`redo`, via a log cursor — Ctrl+Z / Ctrl+Shift+Z too). The one place `new Date()` is read. |

## The four verbs, and what each costs (see `src/obstruction.mts` for the exact settling shape)

- **MERGE** — adds a permanent (`compliant-permanent`) bond. Finite regime, depth 0. Since the
  daily's pinned spanning tree keeps every claim connected at all times, MERGE *always* closes a
  new cycle — its cost is driven entirely by the resulting spatial H¹. It can never help settle
  the tangle, and only forced SPLIT (never clean) can ever reverse it (see the `BondState` doc in
  `types.mts`).
- **REBOND** — moves one end of an `exchangeable` bond to a new claim. Finite regime, depth 1
  (two ordinary successor firings: the witness leaves, then arrives). Free reserve is unchanged.
- **SPLIT (clean)** — removes a bond via a Scott-continuous closure (a limit stage with nothing
  firing there). Scott regime, depth 0. Only ever legal on an `exchangeable` bond.
- **SPLIT (forced)** — removes a bond via a non-Scott-continuous firing at the limit (temporal H¹
  = 2). Transfinite regime — substantially more expensive than clean SPLIT on the same bond.
  Legal on ANY non-`pinned` bond — `exchangeable`, `compliant-permanent`, or `catalyzed` alike —
  by design: it is the one recovery valve strong enough to reverse a player's own MERGE or
  CATALYZE lock, at real cost, so neither verb can permanently strand a cycle.
- **CATALYZE** — locks an `exchangeable` bond to `catalyzed` (deliberately NOT `pinned`) without
  touching the graph's edges. Finite regime, depth 0, but its spatial term is charged against the
  catalyst's own 2-hop neighborhood cycle count, not zero — catalysis is never actually free. Like
  MERGE, only forced SPLIT can ever reverse it.

## Solvability guarantee, precisely

`certifyTangle(seed)` proves the freshly-spawned daily is settleable *before any player move*,
via one concrete certified sequence (clean-SPLIT every chord bond). It does not claim every
sequence of player choices from that point remains solvable *within budget* — a careless player
can always overspend. It DOES guarantee (see `engine.test.mts`'s "no permanent softlock" property
test) that every reachable state remains solvable *at all*: forced SPLIT is legal on every
non-`pinned` bond regardless of MERGE/CATALYZE history, and the `pinned` bonds always form exactly
the generator's spanning tree (acyclic by construction), so forced-splitting every non-`pinned`
bond always leaves spatial H¹ = 0. See README.md.
