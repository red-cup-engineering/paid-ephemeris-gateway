# parlor-service

`parlor.561.group` — five games, one service, built on
[`@red-cup-engineering/parlor-kernel`](../../../../../../engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-game-system-services-section/services/parlor-kernel):
games as rules-as-data plus a thin face, not five separate reimplementations of dice math, turn
order, board graphs, or odds arithmetic.

Every game is daily-seeded under `parlor:<gameId>` (via `@red-cup-engineering/parlor-kernel/seed`),
so "today's dice/race/spins" is the same for everyone who hasn't started their own practice run.
No wagering anywhere on the shelf: every game is either pure chance with no economy at all, or a
practice-only bankroll that never touches real currency in either direction.

## Run it

```
npm install     # pulls @red-cup-engineering/parlor-kernel and @red-cup-engineering/cartridge from the
                 # private registry declared in .npmrc (http://127.0.0.1:4873/)
npm run serve   # http://127.0.0.1:8871/
npm test        # node --test over every game's engine plus the web smoke suites
npm run check   # .mts/.mjs syntax gate (see check-mts.mjs)
npm run verify  # check + test
```

`web/server.mjs` is a plain `node:http` static server, zero runtime dependencies, game-agnostic —
adding a game under `web/<game>/` and `src/games/<game>/` needs no server edit. `.mts` requests
are served type-stripped via `node:module`'s `stripTypeScriptTypes` so the browser imports the
real engine source directly. `/vendor/parlor-kernel/` and `/vendor/cartridge/` serve straight out
of each package's own `node_modules` so each game's import map can resolve the bare
`@red-cup-engineering/parlor-kernel/*` / `@red-cup-engineering/cartridge/*` specifiers its `.mts`
source imports. Host defaults to `127.0.0.1` (override with `HOST`), port to `8871` (override with
`PORT` or a CLI argument).

## The five games

Every game's `State` is exactly a kernel `TurnState<TData>` and `applyIntent` is
`createTurnReducer({ ... })` built from that game's own handler map — rules as data consumed by
the kernel's turn reducer, not a hand-written dispatch loop. `cartridge.mts` wraps
`{ createEngine, applyIntent }` via `@red-cup-engineering/parlor-kernel/replay#buildCartridge`
(`replay`/`serialize`/`deserialize` for free, since every `State` here is already plain JSON);
`manifest.mts` builds a `CartridgeManifest` and a `replayVerifier` via
`@red-cup-engineering/parlor-kernel/replay#createVerifier`.

### Pig, Farkle, Yacht — the dice trio

`src/games/{pig,farkle,yacht}/`, `web/{pig,farkle,yacht}/`.

Every decision shows a computed number next to it, recomputed live from the current turn state —
never hand-typed:

- **Pig** — hold-or-roll, first to 100. The bust probability and expected value of rolling again
  come from `@red-cup-engineering/parlor-kernel/odds#pigBustProbability` and
  `.../dice#diePmf`. `src/games/pig/odds.mts` derives the classic "hold at 20" threshold
  algebraically (`rollAgainEV = continueProbability * expectedPipIfContinue - bustProbability *
  turnTotal`, which for a fair six-sided die is `10/3 - turnTotal/6`, zero at `turnTotal = 20`).
- **Farkle** — dice-set scoring, hot dice, bust. First to 10000, 500 to get on the board. The bust
  probability for whatever dice pool remains comes from
  `@red-cup-engineering/parlor-kernel/odds#farkleBustProbability`; the mean score of rolling that
  pool fresh is computed by exact enumeration over all `6 ** diceRemaining` outcomes
  (`src/games/farkle/odds.mts#averageRollScore`), not sampled. Farkle does not implement the
  standard tournament "final round" rule — a bank that crosses the target ends the game
  immediately for everyone; see `src/games/farkle/rules.mts`.
- **Yacht** — 5 dice, 3 rolls, the real 12 standard categories (not Yahtzee's 13 — Yahtzee adds a
  "three of a kind" category and a Yahtzee-bonus rule Yacht doesn't have;
  `@red-cup-engineering/parlor-kernel/tally#YACHT_CATEGORIES` ships the real 12). Every category
  shows its exact score if committed now and its exact expected value of rerolling the
  currently-unheld dice once more, by enumerating every outcome of the free dice
  (`src/games/yacht/odds.mts#categoryLiveEVs`). `rerollEV` values the next roll only, not an
  optimal multi-roll lookahead — the same one-step-ahead grounding Pig's and Farkle's EV figures
  use. Ties break by seating order (first-seen max); see `engine.mts`.

Pig's and Farkle's bot opponents (`bot.mts`) read the exact odds figure the face shows the human
player and pick the sign — Farkle's bot additionally takes the maximal scoring set every roll.
Yacht ships no bot (two-player pass-and-play). Every rejection (an invalid Farkle selection, a
Yacht reroll with every die held, banking below Farkle's entry threshold, any intent after a game
is won) is the kernel-validated reducer throwing, not silently no-opping.

### Chutes & Ladders

`src/games/chutes/`, `web/chutes/`. The classic 100-square race, built entirely from
`@red-cup-engineering/parlor-kernel/board`: a chute and a ladder are one kind of edge (`jump`),
distinguished only by the sign of `to - from`. `src/games/chutes/board.mts` is the whole board —
the commonly-published US layout (not sourced from an official rules document):

- Ladders: 1→38, 4→14, 9→31, 21→42, 28→84, 36→44, 51→67, 71→91, 80→100
- Chutes: 16→6, 47→26, 49→11, 56→53, 62→19, 64→60, 87→24, 93→73, 95→75, 98→78

1-4 players, any mix of "You" and "Bot." Pure chance, zero decisions: `engine.mts#applyIntent`'s
`'roll'` handler never branches on `player.kind` — a bot's turn runs through the exact same code a
human's turn does. The face's own copy states it too: "The bot is a die with a seating position,
not an opponent."

While the race runs, `src/games/chutes/odds.mts#finishTurnDistribution` computes the exact
probability distribution of how many more turns the player rolling next needs to finish — an
absorbing-Markov-chain walk over the board's own graph (`resolveMove` for the transition, `diePmf`
for the die's per-face probabilities), evolved turn by turn and truncated at `maxTurns` with the
leftover mass reported as `truncatedTail` rather than dropped silently. The face redraws this as a
bar chart after every roll (`web/js/render-distribution.mjs`).

`dailySeed(gameId, date, configId?)` — today's race is the same for everyone who plays it today; a
"practice race" button offers a fresh seed any time. No economy anywhere in this game.

### Fair Spin

`src/games/reels/`, `web/reels/`. A 3-reel practice slot that inverts the genre: the machine face
permanently displays computed RTP, per-symbol hit odds per reel, and expected loss per 100 spins —
never behind a click, never a separate hand-typed number. `slotDisclosure()` computes every one of
those figures fresh, on every call, from the reels and paytable
(`@red-cup-engineering/parlor-kernel/odds#computeSlotRTP`, exact enumeration over all 1,728 reel
combinations, not sampled).

This machine's actual figures, re-derivable from `data.mts`'s reel strips and paytable:

- RTP: 91.38% (`0.9137731481481481` exactly)
- Expected loss per 100 spins at bet = 1: 8.62 credits
- P(a spin pays nothing at all): 1166/1728 ≈ 67.5%
- Paytable: three 7️⃣ = 100x, three ⭐ = 75x, three 🔔 = 10x, three 🍋 = 5x, three 🍒 = 3x, exactly
  two 🍒 = 2x

Practice bankroll only — `STARTING_BANKROLL = 100` practice credits, never funded by or redeemable
for real currency; no field, intent, or code path in `engine.mts` touches a payment provider. Every
action is typed: `'spin'` is terminal (once the reels land, that stake's outcome can't be undone —
with a pre-commit ruin disclosure shown before every spin), `'adjust-bet'` and `'new-session'` are
reversible (free, by construction).

`sessionSummary()` compares your actual recorded spins — real counts, not a resampled estimate —
against the published figures: total staked/returned, actual RTP so far vs. published RTP, and a
per-symbol actual-hit-count table next to the published odds.

## Package exports

Every game exports its `rules`, `engine`, `cartridge`, `manifest`, and `daily` modules (see
`package.json#exports`) for use outside the web face — e.g.
`@red-cup-engineering/parlor-service-561-group/pig/engine`.

## Tests

`node --test src/games/*/*.test.mts web/test/*.test.mts` — engine transitions and rejections for
each game, replay-to-verify determinism via `defaultReplay`/`hashState`, exact-odds cross-checks
against the kernel's own figures, board and daily-seed invariants, and two `web/test/*.test.mts`
suites that boot the real `web/server.mjs` over real loopback HTTP and check every game's face,
vendored kernel/cartridge subpaths, shared CSS, a 404, a path-traversal attempt, and the required
"no wagering" honesty copy.

`check-mts.mjs` is a real `.mts` syntax gate: `node --check` is a no-op on invalid `.mts` syntax in
this Node build, so `npm run check` strips each file's TypeScript syntax
(`node:module#stripTypeScriptTypes`) and runs the result through a real `node --check` subprocess.

## Not in this service

`sites/play.561.group/catalog.json` does not yet list these five games — a follow-up can pull each
game's `manifest.mts` export directly, per that catalog's documented pattern. Cross-listing on
`sites/play.561.group`'s existing shelf-chrome tile system (a different vendoring convention from
this service's own `web/css/shelf-chrome.css`) is a `play.561.group` change, out of scope here.

## License

No `license` field declared. Depends on `@red-cup-engineering/parlor-kernel` and
`@red-cup-engineering/cartridge` from the private Verdaccio registry declared in `.npmrc`
(`http://127.0.0.1:4873/`); not published to the public npm registry itself.
