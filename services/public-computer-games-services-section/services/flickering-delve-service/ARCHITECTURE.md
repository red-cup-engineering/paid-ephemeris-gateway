# flickering-delve-service — architecture

Companion to `DESIGN.md` (decisions) and `README.md`/`ROADMAP.md`; written against the house
[Specification Standard](../../../../../../../../../561-group-gaming-enterprises-services-section/content/text/documents/articles/notes/house-specification-standard.md).
This document assumes `DESIGN.md` is open beside it and does not restate its rationale.

## 1. Introduction and goals

flickering (working title "the Gnaw") is a browser idle-roguelike built on the FeltOS kernel
(`@red-cup-engineering/fizzos`) whose one genuinely new idea, per its own `README.md`, is that "the
interface stopped being about playing the game; it became about strategizing the play" — the
autonomy ladder does not bolt autobuyers onto a numbers game, it folds each manual verb into a
clause of a decision program a player later reads and rewrites in FeltOS's own relational Lisp.
This service is the doctrine originator for the fleet's idle-roguelike pattern: `onestone-service`
inherits it, and its `ledger.mts`/`payments.mts` are near-verbatim ports of the modules described
below.

## 2. Constraints

Everything in the house standard's §2 applies without local variance:

- **Determinism.** `seed.mts` is the sole randomness source (FNV-1a `hashSeed` → mulberry32
  `rngFrom`/`rngAt`). The only clock read anywhere in `src/*.mts` is `scene.mts`'s module-level
  `nowMs()`, used as the impure scene's default clock and passed everywhere downstream as a value —
  never read ambiently inside a pure function. `dungeon.mts`, `economy.mts`, `progression.mts`, and
  `strategy.mts` are clock-free and RNG-free.
- **One dependency.** `package.json`'s `dependencies` is `@red-cup-engineering/fizzos` alone. No
  `@lenticule-science/metrologic` (or any other math-family package) is imported anywhere in this service — §13
  is accordingly omitted below, not filled with a placeholder.
- **One stateful scene.** `DelveScene` (`scene.mts`) is the service's one mutable-state module;
  `seed.mts`, `dungeon.mts`, `economy.mts`, `progression.mts`, and `strategy.mts` are pure, each
  with a co-located `.test.mts`.

## 3. Context

Deploys as `flickering.561.group` per the vision note's per-game-subdomain convention. Money flows
through three real `PaymentProvider` adapters (`mock`/`stripe`/`hive`) behind one boundary (§8);
FeltOS (`@red-cup-engineering/fizzos/{world,lisp,persistence}`) is the one external substrate this
service composes rather than reimplements.

## 4. Solution strategy

"State = world." Every scrap of player progress is a functional cell on the player entity in an
immutable FeltOS world (`essence`, `depth`, `gen:*`, `automation:*`, …), so the game state *is* an
event-sourced audit log with no second persistence model — `snapshot()`/`restore()` are literally
`snapshotWorld`/`restoreWorld` over that one structure. "Automation = Lisp, decided not executed": a
player's owned automation tiers compose into a Lisp program (`progression.mts::composeStrategy`);
the tick evaluates it read-only against the world and takes only the returned action symbol
(`strategy.mts::decideAction`), then applies that action through the *same* command handlers manual
play uses (`scene.mts::runAction` → `command()`) — there is exactly one implementation of "attack,"
whether a human clicked it or a player-authored program decided it.

## 5. Building block view

| Module | Pure? | Responsibility |
|---|---|---|
| `seed.mts` | pure | FNV-1a `hashSeed`; mulberry32 `Rng`; `rngAt(base, ...coords)` composite seeding |
| `dungeon.mts` | pure | `floorSpec(config, depth)` — deterministic per-floor biome/monster/hazard/trickster generation |
| `economy.mts` | pure | `GameState` shape; the generator cascade (`GENERATORS`, tier-produces-tier); cost curves; `stepEconomy`/`offlineAccrual`; `avatarStats` (combat investment + per-echo bonus); `formatNumber` |
| `progression.mts` | pure | Unlock predicates; the `AUTOMATIONS` ladder (id, cost, the Lisp clause it contributes, `order` priority); `composeStrategy`; rekindle math (`rekindleReward`, `persistentUpgrades`, `rekindle`) |
| `strategy.mts` | pure | `decideAction(program, world, self)` — bounded (`fuel: 1_000`), effect-discarding evaluation of a Lisp program against the read-only world; `normalizeAction` whitelists the five legal action symbols |
| `ledger.mts` | pure (class over private state) | `Ledger` — append-only double-entry journal; `record()` throws on any postings that don't net to zero per commodity; `report()` recomputes balances from the entries |
| `payments.mts` | pure factories + one manager class | `PaymentProvider` boundary; `mockProvider`/`stripeProvider`/`hiveProvider`; `Payments` (order minting, provider resolution with real-then-mock fallthrough, idempotent settle-and-ledger-post) |
| `accounts.mts` | pure functions + thin class | `guestActorId`/`accountActorId` (sanitizing slug); `hashSecret` (sha256); `Accounts.authenticate`/`migrateGuest` |
| `chrome.mts` | pure | The vendored 561-shelf chrome CSS/mark, with the local dark-only theme override |
| `scene.mts` | **the one stateful module** | `DelveScene` — world construction, the tick pipeline, all command handlers, `stateFrame` projection, federation export/import, boost application |
| `server.mts` | impure (transport) | Native `node:http`/SSE; wires scene+ledger+payments+accounts; `/session`, `/input`, `/stream`, `/pay/*`, `/claim`, `/ledger`, `/store`, `/health` |
| `client.mts` | browser UI | `CLIENT_HTML` — no-build single document |

Every module above except `client.mts` and `server.mts` ships a co-located `.test.mts`.
`server.mts` and `client.mts` are exercised indirectly through `scene.test.mts` and manual play,
not unit-tested directly — a real, minor coverage gap named in §11.

## 6. Runtime view

**Scenario A — a manual attack that clears a floor and triggers a trickster echo.**
`POST /input {token, line:"attack"}` resolves the bearer token to an actor and pushes
`{actor, line}` onto the module-level queue; the next tick calls `scene.runTick(intents)`, which
processes manual commands first: `command(actor, "attack")` dispatches to `attack()`, which reads
`floor-hp` and the actor's `atk` (via `project()`, itself reading every functional cell through
`economy.mts::avatarStats`), computes `nextFloorHp = floorHp - atk`, and — since it clears — calls
`clearFloor()`, which rounds the floor's `essenceReward` (computed once, purely, by
`dungeon.mts::floorSpec`) by the active boost multiplier, credits `essence`/`lifetime-essence`, and
— if the floor's `trickster.echoes` is nonzero (a `crow-teach` mark) — credits bonus `echoes`
scaled by `economy.mts::echoMultiplier`. Every mutation is a `this.set(actor, predicate, object)`
call, which is `tell(this.world, ...)` — the only write surface in the whole service, so every
state change is, by construction, an appended fact in the FeltOS trace.

**Scenario B — a fully-automated tick under a player-authored strategy.** With `auto === true` and
at least one automation owned, `automationAgent()` composes the program
(`progression.mts::composeStrategy` folds owned automations' clauses by priority into
`(or clause… 'wait)`, or returns the player's own custom Lisp verbatim if they've written one), then
calls `strategy.mts::decideAction(program, this.world, actor)` — which evaluates the program with a
1,000-step fuel budget and discards the threaded world entirely, keeping only the returned action
symbol, coerced through `normalizeAction` to one of `attack|descend|retreat|rekindle|buy|wait`
(anything else, including a malformed program or a budget exhaustion, normalizes to `wait`).
`runAction()` then calls the identical `command()` path Scenario A used — the concrete mechanism
behind "a custom strategy can decide, never cheat": the Lisp evaluator's own effects are thrown away
every tick, and only a whitelisted symbol crosses the trust boundary.

**Scenario C — a Stripe purchase clearing via webhook, then the boost applying.**
`POST /pay/intent` calls `payments.mts::Payments.intent`, which mints an `Order` and calls the
resolved provider's `createIntent` — for Stripe, a real REST call to
`api.stripe.com/v1/payment_intents` with the order id embedded in `metadata.orderId`. Stripe's later
webhook hits `POST /pay/stripe/webhook`, which calls `Payments.settleStripeWebhook` →
`settle(orderId, {payload, signature})`; `stripeProvider.settle` verifies the HMAC-SHA256 signature
with constant-time comparison (`verifyStripeSignature`) before trusting the payload, confirms
`event.type === "payment_intent.succeeded"` and that the metadata's order id matches. Only then does
`Payments.settle` check `ledger.has(order.id)` (idempotency against webhook retries) and post a
balanced double-entry `LedgerEntry` — and the route applies the resulting `BoostGrant` by calling
`scene.grantBoost(actor, kind, value, durationSeconds)`, which sets a time-bounded
`boost-mult`/`boost-until` cell pair — a rate multiplier, never a flat resource grant.

## 7. Deployment view

`node src/server.mts` directly; `FLICKERING_PORT`/`PORT`, `HOST`, `FLICKERING_SAVE` (world snapshot
path), `FLICKERING_LEDGER` (journal path), and the three provider credential sets
(`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, `HIVE_ACCOUNT`/`HIVE_NODES`) — with no credentials
set, both real providers report `configured: false` and every purchase resolves to `mockProvider`,
so the game is fully playable and testable without payment infrastructure. Persistence is
atomic-JSON via `@red-cup-engineering/fizzos/persistence`'s `loadJsonSnapshot`/`saveJsonSnapshot`,
checkpointed every 30s and on `SIGINT`/`SIGTERM`. No `DEPLOY.md` exists for this service yet;
`onestone-service/DEPLOY.md`'s Cloud Run pattern (`--max-instances 1`, `--session-affinity`,
do-not-configure-real-payments-before-durable-storage) applies near-verbatim here given the
identical single-process-state shape.

## 8. Crosscutting concepts

- **Ledger invariants.** The double-entry balance holds: `Ledger.record` refuses an unbalanced
  entry; `ledger.test.mts` and `payments.test.mts` exercise this. `income:premium`/
  `assets:cash:{provider}` are the only account families this service posts to — it only ever posts
  income. There is no payout direction (no `liabilities:*`/`expenses:payout:*` posting anywhere in
  this codebase), so a payout-never-exceeds-revenue invariant does not apply here.
- **Ethics as executable tests.** Boosts are bounded by shape (`Reward = k·CurrentRate·Time`) — the
  three `SKUS` are every one a time-limited rate or offline-cap multiplier, never a flat grant, and
  `payments.test.mts` asserts this shape holds. The doctrine "no boost bypasses tutorial unlocks or
  prestige" is stated in `DESIGN.md` and `README.md` but not currently asserted by a direct test
  (§11).
- **Accessibility.** `client.mts` is a single-document browser UI; no automated accessibility test
  exists in `src/*.test.mts` — every test exercises domain logic, none exercise `client.mts`.

## 9. Decisions (ADRs)

- **ADR-1: this service is the doctrine originator, not a follower.** `onestone-service/DESIGN.md`
  explicitly inherits this service's doctrine, and its `ledger.mts` is a near-verbatim port.
- **ADR-2: world-as-state, chosen over a second `GameState` store.** `scene.mts`'s own header states
  the alternative it closed off: "There is no GameState store beside the world — the world is it,
  and it is auditable." `economy.mts`'s `GameState` interface exists purely as a *projection* type —
  `project()` rebuilds it fresh from world cells on every call; nothing persists a `GameState`
  object across ticks.
- **ADR-3: automation decides through the same handlers manual play uses**, to keep exactly one
  implementation of every verb. `runAction()` calls `this.command(actor, "attack")` — the same
  string-dispatch entry point a human's `/input` line reaches, so a regression in `attack()`'s
  combat math cannot silently diverge between manual and automated play.
- **ADR-4: offline accrual reuses the live-tick economy step at coarse `dt`**, rejecting a separate
  analytic formula. `economy.mts`'s own header: "Coarse-tick simulation is the honest method when
  production is non-constant... analytic linear grant would understate it." `offlineAccrual` loops
  `stepEconomy`, not a closed-form integral; `economy.test.mts` asserts offline-simulated and
  online-ticked production converge for the same elapsed time.

## 10. Quality

54 tests (`node --test`), one per module below `scene.mts`/`server.mts`/`client.mts`, plus
`scene.test.mts` and `accounts.test.mts` exercising the stateful scene end to end. `seed.mts` has no
dedicated test file — its two exported functions are exercised transitively through every other
module's tests, not directly (§11). The rest ship real property-style assertions, not only fixed
examples — e.g. `progression.test.mts::"rekindle resets the run but keeps echoes, fame, automations,
meta upgrades"` and `strategy.test.mts::"unknown / malicious program output collapses to wait
(sandboxed)"` are invariant checks.

## 11. Risks and technical debt

1. **No `DEPLOY.md`.** Every other doctrine-bearing service in the fleet either has one
   (`onestone-service`) or is small enough not to need one yet; this service has real payment
   provider wiring and a stated production warning ("Real product/price setup... must be decided
   BEFORE `/pay` goes live") with nowhere written down to check it against at deploy time.
2. **No ethical-bound test for "boosts never bypass tutorial unlocks or prestige."** The doctrine is
   stated in prose (`DESIGN.md`, `README.md`) but `payments.test.mts` only asserts the *shape* of a
   boost grant (rate/offline, bounded duration), not that applying one cannot, e.g., unlock an
   automation tier early.
3. **`server.mts` and `client.mts` have no direct test coverage.** Both are exercised only
   indirectly (through `scene.test.mts`'s calls into the same functions `server.mts` wires up, and
   manual play). A server smoke test (boot on port 0, session→stream→input) — the pattern
   `onestone-service/server.test.mts` already ships — is a concrete, scoped fix.
4. **`seed.mts` has no dedicated test file.** Both exported functions (`hashSeed`, `rngFrom`/`rngAt`)
   are only exercised indirectly through every other module that consumes them.

## 12. Glossary

**Rekindle** — this service's term for prestige: collapsing a run's essence/generators/depth into
persistent `echoes` (`progression.mts::rekindle`). **Standing order** — a rung of the autonomy
ladder (`AutomationDef`), named for the manual verb it folds away. **Trickster** — a seeded floor
mutator (Coyote robs/gambles, Crow gifts/teaches) that scales a floor's essence reward or grants
bonus echoes (`dungeon.mts::Trickster`).

## 13. Theory binding

**Omitted, honestly.** No module in this service imports `@lenticule-science/metrologic` or any other package
from the `voidmath`/`obsmetrologia`/bilattice family. This service's math content is confined to
`economy.mts`'s own tuned game-balance formulas (the rekindle power law
`⌊(maxDepth/8)^1.4 · echoMult⌋`, the geometric cost-curve scaling) — real arithmetic, but
house-authored game balance, not a citation to the owner's obstruction/bilattice research.

## 14. Ludics

- **Core loop.** Click (manual attack/descend/retreat) → idle (the generator cascade runs
  unattended) → automate (standing orders fold verbs into a Lisp clause) → rekindle (prestige) →
  strategize (the endgame: the strategy editor becomes the whole interface). The loop's final stage
  is genuinely distinct from a conventional idle game's "buy the next autobuyer" loop because the
  player is editing an executable program, not toggling a checkbox.
- **Skill expression.** Two axes: (1) resource-allocation timing in the early/mid game (when to buy
  which generator tier, per `economy.mts`'s cascade cost curves), and (2) program authorship in the
  endgame — writing a Lisp decision program that out-performs the composed default.
- **Session shape.** Unbounded — an idle game's cascade runs whether or not the player is present
  (`offlineAccrual`, capped at `OFFLINE_CAP_SECONDS = 8 * 3600`, extendable by the `long-watch` SKU).
- **Retention surfaces.**
  - *Offline accrual cap* — bounds how much a player can gain by staying away; a purchased boost
    extends it (`grantBoost`, kind `"offline"`).
  - *Fame depth* (`fameDepth`, never resets) — permanent progress tracking, currently surfaced only
    in `stateFrame` and `status()`'s text, not yet wired to a leaderboard (`ROADMAP.md`).
  - *Boosts* — bounded, time-limited rate multipliers, purchasable; never a flat power grant.
  - No streak mechanic, no daily-login bonus, no cosmetic collection layer exists in this service
    today.
- **Kind-design constraints enforced.** No wagering (no chance-scaled reward anywhere in
  `economy.mts`/`payments.mts`). Boosts are bounded by shape but that bound is not test-enforced
  against unlock-bypass (§11 item 2).
