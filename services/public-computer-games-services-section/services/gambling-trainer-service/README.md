# Kelly's Wager (gambling-trainer-service)

A daily-seeded, practice-bankroll trainer for expected value, variance, and Kelly-criterion
sizing. Each day offers a fixed, seeded sequence of wagers (`'novice'`: 6 wagers, gentle traps;
`'sharp'`: 10 wagers, frequent traps). You size a stake as a fraction of your current practice
bankroll, commit it, and the game grades your sizing against the real Kelly optimum for that
wager. Some offers are pitched with hyped, urgency-borrowing "trap" copy (negative true edge) —
the pitch is allowed to lie; `probability` and `cost`, printed right next to it, never do.

**Earn-only.** `balance` is a practice bankroll — no real currency, no payment provider, no
wagering of anything real, ever. There is no `energy` field anywhere in this service and nothing
here settles against `@red-cup-engineering/energy-bank`.

## Run it

```
npm install
npm run check && npm test   # syntax-checks every src/web file, then runs the test suite
npm run serve    # http://localhost:8787/ (or `node web/server.mjs <port>`)
```

Then open `http://localhost:8787/` in a browser.

Other scripts: `npm run check` (syntax only) and `npm test` (test suite only).

## Disclosure typing

Every action in the UI is typed as one of three things (`src/disclosure.mts` is the single
source every UI label reads from):

| Intent          | Type               | Named cost                                     | Visual treatment                    |
|------------------|--------------------|-------------------------------------------------|--------------------------------------|
| `adjust-stake`    | freely reversible  | none — bankroll untouched                       | calm solid green pill                |
| `reroll-offer`     | **priced**          | 2% of current balance (`REROLL_FEE_FRACTION`)   | dashed amber pill, exact coin amount |
| `commit-stake`      | **terminal**         | the full stake, at the wager's true odds        | thick uppercase red pill             |
| `new-run`            | freely reversible  | none — fresh seed-derived bankroll              | calm solid green pill                |

The only way to move past an offer without staking a positive fraction is `reroll-offer`, and it
is typed `priced`, not `reversible`: it costs 2% of your current balance, shown as an exact coin
amount before you commit to it. Declining every trap in a day is cheap but not literally free.

`ruinDisclosure` (`src/disclosure.mts`) is always computable from pre-commit values alone
(`state`, the offer, a proposed fraction), so the UI shows it on every stake-slider change,
strictly before `commit-stake` could ever be pressed.

## Counterfactual bankroll paths

`src/paths.mts#computePaths` replays four policies over one day's seeded offer sequence and
outcomes: `yours` (what you actually did), `kelly` (full, unfractional Kelly), `flat` (a fixed 5%
of current balance every time), and `allIn` (100% every time). All four see the exact same seeded
win/lose outcomes your own run would see at each offer index.

Full Kelly is the mathematically optimal *long-run growth rate*, not a guarantee for any single
short day — on a given 6-10 wager day, flat betting can finish ahead of Kelly purely from
variance. The run-summary panel says this explicitly rather than let the chart imply otherwise.

## Architecture

- `src/types.mts` — shared vocabulary (`WagerOfferSpec`, `BankrollState`, `WagerIntent`, …).
- `src/seed.mts` — FNV-1a → mulberry32 deterministic RNG, no clock, no `Math.random()`.
- `src/kelly.mts`, `src/odds.mts` — vendored, typed ports of
  `science-services-section/philosophy-services-section/relationality-services-section/agency-services-section/services/being-services-section/services/doing-services-section/services/playing-services-section/services/gaming-services-section/services/gambling-services-section`'s
  `kelly.mjs`/`odds.mjs` (published under a different npm scope, and those files aren't exported
  subpaths of the source package — see `src/kelly.mts`'s header). Vendor-parity tests run the
  same fixture cases as the source.
- `src/wagers.mts` — the day's seeded offer sequence, including honestly-labeled negative-EV
  "trap" framing. `probability`/`cost` are always true; `framing`/`pitch` are the only fields a
  trap is allowed to lie in.
- `src/engine.mts` — the pure bankroll engine (`createEngine`/`applyIntent`), ruin detection, and
  grading against the Kelly optimum.
- `src/disclosure.mts` — the three-way spend classifier every UI label reads from.
- `src/paths.mts` — the four-policy counterfactual replay.
- `src/manifest.mts`, `src/cartridge.mts`, `src/replay.mts`, `src/daily.mts` — the
  `@red-cup-engineering/cartridge` adoption (manifest, `Cartridge<>` contract, replay, daily-UTC
  seeding). This is a real, live dependency, unlike the vendored Kelly/odds library, because this
  package's subpaths are actually exported and in-scope.
- `web/server.mjs` — a zero-dependency `node:http` static server. Strips `.mts` files with
  `node:module`'s `stripTypeScriptTypes` so the browser loads the real engine source directly, and
  serves `@red-cup-engineering/cartridge`'s subpath exports at `/vendor/red-cup-engineering-cartridge/*`,
  matching `web/index.html`'s importmap.
- `web/js/kernel.mjs` — the browser's single door into the rules engine: a straight re-export of
  `src/*.mts` (no reimplementation).
- `web/js/render-disclosure.mjs`, `web/js/render-paths.mjs` — presentation-only renderers; they
  read `disclosure.mts`/`paths.mts` output and invent no rule of their own.
- `web/js/app.mjs` — the browser controller: owns the in-memory `BankrollState`, wires DOM events
  (stake slider, reroll/commit/new-run buttons) to `engine.mts#applyIntent`, and re-renders after
  every intent. `offer.framing` is never shown on the *live* pending offer — showing "this one's
  a trap" before you price it yourself would hand you the answer to the exact thing the game is
  testing. The framing tag is shown only in the post-hoc wager-history log, after a wager
  resolves.

## Known limitations

- `computeRuinProbability` is a **single-step** calculation: given the proposed stake resolves,
  does the *loss* outcome alone put the balance under `RUIN_THRESHOLD`? It is not a full
  multi-step gambler's-ruin probability over the rest of the day, which would require assuming a
  future staking policy nobody has chosen yet.
- There is no in-browser config picker; the client always plays the `'novice'` track. The
  `'sharp'` track is fully implemented and tested (`src/wagers.mts`) but only reachable by calling
  `createEngine(seed, 'sharp')` directly.
- `yours`, the real path you walked, can be shorter than the other three counterfactual paths
  whenever you reroll an offer or the run isn't finished yet — documented behavior in
  `src/paths.mts`, not a rendering bug.
