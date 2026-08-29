# solitaire-service

One rules engine, variant rules as data. Klondike (draw 1 / draw 3), FreeCell, Spider (1/2/4
suit), Yukon, Forty Thieves, Golf, TriPeaks, and Pyramid — eleven variants — are all interpreted
from the same declarative `VariantSpec` by the same `engine.mts`. No module in this package
branches on a variant's name. See `DESIGN.md` for the design rationale.

```
src/
  cards.mts        deck, suits/ranks, deterministic seeded shuffle (mulberry32)
  cards.test.mts
  engine.mts        the rules engine: VariantSpec data, deal, legality, move application,
                     undo/redo + replay, win/auto-finish detection
  engine.test.mts
  solver.mts        FreeCell solver (weighted-A*) + solver-backed deal generator
  solver.test.mts
  daily.mts         UTC-date-derived shared daily seed
  daily.test.mts
  cartridge.mts             @red-cup-engineering/cartridge adoption: wraps engine.mts's
                             existing pure functions under that package's Cartridge interface
  cartridge.manifest.mts    the CartridgeManifest + a standalone replay-verifier entry point
  cartridge.test.mts
web/
  index.html         landing page: variant picker, daily-deal card, "play a specific seed" form
  table.html          the game screen (toolbar, board, win banner, keymap overlay)
  server.mjs          zero-dep node:http static server; serves *.mts through node:module's
                       stripTypeScriptTypes so the browser loads the real src/*.mts unmodified
  css/style.css        theme via CSS custom properties (light/dark toggle, prefers-reduced-motion)
  js/
    kernel.mjs          re-exports src/cards.mts + src/engine.mts + src/daily.mts unchanged —
                         the client's only import of game rules, never a reimplementation
    cards-svg.mjs        inline-SVG card faces/backs, themed via --suit-*/--card-back-* properties
    project.mjs           TableState -> DOM-projectable view model (pure)
    render-dom.mjs         view model -> DOM, plus the CSS-only win celebration
    game-controller.mjs     click/drag/keyboard input, selection state, KEYMAP table
    app.mjs                table.html's bootstrap: wires controller+renderer to the DOM,
                            move-log export/download, theme toggle, URL seed/variant/daily params
    landing.mjs             index.html's bootstrap: variant grid, daily-deal link, seed form
  test/
    smoke.test.mts          scripted 50-move FreeCell playthrough asserting the projection
                             (project.mjs) stays consistent with the kernel state after every move;
                             KEYMAP-covers-every-move-kind check; card-SVG well-formedness check
    frontdoor.test.mts       serves the real front door end to end: `/` redirects to
                             `/web/index.html`, and every page-relative asset resolves correctly
check-mts.mjs      real .mts syntax gate used by `npm run check` (see Testing below)
package.json
README.md
DESIGN.md
ARCHITECTURE.md
```

## Running it

`npm run serve` (or `node web/server.mjs [port]`, default 8787), then open
`http://localhost:8787/`. The server redirects `/` to `/web/index.html`. The document root is the
package directory (parent of `web/`), not `web/` itself — this lets browser-relative imports like
`../../src/engine.mts` from `web/js/kernel.mjs` resolve straight to the real `src/engine.mts` on
disk, so the client runs the identical rules module Node runs in `src/*.test.mts`, never a
duplicate.

## The `VariantSpec` data format

A variant is entirely described by a `VariantSpec` value (`engine.mts`) — nothing about it lives
in code outside that record:

```ts
interface PileSpec {
  id: string;                                              // e.g. "tableau-3", "foundation-0"
  kind: 'stock' | 'waste' | 'foundation' | 'tableau' | 'freecell';
  dealFaceUp: number;    // cards dealt face-up when this pile is initially filled
  dealFaceDown: number;  // cards dealt face-down beneath them
  blockedBy?: readonly string[]; // Pyramid/TriPeaks: ids that must all be empty to expose this pile
}

interface BuildRule {
  order: 'descending' | 'ascending' | 'any' | 'adjacent' | 'sum-to-13' | 'none';
  color: 'alternating' | 'same-suit' | 'any';
  base: 'any-rank' | 'king-only' | 'ace-only' | 'empty-accepts-any'; // what an EMPTY pile accepts
}

interface VariantSpec {
  id: string;
  name: string;
  decks: 1 | 2;
  suitsInPlay: 1 | 2 | 4;
  piles: readonly PileSpec[];
  dealOrder: readonly string[];       // pile ids, dealt round-robin in this order
  tableauBuild: BuildRule;            // what a single card may be DROPPED on
  runBuild?: BuildRule;               // what a GROUP may be picked up as (defaults to tableauBuild)
  foundationBuild: BuildRule;
  sequenceMove: 'single-card' | 'any-legal-run' | 'supermove' | 'any-faceup-group';
  redeal: { stockRecycles: number | 'unlimited' } | null;
  win: 'all-foundations-full' | 'all-thirteen-sequences-cleared' | 'tableau-cleared';
  drawCount?: number;                 // Klondike/Forty Thieves/Golf/TriPeaks/Pyramid: cards drawn from stock to waste per draw
}
```

**How dealing works**: `dealTable(seed, variant)` shuffles `variant.decks * 52` cards
deterministically from `seed`, then round-robins them into every pile named in `dealOrder`
according to each pile's `dealFaceDown + dealFaceUp` total (Klondike's triangular tableau — piles
of 1, 2, 3... 7 cards — is just seven `PileSpec`s with `dealFaceDown: 0..6, dealFaceUp: 1`, no
special-cased deal loop). Any pile of `kind: 'stock'` absorbs whatever cards are left over after
`dealOrder` is satisfied, face down. A variant with no `stock` pile (FreeCell) simply has nothing
left over — its `dealOrder` totals sum to the whole deck.

**`runBuild`** separates "what a single card may be dropped on" from "what a group of cards must
look like to be picked up together." Klondike/FreeCell don't need this. Spider does: any card may
be dropped on any next-higher rank regardless of suit (`tableauBuild.color: "any"`), but only a
same-suit run may be picked up as a group (`runBuild.color: "same-suit"`).

The discard-style games (Golf, Pyramid, TriPeaks) use four small, reusable additions to the same
closed enums, never per-variant branches: `BuildRule.order: 'adjacent'` (Golf/TriPeaks: one rank
from the waste top, either direction), `'sum-to-13'` (Pyramid: pairs summing to 13, or a lone
King), `'none'` (a pile that's never a drop target); `PileSpec.blockedBy` (pyramid-shaped exposure
gating); `VariantSpec.win: 'tableau-cleared'`; and a `kind: 'waste'` pile becoming a legal manual
move target exactly when `win === 'tableau-cleared'`. Yukon uses `sequenceMove:
'any-faceup-group'` (pick up any face-up card and everything dealt on top of it, in whatever
order). See `DESIGN.md` for the rationale behind each of these.

**Adding a variant** is adding a `VariantSpec` value and nothing else. There is no per-variant `if`
anywhere in `engine.mts`; a table-driven test in `engine.test.mts` runs against every entry in
`VARIANT_LIST`, so a new variant is test-covered by being added to that list.

## Move-log = undo/redo backing = replay source

Every applied action (`applyMove`, `drawFromStock`, `redealStock`) appends one `LogEntry` and
returns a new `GameState`; nothing mutates. `undo`/`redo` are pure pointer movement — both are
implemented as `replayTo(seed, variant, fullLog, cursor)`, which rebuilds state by replaying the
log from a fresh `dealTable` call up to `cursor`. `replay(seed, variant, log)` is the same function
at `cursor = log.length`: the seed plus the log is sufficient to independently re-derive the exact
final state from nothing.

## Solver

`solver.mts` is a from-scratch weighted-A* search (own compact integer board representation, a
transposition table keyed by a canonicalized state, forced safe-autoplay canonicalization before
each state is scored) over FreeCell — see the file's module doc for what was tried and measured
before landing on the current heuristic. `solveFreecell(seed, options)` returns `{ solvable,
moves?, statesExplored, timeMs }`; `moves` is only present when `solvable`, and only after the
solution has been independently replayed through `engine.mts`'s real `legalTargets`/`applyMove`
(a different code path from the search itself) and confirmed to reach `checkWin`.
`generateSolvableSeed(seeds, options)` tries candidate seeds in order and returns the first one
the solver certifies — the deal generator that rejects unsolvable FreeCell seeds.

An unsolved search reports `solvable: false`, never a guess — "not certified within this budget,"
not "unwinnable."

FreeCell deals shown to players are solver-certified winnable. Klondike, Spider, and the other
variants are not solver-verified before serving — full-information solving for them is either
expensive or ill-defined for imperfect-information play. See `DESIGN.md`.

## Testing

```
npm run check    # syntax-checks src/*.mts and web/test/*.test.mts via check-mts.mjs (node --check
                  # is a documented no-op for .mts syntax errors; check-mts.mjs strips types and
                  # re-checks the result as plain JS), and web/js/*.mjs + web/server.mjs via
                  # node --check directly
npm test         # node --test src/*.test.mts web/test/*.test.mts
npm run verify   # both
```

Coverage: rule legality per variant (fixture-based known-legal/known-illegal move tables), seeded
deal determinism including a pinned exact-layout snapshot, undo/redo invariants (round-trip, no-op
past the ends, redo-tail truncation on a fresh move), move-log replay equivalence, solver soundness
(independent replay verification) and timing ceiling — FreeCell only — auto-finish correctness at
fixture boards just below/above the safe-autoplay threshold, a 1000-random-legal-move fuzz per
variant asserting card-count conservation and log/cursor consistency, a scripted
playable-to-completion test per variant, a daily-seed coverage test spanning `VARIANT_LIST`, plus
the web layer's own: a scripted 50-move playthrough keeping the DOM projection consistent with the
kernel, a static check that `KEYMAP` binds a key to every `engine` move kind, a card-SVG
well-formedness check, and an end-to-end check of the real front door (`/` redirect, page-relative
asset resolution).

## Web client

`web/` is the playable face over the same `src/*.mts` kernel — no game logic is reimplemented in
the browser. `web/js/kernel.mjs` re-exports `cards.mts`/`engine.mts`/`daily.mts` directly, and
`web/server.mjs` serves `.mts` files by running them through `node:module`'s
`stripTypeScriptTypes` before sending them to the browser, so the client `import`s the literal
kernel source. Covers all eleven variants via the same generic, pile-`kind`-driven layout — the
landing grid and variant picker are built straight from `VARIANT_LIST`, never a hand-maintained
duplicate.

Known gap: Pyramid and TriPeaks' 28 individual one-card piles render as a flat scrollable row of
columns (the same generic tableau layout every variant uses), not an actual pyramid/peaks shape —
fully playable by mouse and keyboard, just not visually authentic to the traditional board.

Features: click-to-select-and-place, drag, and a full keyboard mode (arrow keys + Enter/Space,
`U`/`Ctrl+Z` undo, `Shift+U`/`Ctrl+Y` redo, `A` auto-finish, `N` new game, `?` keymap overlay — see
`game-controller.mjs`'s `KEYMAP`); undo/redo/auto-finish buttons wired straight to the kernel's
move-log; a CSS-only win celebration that honors `prefers-reduced-motion`; SVG cards themed via
`--suit-*`/`--card-back-*` CSS custom properties with a light/dark toggle; a daily-deal mode
(`table.html?variant=<id>&daily=1`) that reads `dailySeed`; seed sharing via URL (`?seed=...`);
and a move-log export panel (view + download as JSON).

No accounts, payments, or ledger.

## Fleet cartridge adoption

`src/cartridge.mts` and `src/cartridge.manifest.mts` wrap this package's existing pure functions
(`dealTable`, `applyMove`/`drawFromStock`/`redealStock`, `replay`) under `@red-cup-engineering/cartridge`'s
`Cartridge` interface, for tooling elsewhere in the fleet that runs games through that shared
contract. No logic changes: `createEngine` is `dealTable`, `applyIntent` dispatches to the same
three mutators, and `replay` delegates to the cartridge package's own reference implementation.
