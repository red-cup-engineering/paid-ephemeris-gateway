# casino-service

`casino.561.group` — Cowrie Casino: a real, monetized social casino. Per the owner's
2026-08-29 direction ([`2026-08-29-note-on-social-casino-direction.md`](../../content/text/documents/articles/notes/2026-08-29-note-on-social-casino-direction.md)),
this supersedes the shelf-wide earn-only doctrine for this one service: **no real-money
wagering or payouts, ever**, but tickets-for-play (timed regeneration plus purchasable
bundles) and chips (the play currency) are both first-class, real economy — not a practice
bankroll.

The first pass shipped the **service skeleton, economy, and server**. A second pass added
**Blackjack** (`src/games/blackjack/`) — the first real table game on the floor. A third pass
added the **flagship spectacle game, "Tideline Treasures"** (`src/games/slots/`) — a 5-reel/3-row/
20-payline video slot with wilds, scatters, a retriggerable free-spin bonus, and a progressive
jackpot fed by the house's shared pool, on `@red-cup-engineering/parlor-kernel`'s new multi-
payline grid math (`paylines.mjs`, added upstream that pass), rendered with
`@red-cup-engineering/qwzspace`'s procedural spectacle layer (drawables/tween/particles/camera/
celebration/render-loop) and scored with `@red-cup-engineering/resonator`'s procedural audio. This
pass adds the **realtime social floor** (`src/floor/`) — the layer that makes this a SOCIAL
casino: live presence over a real `@red-cup-engineering/qwzspace` room, the cast
(`@red-cup-engineering/cast` named agent regulars who actually play, on real chip accounts,
through the same table modules a human's HTTP request calls), tiered win broadcasts, and a live
jackpot ticker — see "The realtime social floor" below for the full architecture writeup, and
"Blackjack"/"Tideline Treasures" for those games' own sections (both unchanged in behavior by this
pass; only a small additive `onSettlement` hook was added to each table module).

## Run it

```
npm install     # pulls @red-cup-engineering/energy-bank, @red-cup-engineering/cartridge,
                 # @red-cup-engineering/card-table, @red-cup-engineering/parlor-kernel,
                 # @red-cup-engineering/qwzspace, @red-cup-engineering/resonator, and
                 # @red-cup-engineering/cast from the private registry declared in the
                 # shelf-wide .npmrc (http://127.0.0.1:4873/)
npm run serve   # http://127.0.0.1:8880/ (the living floor lobby) — blackjack is at
                 # /blackjack.html, Tideline Treasures (the flagship slot) is at /slots.html;
                 # the lobby opens a real WebSocket to the same port for the realtime floor,
                 # and the on-duty cast starts sitting down within a few seconds of the first
                 # viewer connecting (see "The realtime social floor" below)
npm test        # node --test over the economy modules, blackjack, slots, the realtime floor
                 # (world/room/cast-residency), and a real-HTTP server smoke suite
npm run check   # .mts/.mjs syntax gate (check-mts.mjs, vendored from parlor-service)
npm run check && npm test  # check + test
```

Environment variables: `HOST` (default `127.0.0.1`, set to `0.0.0.0` in the container — see
Dockerfile), `PORT` (default `8880`), `CASINO_SNAPSHOT` (a JSON file path; unset means
purely in-memory), `CASINO_SAVE_INTERVAL_MS` (default `30000`).

## Economy (`src/economy/`), built on `@red-cup-engineering/energy-bank`

This is energy-bank's **first live integration** on the shelf. Two instruments, both real
`liabilities:energy:*` double-entry ledger accounts, never redeemable for real money in
either direction:

- **TICKET** — the entry currency. `accrual.mts#computeAccrual` is a pure function of
  `(lastAccrualAt, currentBalance, now)`: no background timer anywhere in this package,
  one ticket regenerates per `TICKET_ACCRUAL_PERIOD_MS` (30 minutes) up to
  `TICKET_ACCRUAL_CAP` (5), computed lazily whenever a client calls `claimTickets`/hits
  `POST /claim-tickets`. `daily-bonus.mts#computeDailyBonus` grants one free claim per UTC
  calendar day (via `@red-cup-engineering/cartridge/seed#utcDateString`), with a streak that
  escalates linearly and plateaus at `DAILY_BONUS_MAX_STREAK_DAY`.
- **CHIP** — the play currency. Bought into via `buyIntoTable` (spend `BUY_IN_TICKET_COST`
  tickets, receive `BUY_IN_CHIP_GRANT` chips — the concrete shape of "tickets-for-play": a
  ticket is not itself wagered, it is the price of admission to a chip stack) or purchased
  directly in a bundle.
- **Bundles** (`bundles.mts`) — a SKU catalog (`BUNDLE_CATALOG`) of ticket and chip bundles
  at USD-cent prices, with a "best value" tier per instrument (the standard social-casino
  storefront ladder). Purchases go through
  `@red-cup-engineering/energy-bank/settlement`'s `SettlementBackend` interface exactly —
  `beginPurchase`/`settlePurchase` mirror flickering-delve-service's own
  `Payments.intent`/`Payments.settle` two-step shape. `mockBackend` is wired today (clears
  instantly, records real-money bookkeeping on the ledger in USD); dropping in a real
  backend later (ZBD, Stripe, whatever this house settles on) is a one-line change to
  `settlementBackends()`'s array, per energy-bank's own `resolveBackend` convention — see
  "What's not here yet."
- **Jackpot pool** (`jackpot.mts`) — a shared house account
  (`@red-cup-engineering/energy-bank/transfer#poolAccountId`) funded only by
  `rakeIntoJackpot` (a cut of a chip wager) or an explicit house `seedJackpot`, paid out
  only in CHIPS via `payoutJackpot`. No import of `settlement.mjs` anywhere in this file —
  the "no real-money payout" line is enforced by what this module *cannot* touch, not just
  documented.
- **Wager primitive** (`wager.mts`) — `placeWager`/`resolveWager`, the generic
  bet-then-resolve chip movement (take a bet, skim the jackpot rake, park the rest in a
  table's pot account, pay it back out) a future game engine composes on. No card, reel, or
  dice logic lives here — see "What's not here yet."
- **Invariants** — every operation above is exercised against energy-bank's own
  `checkAll` (`checkBooksBalance`, `checkNoNegativeBalances`, `checkPayoutInvariant`) in
  `casino-economy.test.mts`, and the live journal is served at `GET /audit`.

Chart of accounts this service owns (all `equity:*`/`expenses:*` paths are allowed to run
negative by the ledger's own convention — see `config.mts`):

| Account | Purpose |
|---|---|
| `liabilities:energy:casino:guest-<key>` | a guest player's TICKET/CHIP balance |
| `liabilities:energy:casino:pool-jackpot` | the shared jackpot pool (CHIP) |
| `liabilities:energy:casino:pool-table-<id>` | a table's pot for one wager round (CHIP) |
| `equity:casino:ticket-faucet` | source for free-ticket accrual grants |
| `equity:casino:daily-bonus` | source for daily bonus grants |
| `equity:casino:chip-issuance` | source for buy-in chip grants |
| `equity:casino:bundle-issuance` | source for purchased bundle contents |
| `equity:casino:jackpot-seed` | house cold-start/top-up source for the jackpot pool |
| `equity:casino:table-bankroll` | house cold-start source for a player-vs-house table's own pot (see "Blackjack" below) |
| `expenses:in-game-use:casino:ticket-entry` | sink for spent buy-in tickets |
| `assets:cash:mock` / `income:settlement:mock` | real-money bookkeeping for a cleared bundle purchase (energy-bank's `authorizeSettlement`) |

## Blackjack (`src/games/blackjack/`), built on `@red-cup-engineering/card-table`

The first real table game: `card-table`'s `./shoe` (a seeded, immutable-cursor 6-deck shoe),
`./blackjack` (hand-total math, H17/S17 dealer policy, exact recursive per-decision EV), and
`./svg` (the client's card/chip renderer) do the card-table-specific work; this service owns
the rules-as-data, the pure state machine, the chip integration, and the client.

- **`rules.mts`** — every house rule as data (`BLACKJACK_RULESETS`, keyed by the cartridge
  `configId`: `default` is S17, `h17` hits soft 17), never scattered `if`s in the engine:
  decks, penetration, blackjack payout ratio, double/split/surrender eligibility, `maxSplitHands`,
  bet bounds.
- **`engine.mts`** — a pure reducer over intents (`deal`/`hit`/`stand`/`double`/`split`/
  `surrender`/`next-hand`), in the house rules-as-data idiom `parlor-kernel/turns.mjs
  #createTurnReducer` establishes for Pig/Farkle/Yacht — written by hand here rather than by
  depending on `parlor-kernel` itself, since blackjack has no multi-seat turn order for that
  package's turn/player abstraction to generalize (one player acts; the dealer plays a fixed
  policy with no choices of its own). Deterministic: `createEngine(seed, configId)` derives
  the shoe, every reshuffle derives its own sub-seed from `seed` + a monotonic round counter,
  never the ambient clock — the same `(seed, intents)` always replays to byte-identical state.
  Dealer-peek naturals, auto-stand at 21, split-Aces-one-card-only, and late surrender are all
  real; insurance is deliberately not modeled (kept out to keep the settlement math clean, per
  the build brief's own allowance).
- **`ev.mts`** — the house signature: `computeHouseMath` calls `card-table/blackjack#handEV`
  against the table's own real, drawn-down shoe composition (cards already dealt — visible or
  the dealer's own hidden hole card — are correctly excluded from what could still be drawn),
  gated by the table's actual rules (`allowDouble`/`allowSplit`) so a number is never shown for
  an action that isn't really on the table. Exact recursive enumeration, never a static
  strategy-card lookup.
- **`table.mts`** — the chips integration seam, and the only module here that imports the
  economy: a bet (deal, or the extra stake a double/split adds) is charged through
  `CasinoEconomy#placeWager` *before* the matching engine intent is applied (gated by the
  engine's own pure `can*` predicates, so a chip is never taken for a refused action); a
  settled round's total payout is paid in one `CasinoEconomy#resolveWager` call. Because
  `placeWager`/`resolveWager` are pari-mutuel-shaped by default (a pot only ever holds what
  wagers deposited into it — fine when winners are paid from losers' own stakes), and
  blackjack is player-vs-house (a win can pay back *more* than the wager that funded it, e.g.
  3:2 on a natural), each table's pot is cold-start-seeded exactly once via the new
  `CasinoEconomy#seedTablePot` — the same "a brand-new pool with a real $0 looks broken"
  reasoning `jackpot.mts` already documents for the jackpot pool, applied to a table bankroll
  instead. `PublicState`/`publicState()` is the only state a client ever sees: the dealer's
  hidden hole card is `null`, never the real card, until it's genuinely revealed.
- **`cartridge.mts` / `manifest.mts`** — the `@red-cup-engineering/cartridge` adoption:
  `blackjackCartridge` wraps `createEngine`/`applyIntent` via `defaultReplay`
  (`serialize`/`deserialize` are the identity function — `BlackjackState` is already plain
  JSON), and `manifest.mts#verify` (built the same way, via `createVerifier`) is blackjack's
  own per-game replay verifier — verified for real by `manifest.test.mts`, not asserted on
  faith. (`catalog-entry.json`'s top-level `replayVerifier` no longer points at this one
  directly now that Tideline Treasures has its own, equally real, verifier — see that file's
  own `statusNote`.)

## Tideline Treasures (`src/games/slots/`), built on `@red-cup-engineering/parlor-kernel`, `@red-cup-engineering/qwzspace`, and `@red-cup-engineering/resonator`

The flagship spectacle game: a 5-reel, 3-row, 20-payline video slot — wilds, scatters, a
retriggerable free-spin bonus, and a progressive jackpot fed by the house's shared pool. Every
figure this game discloses is *computed*, never asserted — see "Math" below for the exact method
behind each number, and `ev.mts`'s own header for why three genuinely different computation
methods are used and honestly labeled as such.

### Math (`rules.mts` + `ev.mts`, on top of `@red-cup-engineering/parlor-kernel/paylines`)

- **Reels and paytable** (`rules.mts`) — one shared 16-symbol reel strip
  (`wave` x5, `anchor` x3, `starfish` x2, `gem` x2, `pearl`, `cowrie`, `wild`, `scatter`) used
  for all five physical reels — a deliberate simplicity choice: every reel's odds are auditable
  from one published array, not five separately-trusted ones. Six paying symbols low-to-high
  (`wave` → `cowrie` — the shell is deliberately the top *regular* symbol, since the shell IS
  the brand), `wild` substitutes for any paying symbol and has its own top-tier payout for an
  all-wild line, `scatter` pays anywhere on the grid and triggers/retriggers the free-spin bonus.
  20 payline patterns (straights/Vs/zigzags, the standard shape family real 5x3 video slots
  publish).
- **Exact base-game RTP, by full-grid enumeration** — `@red-cup-engineering/parlor-kernel/paylines
  #computeMultiLineSlotRTP` (new upstream this pass — see "parlor-kernel upstream changes" below)
  walks every one of the `16**5 = 1,048,576` equally-likely reel-stop combinations exactly, not
  sampled, evaluating every payline plus the scatter pay for each: **reel RTP = 49.08%** of every
  chip wagered, at 1,048,576 enumerated combinations (an audit figure any caller can cross-check
  against the reel length itself).
- **Exact free-spin trigger odds, same enumeration** — the identical pass also walks the exact
  scatter-count distribution (P(0)=35.4%, P(1)=40.9%, P(2)=18.9%, P(3)=4.35%, P(4)=0.50%,
  P(5)=0.023%), giving an exact **scatter-trigger probability of 4.877%** per spin (3+ scatters).
- **Free-spin RTP contribution, exact closed form (not simulated)** — a free-spin bonus can
  retrigger indefinitely in principle, so this is never simulated. Because every free spin is an
  i.i.d. draw from the identical reel set, the expected number of *new* free spins awarded per
  free spin played (`ES`, exact, from the scatter distribution above) lets the expected total
  bonus spins per trigger be computed by the standard branching-process closed form
  `initialAward / (1 - ES)` — **9.42 expected free spins per trigger**, exactly, from
  `initialAward` ≈ 6.16 (the award-weighted average of the 6/10/15-spin schedule) and `ES` ≈
  0.347. Multiplying by one free spin's own exact expected payout (scaled by the 2x free-spin
  multiplier) gives **+45.09% RTP contribution from the bonus** — exact, given the stated i.i.d.
  bonus model, a genuinely different guarantee than the enumeration above and labeled as such in
  `ev.mts`'s own `HouseMath.method` field.
- **Overall RTP: 94.17%** (reel 49.08% + bonus 45.09%) — squarely in the honest-but-commercial
  ~92–96% band the build brief asks for, landed by *tuning the paytable* (not the enumeration
  method) until the computed figure fell there — the number was never asserted, only the target
  band was a design goal going in.
- **Jackpot odds, exact per-reel product** — `computeJackpotOdds` multiplies each reel's own exact
  probability of landing `wild` at the designated row (`symbolAtRowOdds`) — independent draws,
  since each reel's stop is chosen independently. With one `wild` per 16-symbol reel, landing
  `wild` on all five reels along the center payline is exactly `(1/16)**5` = **1 in 1,048,576**
  — a real, publishable, "just over a million" progressive jackpot figure, not a marketing round
  number.
- **Effective RTP including jackpot-rake recycling: ~94.32%** — an honestly-labeled *steady-state
  estimate*, not a per-spin-exact figure like the ones above: the jackpot rake (`config.mts`'s
  `DEFAULT_JACKPOT_RAKE_BPS`, 2.5%, the same rake blackjack's own wagers already feed into the
  identical shared pool) is money this game's own reel math never sees directly, so
  `overallRTP*(1-rake) + rake` is offered as "if every chip ever raked into the pool is
  eventually paid back out to *some* player" — true in the limit by pure conservation, not
  claimed as an exact per-spin number.
- All of the above is computed by `ev.mts#computeHouseMath`, memoized (the full enumeration takes
  a couple of seconds — real work, not free, so it is paid once per process/ruleset and cached,
  never recomputed per request) and exposed on every `machine` response's `houseMath` field —
  see `ev.test.mts` for the from-scratch re-derivation that proves nothing here is hand-typed.

### Engine (`engine.mts`)

A pure reducer over two intents (`spin`/`collect`), written by hand rather than via
`parlor-kernel/turns.mjs#createTurnReducer` for blackjack's own stated reason: no multi-seat turn
order to generalize. `createEngine(seed, configId)` derives every spin's own sub-seed from
`${seed}:spin:${spinSeq}` (never the ambient clock), and every free spin inside a triggered bonus
derives its own sub-seed from `${seed}:spin:${spinSeq}:bonus:${bonusIndex}` — the same
(seed, spinSeq)-derivation discipline blackjack's shoe reshuffle uses, extended through an entire
multi-spin bonus round. `MAX_BONUS_SPINS_PER_ROUND` is a defensive cap (never hit by the tuned
default ruleset, whose `ES < 1` by design) so a hypothetically misconfigured future ruleset fails
loudly instead of hanging. Money never appears here — `engine.mts` only ever reports
`jackpotHit: boolean`; the jackpot chip AMOUNT is real, live economy state at the moment of the
hit, deliberately not part of the replayable game math (see that module's own header for the
full argument — this is precisely how a real progressive works).

### Economy integration (`table.mts`)

The only module here that imports the economy, mirroring `blackjack/table.mts` exactly: a spin's
`totalBet` is charged through `CasinoEconomy#placeWager` (which skims the jackpot rake into the
shared pool) before the engine's own `spin` intent runs; the round's total non-jackpot payout
(base spin plus every bonus spin) is paid in one `resolveWager` call. Tideline Treasures is
player-vs-house exactly like blackjack (a win routinely pays back far more than the wager that
funded it — free spins are played at zero additional stake, and a 5-wild line pays 611x
`betPerLine`), so its own pot is cold-start-seeded once per `machineId`
(`SLOTS_BANKROLL_SEED = 2,000,000`, sized to the paytable's own ceiling) via the identical
`seedTablePot` mechanism. A jackpot hit is settled by the new, directly-unit-tested
`settleJackpotIfHit` (reads the live pool via `CasinoEconomy#statusOf`, pays the whole balance via
the new `CasinoEconomy#payoutJackpot`) — and the shared jackpot pool itself is cold-start-seeded
once per *process* (`JACKPOT_COLD_START_SEED = 5,000`, purely so the very first player of a fresh
process doesn't see a real $0 jackpot; blackjack's own wagers already feed this same pool via
their existing rake).

### The spectacle client (`web/slots.html` + `web/js/slots.mjs`)

Canvas-only game content (`web/js/slots-drawables.mjs` registers eight procedural, gradient-
shaded symbol drawables — cowrie shell, pearl, anchor, wave, starfish, gem, wild, scatter — into
`@red-cup-engineering/qwzspace/drawables`' shared registry; zero raster assets, per the house's
zero-image doctrine), DOM only for chrome (balances, bet controls, House Math panel, paytable
view, sound toggle, auto-spin). The server is fully authoritative — one `/slots/spin` call
resolves the entire round (base spin, every bonus spin, jackpot payout) — so the client's whole
job is turning an already-known result into a good show:

- **Reel motion** — each reel's own local animation plan (`web/js/slots.mjs#buildReelPlans`)
  fast-scrolls a cosmetic filler sequence, then eases into the server's own final symbols via
  `@red-cup-engineering/qwzspace/tween`'s `easeOutBounce`, staggered stop-left-to-right
  (`REEL_STAGGER_MS`), with trailing ghost sprites at reduced opacity for a velocity-blur read on
  the fast-spin phase.
- **Anticipation** — when the final grid already carries 2+ scatters, every reel past the second
  one gets extra dwell time, a camera zoom-punch (`@red-cup-engineering/qwzspace/camera`), and a
  resonator riser cue.
- **Win presentation, tiered** — a line-trace glow sweeps each winning payline's own cells via
  `@red-cup-engineering/qwzspace/particles`' `sparkle-trail` preset; any win fires a `coin-fountain`
  and a tiered chime; a major/epic win adds `@red-cup-engineering/qwzspace/celebration`'s `win`
  timeline (confetti + camera shake + fanfare); a jackpot hit fires the full `celebrate('jackpot')`
  takeover (zoom-punch, seeded shake, coin fountain, confetti, and a "JACKPOT!" banner).
- **The render pipeline** — `web/js/slots.mjs` drives its own `requestAnimationFrame` loop that
  updates the domain simulation, then calls `@red-cup-engineering/qwzspace/render-loop
  #createRenderLoop`'s `tickOnce()` — a hand-rolled "immediate" buffer adapter stands in for the
  real `InterpolationBuffer` (which exists to smooth a *networked* room's ticks against transport
  jitter; this game has no such round-trip mid-animation, so buffering would only add latency for
  no benefit — see that module's own header), while `composeFrame`'s real tween/celebration/camera
  composition still runs unmodified.
- **Sound** (`web/js/slots-audio.mjs`) — `@red-cup-engineering/resonator`'s `createGameAudio`
  wired straight into `@red-cup-engineering/qwzspace/audio-cues`' dispatcher via
  `toPlayerInterface` (no adapter needed — the exact seam both packages' own READMEs describe), an
  ambient floor bed that ducks under every cue, and a persisted sound on/off toggle.
- **House Math panel** — off by default, `localStorage`-remembered (the same pattern blackjack's
  own panel uses), rendering every figure from the "Math" section above straight off the live
  `machine.houseMath` field — never a second, drifting copy of the numbers.

### Cartridge (`cartridge.mts` / `manifest.mts`)

Built the identical way blackjack's own adoption is: `slotsCartridge` wraps `createEngine`/
`applyIntent` via `defaultReplay` (`serialize`/`deserialize` are the identity function —
`SlotsState` is already plain JSON, including a full multi-spin bonus round's own grids/line-wins),
and `manifest.mts#verify` is Tideline Treasures' own per-game replay verifier, verified for real by
`manifest.test.mts` — a real recorded game (including free-spin rounds) replays to a stable state
hash, and a doctored log (spinning twice without collecting) is rejected.

### parlor-kernel upstream changes

`@red-cup-engineering/parlor-kernel` gained a new module this pass, **`paylines.mjs`** (bumped
0.2.0 → **0.3.0**, published to the shelf's Verdaccio registry), purely additive: `spinReelWindow`/
`spinGrid` generalize `reels.mjs`'s single-symbol-per-reel draw to a full windowed grid;
`evaluateLine`/`evaluateSpin` add wild substitution and scatter-anywhere pay over a payline;
`computeMultiLineSlotRTP` extends `odds.mjs#computeSlotRTP`'s exact-enumeration discipline to a
grid with many paylines, additionally returning the exact scatter-count distribution a game's own
free-spin math composes analytically on top of; `symbolAtRowOdds`/`computeJackpotOdds` give the
exact odds of one rare symbol combination (a jackpot). Nothing in `reels.mjs`/`odds.mjs` changed.
`parlor-kernel`'s own suite: **156/156 passing** (100 pre-existing + 56 new, in `paylines.test.mts`
— including a direct cross-check against `computeSlotRTP`'s own figure on an equivalent single-
line reduction). **Compatibility with the existing consumer**: parlor-service pins
`@red-cup-engineering/parlor-kernel` at an exact `0.2.0`; its own full test suite (92 tests) was
re-run with `0.3.0` temporarily installed (`npm install ...@0.3.0 --no-save`, never touching its
committed `package.json`/`package-lock.json`) and passed **92/92**, unmodified — proof the
additive bump breaks nothing there, without this service ever editing that sibling.

## The realtime social floor (`src/floor/`), built on `@red-cup-engineering/qwzspace` and `@red-cup-engineering/cast`

The layer that makes this a SOCIAL casino, not two solo games behind a shared lobby: live
presence, the cast (named agent regulars who actually play, on real chip accounts), tiered win
broadcasts, and a shared live jackpot ticker — all over one `@red-cup-engineering/qwzspace` room.

### Floor room (`world.mts` + `floor.mts`)

`world.mts#createFloorWorld` is the pure(ish) domain `@red-cup-engineering/qwzspace/room#createRoom`
folds: present players (a human by WS session, a cast persona by `cast:<id>` actor id) with a
`zone` (`lobby`/`blackjack`/`slots`) and a deterministic, hash-derived on-floor position; the live
jackpot pool balance; and a capped, TTL-expiring rolling feed (`event-<seq>` entities — falling out
of the TTL window is exactly qwzspace's own "left the interest set" removal, not a hand-rolled
special case). `floor.mts#createFloor` wraps `createRoom()` around it and exposes a small,
game-shaped facade (`sitDown`/`setZone`/`leave`/`broadcastDialogue`/`broadcastWin`/
`reportSettlement`/`onWin`/`summary`/`hasConnections`) so neither `server.mts` nor
`cast-residency.mts` has to touch qwzspace's raw intent-queue shape directly — every one of those
calls is a direct `room.queue.push({actorId, seq, kind, args})`, the exact mechanism qwzspace's own
`room.mjs` already uses internally for its synthetic `presence.join`/`presence.leave` intents (see
that module's own header); `gameValidate` remains the trust boundary for the one thing a real
browser client is allowed to send unprompted, `floor.chat`.

**Honest scope note on self-audit**: the jackpot balance is live, externally-owned `CasinoEconomy`
state — money the intent log itself never carries (a wager/rake/payout happens inside the ledger,
driven by real HTTP requests and cast decisions, never by an intent this room's own queue sees).
That makes the world impure with respect to qwzspace's replay-verifiable-room contract, by design —
"a domain whose whole point is to reflect state it does not own," the identical scope note
`@red-cup-engineering/qwzspace/lobby` documents for its own live member-count reads. `floor.mts`
sets `selfAuditEvery: 0` for exactly this reason. Presence/zone/feed folding is still genuinely
pure and replay-consistent; `src/floor/world.test.mts` proves it (two independently-created worlds
folding the identical intent sequence agree on every entity, byte for byte).

### Cast residency (`cast-residency.mts`)

**Roster rotation**: `castOnDutyToday(date, rosterSize)` deterministically shuffles the eight
authored `@red-cup-engineering/cast` personas (Pearl Winkle, Reef Halyard, Sable Ledger, Bonny
Driftwood, Gull Corbin, Otter Vance, Marina Quill, Cove Brackish) seeded by the UTC calendar date
and seats the first `rosterSize` (default 5) — the floor's regulars vary day to day without a live
clock inside the residency loop itself. `castGameAssignment` is a second, independent
UTC-date-seeded draw per persona deciding blackjack vs. slots, stable across a restart within one
day.

**The transport decision — in-process, not HTTP loopback**: `@red-cup-engineering/cast`'s own
`./adapters/http-json` is shaped for a persona talking to a game over the network (its own README:
"this is the adapter contract casino-service will implement" via injected
`buildObserveRequest`/`buildIntentRequest`). This service does NOT implement that adapter. A
persona here runs INSIDE this same server process, so a self-HTTP round trip would only add
latency, a second bearer-token session per persona, and a parallel serialize/deserialize of state
this process already holds as live objects, for zero benefit — "the same intent API as humans" is a
claim about the MODULE boundary (`BlackjackTable#apply`/`SlotsTable#apply`, the exact calls
`POST /blackjack/intent` and `POST /slots/spin` resolve to), not about which wire carries the call.
`createBlackjackTransport`/`createSlotsTransport` in `cast-residency.mts` satisfy
`@red-cup-engineering/cast/runner`'s `Transport` interface (`connect`/`observe`/`sendIntent`/
`disconnect`) by calling those same table methods directly — a persona's `hit`/`stand`/`spin` is
the identical `table.apply(...)` a human's HTTP request resolves to, just invoked from an
in-process loop instead of a JSON body. Swapping in the real `http-json` adapter later (a separate
load-test harness, a different service) would be a drop-in replacement; `runner.mjs` never knows
the difference.

Two small, additive seams on the game side make this possible without reaching into engine
internals: `BlackjackTable#pendingDecisionInputs()` exposes exactly what
`@red-cup-engineering/cast/policy/blackjack#blackjackPolicy` needs (`playerRanks`/`upcardRank`/
`composition`/`options`) — the same inputs `publicState()`'s own House Math panel already computes
internally — and both `BlackjackTable`/`SlotsTable` gained an optional last constructor argument,
`onSettlement`, fired once per settled round/spin with the raw `{game, accountId, wager, payout,
jackpotHit?, jackpotPayout?}` (see `BlackjackSettlement`/`SlotsSettlement`). Every existing caller
that never passes it — including every one of the 194 tests from before this pass — behaves exactly
as before; win-tiering policy (`tierForSettlement`, `floor.mts`) lives in exactly one place, so
`server.mts` (human tables) and `cast-residency.mts` (persona tables) both call the identical
`floor.reportSettlement(playerName, event)`.

A **composed policy** (written in this service, not shipped by `cast`, per that package's own
"composing the two is what a runner does" framing) layers three of `cast`'s modules per game: the
exact-EV `blackjackPolicy` / cadence-only `slotsPolicy` decide *what to do this turn*;
`./policy/bankroll`'s pure `betSize`/`walkAwayReason` (fed a per-session `recentOutcomes`/
`handsPlayed`/`startingChips` state this service tracks) decide *whether there's a next turn and
how much is at stake* — a `{action:'walk-away', reason}` decision is the one shape
`@red-cup-engineering/cast/runner` understands specially and ends the session with its own
`farewell` line. `./dialogue`'s seeded `reactTo` produces every utterance (sit-down/bet-placed/
win/loss/farewell, plus `runner.notify()`-queued reactions to a JACKPOT or big win somewhere else
on the floor — `jackpot-witnessed`/`win-big` situations, fanned out via `floor.onWin()` to every
OTHER currently-seated persona, never the winner). Money realism: `ensureFunded` calls the exact
same `claimTickets`/`claimDailyBonus`/`buyIntoTable` sequence a human's own UI buttons call — a
persona with no tickets today simply can't buy chips today, no invented house money.

**Dormancy — Cloud Run scales to zero, so the residency does too**: a persona's supervisor loop
starts every session by checking `floor.hasConnections()` (this service's live WS count, via
qwzspace's own `broadcast-hub#size()`) — while it's `0`, the loop parks on a cheap poll rather than
ever constructing a table, buying in, or sending an intent. Once a real viewer connects, the next
poll notices and the persona sits down. Mid-session, the same check runs after every runner event;
a connection count dropping to `0` calls `runner.stop()` (best-effort — any already-decided intent
for the current step still lands, ending the CURRENT step gracefully rather than a hard real-time
cutoff), and the persona's session ends with its own farewell line, same as a natural walk-away.
Nothing here fights Cloud Run's scale-to-zero: an instance with no timers doing real work is free
to be reclaimed.

### Win broadcasting

Both `blackjack/table.mts` and `slots/table.mts`'s `onSettlement` hooks feed
`floor.mts#reportSettlement`, which tiers the raw `(wager, payout, jackpotHit)` into
`'win'`/`'big-win'`/`'jackpot'`/`null` (`tierForSettlement` — a jackpot hit is always `'jackpot'`
regardless of multiple; below 1.5x the wager is never show-worthy) and, if it clears the bar,
broadcasts it onto the floor feed and fans it out to every other cast persona via `onWin()`. The
jackpot pool's own live balance is polled every room tick (`getJackpotBalance`), so the ticker
moves the instant a rake or a payout changes it — no separate broadcast wiring needed for that
part.

### The floor client (`web/index.html` + `web/js/floor.mjs` + `web/js/floor-audio.mjs` + `web/css/floor.css`)

Upgrades the lobby into a living floor: a canvas scene (`@red-cup-engineering/qwzspace/render-2d`
+ `render-loop`, the same "immediate buffer" adapter pattern `web/js/slots.mjs` establishes — this
floor's own `WorldView` already IS "current state," and the room ticks slowly enough that
InterpolationBuffer smoothing buys little) with two procedural, zero-raster-asset backdrop
drawables (a blackjack table oval, a slots bank) plus every present player rendered from their own
`avatar`/`sprite` data — a cast persona's exact `@red-cup-engineering/cast`-authored drawable/tint,
a generic tinted chip for a human guest. The live jackpot ticker count-up-animates toward the
room's own reported balance; the rolling event feed renders as a DOM list AND as transient chat
bubbles floating above the relevant avatar for dialogue/chat events; a win/big-win/jackpot feed
event fires a tiered `@red-cup-engineering/qwzspace/celebration` (confetti/coin-fountain, a jackpot
epic-tier zoom-punch) plus a `@red-cup-engineering/resonator` cue, with the ambient floor bed
ducked under it — the sound toggle shares its localStorage key with `slots-audio.mjs`'s own, so
muting on one page mutes the other. **Degrades gracefully by design**: `GET /floor/summary` (no WS
needed) renders an initial, if static-per-load, presence/jackpot/feed reading before a WebSocket is
ever attempted; if `WebSocket` doesn't exist or the room connection never opens, the floor panel
quietly shows a "reconnecting"/static note and does nothing else — `app.mjs`'s own balances/
bundles/claim flow is completely independent of this file and keeps working either way, with no
thrown error escaping this module's own boundary. One duplicated convention worth naming: the
canvas layout's `ZONE_CENTERS` constants must stay in sync with `world.mts`'s own (see "What's not
here yet" below).

### API additions

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /floor/summary` | none | `{ presenceCount, jackpot, players, recentEvents }` — the floor's state for a client without a WS connection (or a future play.561.group summary card) |
| WS upgrade on the same port | none | the floor room itself (`@red-cup-engineering/qwzspace/http-ws-server` hooks the http.Server's own `'upgrade'` event unconditionally — this is the only room this service runs, so there is no path-based routing to do) |

## Server (`src/server.mts`)

Native `node:http`, zero HTTP-framework dependencies — matching parlor-service's/flickering-
delve's own house style. Every `@red-cup-engineering/*` package this service depends on
(`energy-bank`, `cartridge`, `card-table`, `parlor-kernel`, `qwzspace`, `resonator`) is either
consumed straight from `node_modules` server-side or vendored to the client — no framework, no
bundler. Identity is a bearer-token guest session
(`sessions: Map<token, accountId>`, `POST /session` mints one from a client-minted
`clientKey`), the same shape flickering-delve-service's own `/session` route already uses
on this shelf — the simplest coherent scheme available since no sibling in *this*
game-home tree had picked one yet. Durable-account login is a seam (`accounts.mts`'s
`casinoDurableId`/`migrateGuestPlayer` are ready; no route calls them yet).

Serves the placeholder lobby from `web/` (dark casino palette, "Cowrie Casino" masthead,
live balances wired to the JSON API below, an explicit "what's coming" panel) at `/`.

### API

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | `{ status, sessions, invariants }` |
| `POST /session` | none | `{ clientKey? }` → `{ token, accountId, clientKey }` |
| `GET /balances` | bearer | full `BalanceStatus`: tickets, chips, cap, ms until next ticket, daily-bonus availability/streak, jackpot pool total |
| `POST /claim-tickets` | bearer | claims whatever free tickets are owed right now |
| `POST /claim-daily-bonus` | bearer | claims today's bonus if not already claimed |
| `POST /buy-in` | bearer | spends `BUY_IN_TICKET_COST` tickets for `BUY_IN_CHIP_GRANT` chips |
| `GET /bundles` | none | the SKU catalog |
| `POST /purchase-bundle` | bearer | `{ skuId }` → begins + settles against the mock backend, credits the SKU |
| `GET /audit` | none | `{ journal, invariants }` — the live hledger journal |
| `POST /blackjack/new-table` | bearer | `{ seed?, configId? }` → creates (or replaces) this account's table; a table's pot bankroll is cold-start-seeded once per underlying `tableId`, never re-seeded by a later `new-table` call |
| `GET /blackjack/state` | bearer | `{ status, table }` — 404 before a table exists |
| `POST /blackjack/intent` | bearer | `{ kind, bet? }` → `deal`/`hit`/`stand`/`double`/`split`/`surrender`/`next-hand`; `{ status, table }` on success, 400 on an illegal move or an uncoverable bet |
| `GET /vendor/card-table/svg.mjs` | none | serves `@red-cup-engineering/card-table/svg` straight out of `node_modules` so `web/js/blackjack.mjs` can import the house's real, zero-DOM card/chip renderer without hand-copying it into `web/` |
| `GET /slots/paylines` | none | `{ paylines }` — the 20 payline row-patterns, so `web/js/slots.mjs` can compute which grid cells a given line win touches for its own line-trace glow |
| `POST /slots/new-machine` | bearer | `{ seed?, configId? }` → creates (or replaces) this account's machine; the machine's own pot bankroll is cold-start-seeded once per underlying `machineId`, and the *shared* jackpot pool is cold-start-seeded once per process (see `table.mts`) |
| `GET /slots/state` | bearer | `{ status, machine }` — 404 before a machine exists |
| `POST /slots/spin` | bearer | `{ betPerLine }` → resolves the ENTIRE round server-side in one call (the base spin, plus every free spin a triggered/retriggered bonus plays out, plus a jackpot payout if the designated all-wild line landed) — `{ status, machine }` on success, 400 on an uncoverable/out-of-range bet or a spin attempted before the last result is collected |
| `POST /slots/collect` | bearer | acknowledges the pending result and returns the machine to `phase: 'ready'` — the slots equivalent of blackjack's `next-hand` |
| `GET /vendor/qwzspace/<path>.mjs` | none | serves `@red-cup-engineering/qwzspace/src/<path>.mjs` straight out of `node_modules` — by DIRECTORY, not one file (unlike the card-table route above), since qwzspace's own subpath modules import each other by relative path within that tree; `resolveInside` (the same traversal guard the static file server uses) scopes this to qwzspace's own `src/` only |
| `GET /vendor/resonator/<path>.mjs` | none | the identical directory passthrough for `@red-cup-engineering/resonator/src/<path>.mjs` (resonator's own `game`/`web` subpaths reach into sibling `voice`/`generative` directories by relative path, so the whole `src/` tree is vendored, not one export target) |

Every `table` in the blackjack responses above is a `PublicState` (see `blackjack/table.mts`):
rules, cards remaining, the current round (dealer/player hands, whichever cards are actually
visible right now, per-hand outcomes once settled), which actions are currently legal, and
`houseMath` — `null` except while a decision is pending on the active hand, in which case it's
the exact EV of every currently-legal action plus which one is best.

Every `machine` in the Tideline Treasures responses above is a `PublicState` (see
`slots/table.mts`): rules (reel/row/payline counts, bet bounds, free-spin multiplier), spins
played, phase (`ready`/`result`), the last full round result (`lastResult`, `null` once
collected — base spin, every bonus spin, total payout, whether the jackpot hit and how much it
paid), which actions are legal, the live jackpot pool total, and `houseMath` — unlike blackjack's,
this is **never** `null` (Tideline Treasures' math is a fixed function of its published reels/
paytable, not a depleting shoe's own live composition — see `ev.mts`), so it's always present for
the client's House Math panel to render on request.

## Testing

`node --test src/*.test.mts src/economy/*.test.mts src/games/blackjack/*.test.mts
src/games/slots/*.test.mts src/floor/*.test.mts` — **218 tests, 218 passing.** The original 194
(73 economy + 55 blackjack + 66 slots, see each section above) all still pass unmodified. This
pass adds 24 more: 23 in `src/floor/`, plus one addition to `server.test.mts`:

- **`world.test.mts`** (12) — the floor world reducer's determinism: `presence.join`/`.leave` add/
  remove a player entity and report it dirty; a `cast:`-prefixed actorId folds as role `'cast'`; a
  human's on-floor position is a deterministic hash of `(actorId, zone)` (two independently-seeded
  worlds folding the identical intent sequence agree byte-for-byte on every entity, position
  included); `floor.chat`/`floor.broadcast` fold into capped, attributed feed events; an
  unrecognized intent kind is ignored, never thrown; the jackpot entity is dirty only on an actual
  balance change; feed events expire past `FEED_TTL_TICKS` and are reported as a genuine removal
  (a delta's "gone" id, not a hand-rolled special case); the feed is capped at `MAX_FEED_EVENTS`,
  oldest-first evicted; `runTick` never mutates its own intents argument.
- **`floor.test.mts`** (6) — `tierForSettlement`'s win/big-win/jackpot thresholds (jackpot always
  wins regardless of multiple; exactly break-even is never a "win"); `hasConnections()` against a
  real qwzspace broadcast-hub; `sitDown`/`setZone`/`leave`/`broadcastDialogue`/`broadcastWin`
  landing on `summary()` after a real room tick; `onWin()` fan-out and unsubscribe; `reportSettlement`
  only broadcasting once a raw settlement clears the tiering bar, and paying the jackpot amount
  (not the base payout) on a jackpot tier; `selfAuditEvery: 0` — `verify()` runs against the live
  room without throwing (the honest scope note this module's own header documents, not a claim
  about jackpot-field replay fidelity).
- **`cast-residency.test.mts`** (5) — `castOnDutyToday`/`castGameAssignment` determinism against a
  fixed date, a real subset of the eight authored personas, no duplicates, and a genuine reshuffle
  on a different date; **dormancy**, directly proven: with zero floor connections, no persona ever
  sits down or spends a single chip (`economy.checkInvariants()` stays `[]`, no ledger movement at
  all — not merely "no errors"); **the full loop against a fake clock**, proven end to end: once a
  viewer connects, on-duty personas sit down (bounded-poll-until-true, not a fixed sleep, so a real
  regression fails the test instead of hanging it), play through the REAL economy (real
  `placeWager`/`resolveWager`, real ledger entries), keep the books balanced throughout
  (`checkInvariants()` stays `[]` after real play, not just at the start), land in a real game zone
  (never stuck in the lobby), and go quiet again once the last viewer leaves; **dialogue reaches the
  floor feed** during a real session. Every sleep call in this file resolves on the next real
  macrotask (`setImmediate`) rather than instantly — a purely synchronous no-op sleep starves
  Node's own timer phase and can livelock a retry loop whose only real exit condition is elapsed
  wall-clock time (discovered directly: an early version of this suite hung indefinitely on exactly
  that, tracing back to a real bug in `makeSlotsPolicy`'s own bet-affordability math, described in
  that function's own comment in `cast-residency.mts`).
- **`server.test.mts`** (1 new) — `GET /floor/summary` with no session required, reporting a real
  `0` presence count while dormant, then a real fake WS client added directly to `floor.room.hub`
  (bounded-poll-until-true, not a fixed sleep) proving an on-duty cast persona actually sits down
  and lands in the summary's `players`/`recentEvents`. Its `after()` teardown now also stops
  `castResidency`/`floor.room`, not just `server.close()` — the identical "an open timer keeps
  `node --test` alive past a passing run" hazard that hook's own comment already named for the
  http server, now covering the floor room's tick `setInterval` and the residency's supervisor
  loops too. A real end-to-end run (a real WebSocket client via
  `@red-cup-engineering/qwzspace/client-node`, connected for several real seconds against a live
  `node src/server.mts` process) was also exercised by hand during this pass's development: five
  on-duty cast personas sat down across both zones with their own authored avatars, spoke real
  dialogue lines, and the ledger stayed balanced (`GET /audit`'s `invariants: []`) throughout.

The earlier passes' own test breakdowns (55 blackjack, 66 slots) are unchanged from before this
pass and still pass unmodified — reproduced here verbatim for reference:

- **`engine.test.mts`** (23) — determinism (same seed + intents → byte-identical state, and a
  purity check that `applyIntent` never mutates its input), rules correctness (dealer H17 vs
  S17, blackjack pays the configured 3:2, dealer-peek naturals settle immediately, push/win/
  loss math), every intent's guard (`deal`/`hit`/`stand`/`double`/`split`/`surrender`/
  `next-hand`, including split-Aces' one-card-only rule and `maxSplitHands`), and shoe
  reshuffle-between-rounds behavior.
- **`ev.test.mts`** (7) — the House Math seam against the textbook borderline decisions
  `card-table/blackjack`'s own tests establish: hard 16 vs. dealer 10 favors hitting (weakly)
  over standing, a two-card 11 favors doubling over both, a hard 20 never prefers hitting
  against any upcard, and the table's own rule gating (`allowDouble`/`allowSplit`) is honored
  even when `handEV` alone would allow more.
- **`manifest.test.mts`** (6) — the cartridge replay/verify contract, for real: a recorded
  real game replays to the exact same state two independent ways (folding `applyIntent` by
  hand vs. `cartridge.replay`), `serialize`/`deserialize` round-trips exactly,
  `manifest.mts#verify` accepts a real intent log with a stable state hash and *rejects* a
  doctored one with an illegal move, and two different seeds' own games verify with different
  hashes.
- **`table.test.mts`** (9) — chip conservation through every settlement category (win,
  blackjack 3:2, push, loss, surrender, double, split) against a real `CasinoEconomy`, each
  checked with `checkInvariants()` immediately after; a 40-hand mixed sequence exercising
  double/split/hit/stand throughout keeps the books balanced end to end and confirms the
  jackpot pool actually accrues rake.
- **`server.test.mts`** additions from the blackjack pass (10) — the `/blackjack/*` API surface
  (401/404/400 paths, a real chip-funded deal round-trip with a balanced `/audit` afterward), the
  House Math panel reporting real numbers over live seeds, confirmation the dealer's hidden hole
  card is never sent to the client while genuinely hidden, and the vendored
  `/vendor/card-table/svg.mjs` route serving real, executable JS.

This pass's own 66 additions:

- **`slots/engine.test.mts`** (18) — determinism/purity (same seed + intents → byte-identical
  state, `applyIntent` never mutates its input), phase guards (`spin`/`collect` alternation,
  double-spin/premature-collect rejection), bet-bounds validation, arithmetic consistency over
  500 real spins (`totalPayout`/`totalFreeSpinsAwarded` always match the base+bonus trail), and —
  the notable technique — hand-crafted single-symbol-reel fixtures that make jackpot hits and
  free-spin trigger/retrigger arithmetic 100% deterministic and directly checkable, with no
  brute-force search for a real 1-in-a-million event (`playOneSpin`/`playRound` both take an
  explicit `rules` object, bypassing the ruleset registry entirely for this).
- **`slots/ev.test.mts`** (8) — every `computeHouseMath` figure re-derived from scratch via the
  same `@red-cup-engineering/parlor-kernel/paylines` calls and compared for exact equality (never
  trusting the cached value against itself), the reel-strip/enumeration-size/jackpot-odds figures
  checked against their own closed-form expectations, and the overall RTP asserted to land in the
  92–96% band.
- **`slots/manifest.test.mts`** (6) — the identical cartridge replay/verify contract proof
  blackjack's own manifest test runs: a real recorded game (through a free-spin bonus) replays to
  a stable hash two ways, `serialize`/`deserialize` round-trips exactly, and a doctored log
  (spinning twice without collecting) is rejected.
- **`slots/table.test.mts`** (9) — the machine bankroll seeded exactly once per `machineId`
  (checked via the real ledger journal, not just inference), the jackpot pool's own once-per-
  process cold start, `settleJackpotIfHit` paying the entire live pool and leaving the books
  balanced (including the "hit against an empty pool pays nothing" edge case), a wager the player
  can't cover taking no chips, and a full funded spin/collect/spin sequence staying balanced
  throughout.
- **`slots/spectacle.test.mts`** (7) — a fully headless proof of the client's own composition
  path: `composeFrame` on a real 5x3 grid plus an active jackpot celebration (particles/overlay/
  camera all fold in correctly, and expire correctly), `frameOps` producing one sprite op per
  cell, and `createRenderLoop#tickOnce()` against a hand-written mock 2D canvas context —
  proving real `clearRect`/`arc`/`fill`/`translate`/`fillText` calls happen end to end, with no
  browser and no `requestAnimationFrame`.
- **`server.test.mts`** additions (18) — the `/slots/*` API surface (401/404/400 paths, the
  published payline patterns, a real chip-funded spin→collect round-trip with a balanced
  `/audit` throughout, out-of-range-bet and double-spin rejection, and a bounded-sample proof
  that every spin's jackpot fields are well-formed whether or not that spin actually hit), plus
  the new `/vendor/qwzspace/*`/`/vendor/resonator/*` directory passthroughs (real executable JS,
  a sibling relative import resolving through the same vendor root, an unknown package refused,
  and a traversal attempt against a real package root refused).

## energy-bank version

This service depends on `@red-cup-engineering/energy-bank@0.3.0` (the exact-BigInt-decimal
ledger), published to the private Verdaccio registry (`http://127.0.0.1:4873/`) on
2026-08-29. (The service was first built against `0.2.0` — the registry's then-latest —
whose scaled-double arithmetic was already exact for this service's integer-only TICKET/CHIP
amounts; the bump required no code change, as the two versions share identical function
signatures. The full 73-test suite passed on both.)

## Other fresh dependency versions

- `@red-cup-engineering/parlor-kernel@0.3.0` — this service's own upstream bump (Tideline Treasures
  pass); see "parlor-kernel upstream changes" above for the additive `paylines.mjs` module and the
  compatibility proof against parlor-service's own pinned `0.2.0`.
- `@red-cup-engineering/qwzspace@0.6.0` — this pass is the first to consume its ROOM/networking
  layer for real (`./room`, `./http-ws-server` via `room.attach()`, `./client-browser`,
  `./broadcast-hub`), not just its spectacle rendering subpaths (`drawables`/`tween`/`particles`/
  `camera`/`celebration`/`render-loop`), which the Tideline Treasures pass already adopted and this
  pass's floor client reuses via the identical `/vendor/qwzspace/*` directory passthrough (now also
  serving `room`/`client-browser`/`deterministic-random`, all under the same `src/` tree that
  passthrough already vendors wholesale).
- `@red-cup-engineering/resonator@0.2.0` — consumed via the existing `/vendor/resonator/*`
  directory passthrough; this pass's `web/js/floor-audio.mjs` is a second, independent `./web` +
  `./game` consumer alongside `slots-audio.mjs`, sharing that module's own localStorage keys (see
  `floor-audio.mjs`'s own header).
- `@red-cup-engineering/cast@0.1.0` (this pass's own new dependency) — `./persona` (the eight
  authored personas + `AUTHORED_PERSONAS`/`listAuthoredPersonaIds`), `./dialogue` (`reactTo`),
  `./policy/blackjack`, `./policy/slots`, `./policy/bankroll` (`betSize`/`walkAwayReason`), `./rng`
  (`makeSubRng`, for this service's own UTC-day-seeded roster rotation), and `./runner`
  (`createRunner`) — see "The realtime social floor" above for exactly how each is composed. This
  service does NOT consume `./adapters/http-json` or `./adapters/qwzspace` — see that section's own
  "transport decision" writeup for why an in-process `Transport` was written instead.

## What's not here yet (the seams)

- **More game engines.** Blackjack and Tideline Treasures are the first two — see their own
  sections above — and each follows (or, for Tideline Treasures, further establishes) the same
  pattern a third one would follow: import `CasinoEconomy`, call `placeWager` when a bet is
  placed and `resolveWager` when a round settles (seeding the table/machine's own pot bankroll
  once via `seedTablePot` if it's player-vs-house, not pari-mutuel), and own everything about
  *what happens in between* — RTP tables, paytables, animation — itself. `catalog-entry.json`
  honestly flipped `cartridgeWrapped` back to `false` at its own top level now that two unrelated
  per-game verifiers exist (see that file's own `statusNote`) — a third game arriving changes
  nothing further there, since the field is already honestly scoped to "ask each game's own
  manifest," not the service as a whole.
- **Human zone-tracking beyond the lobby page.** A human is only tracked as floor presence while
  their `web/index.html` tab holds the WS connection open; `blackjack.html`/`slots.html` don't
  themselves join the floor room or send a `floor.zone` intent, so a human actually seated at a
  table shows up on the floor as "in the lobby," not "at blackjack" — a real gap, not an oversight
  (the build brief's own file list for the floor client scoped this pass to `web/index.html` +
  `web/js/floor.mjs`, deliberately not touching the two already-well-tested game pages). Wiring
  `blackjack.mjs`/`slots.mjs` to also open (or share) the floor connection and push `floor.zone` on
  load is a small, additive follow-on.
- **The `ZONE_CENTERS` layout is duplicated**, once in `src/floor/world.mts` (server-side, drives
  every entity's actual position) and once in `web/js/floor.mjs` (client-side, drives where the
  backdrop table/bank drawables are drawn) — both files say so in their own headers. A
  `GET /floor/summary`-style layout endpoint (or folding the constants into the wire protocol
  itself) would remove the duplication; two small, hand-kept-in-sync literals was the pragmatic
  choice for this pass's scope.
- **Near-miss detection for cast slots reactions.** `@red-cup-engineering/cast/policy/slots
  #classifySpinOutcome`'s `nearMiss` flag (feeding the `'near-miss'` dialogue situation) is always
  passed `false` from `cast-residency.mts` — computing "the reels landed one symbol short of a
  trigger" from a multi-payline grid honestly wasn't worked out this pass; a persona still reacts
  to every real win/loss, just never to a genuine near-miss.
- **Dormancy poll granularity.** A persona notices a fresh viewer (or the last one leaving) on its
  own `DORMANCY_POLL_MS` (5s) cadence, not instantly — "generous," per the build brief's own ask,
  not real-time. A room-level presence-count subscription (rather than each persona polling
  independently) would tighten this if it ever mattered.
- **A richer floor scene.** The canvas today draws two backdrop shapes (a blackjack table, a slots
  bank) and generic per-role avatars; multiple tables/machines per game, seat-level positioning at
  a table, or a walk-animation between zones are all real options for a later spectacle pass — see
  `web/js/floor.mjs`'s own header for the "immediate buffer" rendering approach a richer version
  would build on.
- **A separate bonus-round reel set.** Tideline Treasures' free spins are played on the exact
  same shared reel strip as the base game (see `ev.mts`'s own header on why the free-spin EV
  contribution is an exact closed form rather than a simulation: it depends on the bonus being
  i.i.d. with the base game). A richer bonus (its own reel weighting, a separate multiplier
  ladder) is a real design option for later, but would need its own RTP contribution computed by
  the same enumeration discipline, not assumed.
- **A real settlement backend.** `bundles.mts#settlementBackends()` returns `[mockBackend]`
  only. Wiring a real backend is adding it ahead of `mockBackend` in that one array, with its
  config read from environment variables at server start (matching flickering-delve's own
  `PaymentsConfig` pattern) — no other file in this service needs to change, since
  `resolveBackend`/`authorizeSettlement` are already the whole boundary.
- **Durable accounts.** Every session today is a guest (`accounts.mts#casinoGuestId`).
  `casinoDurableId`/`migrateGuestPlayer` exist and are unit-testable but unwired — no login
  route calls them yet.
- **GCS persistence.** `persistence.mts` is a JSON-file snapshot behind `CASINO_SNAPSHOT`;
  swapping it for GCS (matching farstone-services-section's own convention) only requires
  replacing `loadSnapshot`/`saveSnapshot`'s two bodies, since `server.mts` and
  `casino-economy.mts` only ever call them by name.
