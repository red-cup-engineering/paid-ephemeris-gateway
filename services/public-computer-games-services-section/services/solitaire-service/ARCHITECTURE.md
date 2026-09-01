# solitaire-service — architecture

Companion to `DESIGN.md` (decisions) and `README.md` (usage). This document describes the shipped
structure; it does not restate `DESIGN.md`'s rationale.

## Constraints

- **No wall clock in domain logic.** `engine.mts::applyMove`/`drawFromStock`/`redealStock` take a
  trailing `now = 0` parameter and never read `Date.now()` internally, so a `LogEntry.ts` is always
  supplied by the caller. Two `Date.now()` uses elsewhere are legitimate boundary reads, not domain
  randomness: `solver.mts`'s wall-clock search budget/telemetry (bounds how long the offline solver
  searches, never the deal's own solvability, which is a pure function of the seed) and
  `web/js/app.mjs`'s client-side id generation.
- **One runtime dependency**: `@red-cup-engineering/cartridge`, used by `src/cartridge.mts`/`cartridge.manifest.mts`
  to adopt the fleet's shared cartridge interface. `web/server.mjs` and `web/js/kernel.mjs` use
  only Node builtins otherwise (`node:http`, `node:fs/promises`, `node:module`'s
  `stripTypeScriptTypes`).
- **No server-held player state.** `GameState` is the whole of what exists, and it lives
  client-side (URL params, a move-log export panel) or as a pure function's return value. No
  accounts, payments, or ledger.
- **The kernel is imported, never duplicated, by the browser.** `web/js/kernel.mjs` is a bare
  re-export of `src/cards.mts`/`engine.mts`/`daily.mts`; `web/server.mjs` serves any `.mts` request
  by running `node:module`'s `stripTypeScriptTypes` on the real source file. The browser runs the
  literal file `src/engine.test.mts` also imports.

## Building block view

| Module | Pure? | Responsibility |
|---|---|---|
| `cards.mts` | pure | `Card`/`Suit`/`Rank`; `hashSeed`/`rngFrom` (FNV-1a → mulberry32); `makeDeck`/`shuffle`/`shuffledDeck` |
| `daily.mts` | pure | `utcDateString`/`dailySeed(date, variantId)` — UTC-calendar-day-derived shared seed |
| `engine.mts` | pure | The rules engine: `VariantSpec`/`PileSpec`/`BuildRule` data; the eleven shipped variants; `dealTable`, `legalTargets`, `applyMove`/`drawFromStock`/`redealStock`, `replayTo`/`replay`/`undo`/`redo`, `checkWin`/`autoFinishAvailable`/`autoFinishSequence` |
| `solver.mts` | pure (search) + wall-clock budget | Weighted-A* FreeCell solver over a compact integer board; transposition table; forced safe-autoplay pruning; `translateAndVerify` independently replays a found solution through the real `engine.mts` before certifying it |
| `cartridge.mts` | pure | `@red-cup-engineering/cartridge` adapter over `engine.mts`'s existing pure functions |
| `cartridge.manifest.mts` | pure | `CartridgeManifest` + `verify`, a standalone replay-verifier entry point |
| `web/js/kernel.mjs` | re-export only | The client's one door into `src/*.mts` |
| `web/js/project.mjs` | pure | `GameState` → DOM-projectable view model |
| `web/js/render-dom.mjs` | browser UI | View model → DOM; CSS-only win celebration |
| `web/js/game-controller.mjs` | browser UI | Click/drag/keyboard input, selection state, `KEYMAP` |
| `web/js/cards-svg.mjs` | pure-ish | Inline-SVG card faces/backs, themed via CSS custom properties |
| `web/js/app.mjs` | browser UI | `table.html` bootstrap: wires controller+renderer, move-log export, theme toggle, URL params |
| `web/js/landing.mjs` | browser UI | `index.html` bootstrap: variant grid, daily-deal link, seed form |
| `web/server.mjs` | impure (transport) | Zero-dep static file server; `.mts`-request type-stripping; path-traversal guard; `/` → `/web/index.html` redirect |

Every `src/*.mts` module ships a co-located `.test.mts`. The web layer's coverage is
`web/test/smoke.test.mts` (a scripted 50-move FreeCell playthrough, a `KEYMAP`-coverage check, and
a card-SVG well-formedness check) and `web/test/frontdoor.test.mts` (the real front-door redirect
and page-relative asset resolution, against a running `server.mjs`) — thinner than `src/`'s
coverage; `project.mjs`/`render-dom.mjs`/`game-controller.mjs`'s own selection/drag/theme logic has
no dedicated unit tests beyond what the smoke playthrough exercises.

## Runtime view

**A Klondike move.** A player drags a card in `table.html`; `game-controller.mjs` resolves the
drag into a `{from, to, count}` candidate and calls `kernel.mjs`'s re-exported
`legalTargets(variant, state, from, count)` to confirm `to` is a legal destination. On
confirmation, `applyMove(variant, state, move, now)` reveals the new top card of the source pile,
appends the moved cards to the target, and calls `appendEntry`, which truncates any redo-tail past
`state.cursor`, applies Spider's `applyAutoClears` (a no-op for every non-Spider variant), and
appends one `LogEntry` stamped with the caller's `now`. `project.mjs` turns the new `GameState`
into a view model; `render-dom.mjs` paints it.

**A FreeCell deal, certified winnable before a player sees it.**
`generateSolvableSeed(seeds, options)` tries candidate seeds, calling `solveFreecell(seed,
options)` for each. `solveFreecell` converts the real `dealTable(seed, FREECELL)` output into
`solver.mts`'s own compact representation and runs a weighted-A* search with forced safe-autoplay
canonicalization and a transposition table. If a solution path is found, `translateAndVerify`
replays it move-by-move against a fresh `engine.mts` `GameState` — the real `legalTargets`/
`applyMove` every live game uses — and `solveFreecell` only reports `solvable: true` once that
independent replay reaches `checkWin`.

**Undo, redo, and full-log replay are one function at three cursors.** `undo` and `redo` both call
`replayTo(seed, variant, log, cursor ± 1)`; `replay(seed, variant, log)` is the same function at
`cursor = log.length`. `replayTo` rebuilds state from nothing but a fresh `dealTable(seed,
variant)` plus replaying the log through `applyLogPrimitive` — the single implementation backing
all three operations.

## Deployment view

`node web/server.mjs [port]` (default 8787). The document root is the package directory (parent of
`web/`), so browser-relative imports like `../../src/engine.mts` resolve to the real source. No
environment variables, no credentials, no server-held state to persist or lose. Requesting `/`
returns a real HTTP redirect to `/web/index.html`, not an internal rewrite — `web/index.html`'s own
asset references are path-relative and only resolve correctly from that URL (`web/test/frontdoor.test.mts`).

## Decisions

- **`LogEntry.ts` is an injected `now` parameter, never an internally-read wall clock.**
  `applyMove`/`drawFromStock`/`redealStock` all take `now = 0` and `appendEntry` stamps `ts` from
  that value. `engine.test.mts`'s "applyMove is pure" test calls `applyMove` twice with a real
  15ms gap and asserts byte-identical output.
- **`runBuild` is a separate field from `tableauBuild`.** Spider needs both: any card may be
  dropped on any next-higher rank regardless of suit (`tableauBuild.color: 'any'`), but only a
  same-suit run may be picked up as a group (`runBuild.color: 'same-suit'`) — `isValidRunOrder`
  (checks a pickup group against `runBuild`) and `buildAccepts` (checks a drop against
  `tableauBuild`) are genuinely separate functions over separate rule objects.
- **`src/` holds four modules, not a module per DESIGN.md-era responsibility.** `seed`/`variants`/
  `deal` live inside `cards.mts`/`engine.mts`; the move-log is `engine.mts`'s own `LogEntry`/
  `replayTo` machinery. A win-rate telemetry module for Klondike/Spider honesty tracking does not
  exist in shipped code — no code path anywhere claims solver-backed winnability for those
  variants; the absence itself is the honesty guarantee, not a flag that could be silently flipped.

## Known gaps

- No `DEPLOY.md`.
- Web-layer test coverage is thinner than `src/`'s (see Building block view).
- No win-rate telemetry for Klondike/Spider/other non-FreeCell variants — `DESIGN.md` describes
  this as a possible future safety net; it is not implemented.
- No accounts/ledger/payments layer.

## Glossary

**`VariantSpec`** — the one data record that fully describes a solitaire variant; `engine.mts`
never reads a variant's `id` for dispatch, only its declared pile/build-rule shape. **Supermove** —
FreeCell's multi-card move, capped at `(empty freecells + 1) × (empty non-destination tableau
columns + 1)`. **Forced safe-autoplay** — the solver's own pruning technique (structurally
identical in its safety bound to `engine.mts::autoFinishAvailable`'s player-facing auto-finish
rule): a card provably safe to send home is played immediately during search, before the resulting
state is scored.
