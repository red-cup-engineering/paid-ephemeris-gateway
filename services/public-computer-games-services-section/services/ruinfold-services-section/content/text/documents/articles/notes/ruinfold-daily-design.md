---
title: Ruinfold Daily Design
description: "Specification for reframing Ruinfold from a browser MMORPG into a seeded-daily roguelike — one shared dungeon per UTC day, move-log replay as the anti-cheat foundation, the five-way bilattice death model as the run's signature risk/reward mechanic, integer scoring, and a leaderboard/week-boon/satoshi-payout reward loop gated on the family ZBD rails."
date-created: 2026-08-19
type: specification
authors:
  - claude-fable-5
---


Owner's reframe, verbatim: "Ruinfold is our Nethack/Roguelike, done up quasi-MMO: everyone plays
the same seeded dungeon within a 24h period; high scorer gets a satoshi payout, or a bonus to
their gear for the next week." That sentence changes what Ruinfold *is* more than it changes what
Ruinfold *has*. The prior plan (`content/text/triage/ruinfold-mmorpg-plan.md`) built a live,
persistent, many-players-in-one-world MMORPG. This spec keeps the engine that plan produced —
verified deterministic by source inspection, module by module — and puts a different game loop on
top of it: **daily-seed challenge roguelike**, the Spelunky Daily Challenge / Crypt of the
NecroDancer daily / DCSS tournament lineage, not the persistent-world lineage. Same keep, same
five-way death, same dead reckoning of state through an append-only trace. Different question:
not "who is online with me right now" but "who beat today's seed better than I did."

This document is a specification, not shipped code. It is grounded entirely in
`ruinfold-services-section/lib/legacy/2026-06-15-ruinfold` (read-only reference — engine, server,
client, and tests all present) and in the family's `zbd-micropayment-rails.md` payout
architecture (read at
`.../public-web-game-services-section/content/text/documents/articles/notes/zbd-micropayment-rails.md`,
present and current at time of writing). Where legacy code is quoted, it is quoted to show what
transfers unchanged; where it doesn't transfer, that's stated as a design decision, not silently
assumed.

## 0. What's inherited, in one paragraph

`lib/legacy/2026-06-15-ruinfold/engine/*.mjs` (28 modules) contains zero `Date.now()`/`Math.random()`
calls anywhere — confirmed by grep over every engine and server module. Every random-shaped
decision (AI targeting, world events, the five death outcomes) is a pure function of trace state
and tick number. `functional.mjs`'s `clock(tick, seq)` — a zero-padded `tick:NNNNNN/seq:NNNN`
string, compared with plain string `>` — is the entire ordering mechanism, and it is exactly the
primitive a daily-seed roguelike needs: **the log already sorts itself**, deterministically,
without a wall clock anywhere near the trace. This document treats that as the load-bearing fact
it is: the daily's anti-cheat is not a new subsystem bolted on, it's what happens when you point
an already-deterministic tick engine at a replay endpoint instead of a live session.

## 1. The daily: UTC date → seed → deterministic dungeon

### 1.1 Seed derivation

The **only** place a UTC date turns into a number is one pure function, at the server's impure
transport boundary (the same "one stateful/impure piece" split the ZBD doc documents for
`server.mts` — reading `new Date()` to learn what today's UTC date *is* is a legitimate boundary
read; it never happens inside the engine, the generator, or the tick):

```js
// server/dungeon.mjs — pure. Takes a date STRING, never reads the clock itself.
import { createHash } from "node:crypto";

export function dailySeed(dateUTC /* "YYYY-MM-DD" */) {
  const digest = createHash("sha256").update(`ruinfold-daily:${dateUTC}`).digest();
  return digest.readUInt32BE(0); // one deterministic 32-bit seed per calendar date, forever
}
```

`node:crypto` is Node stdlib, not an npm dependency — consistent with zero-external-deps. The only
`Date.now()` call in the entire system lives in the HTTP handler that decides "what UTC date is
`/daily/today`" — everything downstream of that string is a pure function, replayable years later
by anyone who knows the date string.

### 1.2 The generator is new work, not a port

Legacy `server/bin/seed.mjs` is **hand-authored**, not procedural: four fixed zones, fixed monster
placement, fixed loot. That's correct for an MMO's persistent world and wrong for a daily — a
daily needs a *family* of dungeons parameterized by one seed. `dungeon.mjs` is new, built from a
small seeded PRNG (mulberry32, ~6 lines, zero deps) that is used **only** inside the generator,
never inside `tick.mjs`/`ai.mjs`/`combat.mjs` — the boundary from the task's hard constraint holds
exactly at the seam between "build the world once" (seed.mjs's job, PRNG allowed) and "advance the
world" (tick.mjs's job, PRNG forbidden, and per the recon it already has none).

```js
// server/prng.mjs — mulberry32. Deterministic, zero deps, used ONLY by dungeon.mjs generation.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

`dungeon.mjs` uses this exactly the way `seed.mjs` uses hand-picked constants — it calls the same
`doing`/`declareConverse` seed-construction calls, in the same fixed authorial style, just with
the choices (floor count, monster roster per floor, archetype rolled per drop slot, boss identity)
driven by `next()` instead of a literal. The output is the same shape of `seed:NNNNNN`-clocked
EAVT trace the legacy world data already has (confirmed against the played instance at
`.../lib/legacy/2026-08-17-vps-561-group/_archive/.../ruinfold/world/`), so everything downstream
(snapshot, perception, tick) needs no changes to consume a generated world instead of a hand-built
one.

### 1.3 Floor chain shape

`the-gate` (hub, unscored, always identical — orientation, not depth) then a **linear** chain of
`floorCount = 4 + (seed-derived value in 0..3)` generated zones — 4 to 7 floors, matching legacy's
own zone count (4) as the floor. No branching for v0: `movement.mjs` does zero real geometry by
design (recon), and a linear chain is the honest roguelike-daily shape anyway — everyone's "same
dungeon" claim is strongest when there's exactly one route through it.

**Invariant the generator always holds, deliberately:** every daily's floor chain places at least
one monster of each of the five `death-rule`s — `mortal`, `undead`, `construct`, `cursed` — on a
floor before the last, and exactly one `named` boss on the final floor. This is a direct
preservation of what the recon flagged as notable about the played instance ("confirms all five
death-rules are live in seed data") — the signature mechanic must never be a coin-flip absence on
a bad-luck seed. The *positions* and the *species* filling each role are seed-derived; the
*presence* of all five is not.

### 1.4 Scored vs. practice — the design call this spec makes explicitly

The task specifies "one scored attempt per player per daily; unlimited unscored practice runs
clearly labeled" without saying whether practice can be run against *today's* seed. This spec
makes the deliberate call that it cannot, for a reason the genre already learned the hard way:

> **Practice seeds are yesterday's (and all earlier) daily seeds, never today's.** Today's seed
> gets exactly one attempt per player, full stop, and that attempt is automatically the scored
> one.

Rationale: if practice were allowed against today's seed, a player could rehearse the exact
layout dozens of times before "submitting the real one," which defeats the entire premise of
"everyone plays the same seeded dungeon" — the shared-seed fairness comes from nobody having
foreknowledge of the layout, and unlimited free retries on the live seed is foreknowledge by
another name. Reusing expired daily seeds as a permanent, ever-growing practice library is free
content reuse (every past daily becomes a labeled practice dungeon forever, "Practice:
2026-08-18's Ruinfold"), never touches the leaderboard, and is the same shape DCSS's tournament
and NetHack's devnull already use (practice on old seeds, one shot on the live one). Server-side
enforcement (not client-side, since the log-replay model means the client is never trusted
anyway): a per-`(actor, date)` lock file, `scored-attempts/<date>/<actor>.json`, written only on
the first **replay-verified, structurally valid** submission tagged `mode:"scored"` for that date;
every later submission from that actor for that date is rejected for scoring purposes (still
accepted and stored as a `practice` record if resubmitted with `mode:"practice"` against an
*earlier* date's seed — never against the locked date).

## 2. Runs as move-logs

### 2.1 The run object

A run is exactly "the seed plus the ordered intent log" — nothing else is trusted from the client.

```jsonc
{
  "schema": "ruinfold-run/1",
  "date": "2026-08-19",              // which daily
  "seed": "0x3f0a91c4",              // dailySeed(date) — redundant with date, included so a
                                      // stored run is self-describing without recomputing the hash
  "actor": "wanderer-w1vxpa",
  "mode": "scored",                  // "scored" | "practice" — see §1.4 for what gates "scored"
  "moves": [
    { "tick": 0,   "seq": 0, "intent": { "kind": "join",   "actor": "wanderer-w1vxpa" } },
    { "tick": 0,   "seq": 1, "intent": { "kind": "move",   "actor": "wanderer-w1vxpa", "dir": "n" } },
    { "tick": 4,   "seq": 0, "intent": { "kind": "attack", "actor": "wanderer-w1vxpa", "target": "goblin-2" } },
    { "tick": 812, "seq": 0, "intent": { "kind": "ability", "actor": "wanderer-w1vxpa", "ability": "second-wind", "target": null } }
  ],
  "endedAt": { "tick": 1847, "reason": "cleared" }, // "cleared" | "mortal-death" | "voided" | "tick-cap"
  "clientClaimedScore": 607          // ADVISORY ONLY. Never consulted by the scoring pass. Present
                                      // only so a UI can show "your client thought: 607" next to
                                      // "server says: 607" as a debugging/trust signal for the player.
}
```

`tick`/`seq` mirror `functional.mjs`'s own `clock(tick, seq)` exactly on purpose: the move-log's
ordering contract **is** the trace's ordering contract, not a parallel one invented for this
feature. `intent` is byte-identical to what `intents.mjs`'s `validate()` already accepts — the
move-log format adds nothing to the intent shape, it only adds the `tick`/`seq` envelope needed to
replay it through `runTick` one tick at a time, exactly as `tick.mjs` already expects
(`runTick(root, tick, intents, players)` takes "the intents for this tick" as an array — the
replayer's whole job is grouping `moves` by `tick` and calling that function in ascending order,
once per distinct tick value from 0 through `endedAt.tick`, including ticks with an empty
intent array so AI/regen/effects still advance).

### 2.2 The replay contract

```js
// server/replay.mjs — the ONLY function that turns a submitted log into a score.
export async function replayAndScore(root, dailyDate, log) {
  // 1. Structural validation FIRST, over the WHOLE log, before any tick runs.
  for (const m of log.moves) {
    if (validate(m.intent) === null) return { rejected: "malformed-intent" };
    if (m.intent.actor !== log.actor) return { rejected: "wrong-actor" };
  }
  assertStrictlyIncreasing(log.moves); // (tick, seq) pairs must be strictly increasing —
                                        // duplicate or out-of-order pairs violate the same
                                        // clock(tick, seq) contract functional.mjs's supersede
                                        // relies on; reject the whole log, don't best-effort sort it
  if (maxTick(log.moves) > RUN_TICK_CAP) return { rejected: "tick-cap-exceeded" };

  // 2. Rebuild the CANONICAL daily world fresh, server-side, from dailySeed(dailyDate) — never
  //    from anything the client sent. The client never runs the generator; it only ever renders
  //    what the server generated (see §6.1).
  const root2 = await buildDaily(dailyDate);

  // 3. Replay tick-by-tick, STOPPING at the first terminal condition regardless of how many
  //    moves the log claims afterward — a log with moves after a death is a bug or an attempt to
  //    keep playing past permadeath, and neither gets credit for ticks that didn't happen.
  const byTick = groupByTick(log.moves);
  for (let tick = 0; tick <= maxTick(log.moves); tick++) {
    await runTick(root2, tick, byTick.get(tick) ?? [], players);
    const outcome = terminalOutcomeOf(root2, log.actor, tick); // reads alive/status glyphs — §3.3
    if (outcome) return finalizeScore(root2, log.actor, tick, outcome);
  }
  return finalizeScore(root2, log.actor, maxTick(log.moves), { reason: "tick-cap" });
}
```

**Tolerance policy: none.** Concretely, what "any divergence rejects" means:

| condition | outcome |
|---|---|
| any single intent in the log fails `intents.mjs`'s `validate()` | **whole run rejected** — not truncated-and-kept, rejected outright. One malformed entry poisons the submission. |
| any intent's `actor` ≠ the authenticated submitter | **rejected** — can't play as, or on behalf of, another actor |
| `(tick, seq)` pairs not strictly increasing (duplicate or out-of-order) | **rejected** — this is the same ordering invariant `clock()`'s zero-padding exists to guarantee; a log that violates it isn't a valid trace, full stop |
| `tick` exceeds `RUN_TICK_CAP` (proposed: 6000) anywhere in the log | **rejected** — bounds replay cost; a legitimately long run ends naturally at the cap (see below), it doesn't submit moves past it |
| a well-formed intent that is *illegal in context* (attack out of range, move into a wall, equip an item you don't hold) | **not an error** — the engine already no-ops it (`strike()` returns `{hit:false}`, `equip()` on a missing item is a no-op). This is not "divergence," it's the same "impossible moves just don't do anything" behavior any turn-based roguelike server has always had. |
| replay reaches `RUN_TICK_CAP` without a terminal death/void/clear | **not rejected** — scored as-is, `endedAt.reason: "tick-cap"`, a legitimate (if capped) outcome, distinct from a structural rejection |
| replay reaches a terminal condition (mortal death, void hazard, floor-boss clear) | **not rejected** — this is a normal run ending, scored per §4 |

The distinction that matters: **structural** violations (malformed shape, wrong actor, broken
ordering, exceeding the hard cap) get the log thrown out entirely, no score, no leaderboard entry.
**In-fiction** failures (a swing that missed, a door that wasn't there) are just what the log
says happened, and the deterministic engine already handles them as no-ops — that's not tolerance,
that's correctness.

### 2.3 Determinism as a test, not a claim

`tests/prove-replay.mjs` (new, mirroring the legacy `prove-*.mjs` house style) is the concrete
proof obligation this spec imposes: build the same daily twice from the same date string, replay
the same move-log against both, assert the two final traces are byte-identical and the two
computed scores are equal — every run, no tolerance, exactly the property the whole anti-cheat
argument rests on.

## 3. Roguelike core for v0

### 3.1 Ported unchanged (per-module recon verdict: deterministic, no multiplayer entanglement)

| module | v0 role |
|---|---|
| `_world.mjs` | read vocabulary (`view`/`valOf`/`numOf`/`glyphOf`/`posOf`/`dist2`) — everything else sits on this |
| `functional.mjs` | `RUIN_FUNCTIONAL` set + `clock(tick,seq)` — the ordering mechanism itself |
| `movement.mjs` | scalar step-toward-goal / WASD nudge, clamped to zone bound |
| `combat.mjs` | `strike`/`attack` — the one shared damage primitive, armor-soak, attributed `slain` |
| `abilities.mjs` | heavy/cleave/bolt/second-wind, funnels through `combat.strike` |
| `items.mjs`, `archetypes.mjs`, `loot.mjs` | pickup/equip/drop, the 11-item catalogue, corpse drops |
| `effects.mjs` | poison/regen/stun/might/weaken as single functional expiry cells |
| `progression.mjs` | the xp curve — **but see §3.2: scoped to the run, not the account** |
| `death.mjs`, `zones.mjs` | the bilattice death router and zone/portal plumbing — see §3.3 |
| `intents.mjs` | the trust-boundary validator, minus the party/trade cases (§7) |
| `perception.mjs` | fog-of-war — reused **as the client's actual field of view**, not a multiplayer nicety (§6.2) |
| `stats.mjs` | level→stats recompute, single source of truth |

### 3.2 xp/level is per-run, not persistent

Legacy `progression.mjs`'s curve (`thresholdFor(level) = 5*(level-1)*level`) is a pure function —
ported verbatim. What changes: in the MMO, xp accumulates on a persistent character across
sessions forever. In the daily, **every run starts at xp 0** — the curve you climb during today's
attempt is entirely local to that attempt and discarded (except as a scoring input, §4) when the
run ends. This is the correct roguelike-permadeath framing (a NetHack character's experience
doesn't carry to the next game either) and it means the daily needs no persistent character-sheet
storage at all between days — only the per-day run log needs to survive.

### 3.3 The five-way bilattice death model, in run terms

Quoted from the plan doc for the underlying mechanism (unchanged):

> Each entity carries a data predicate `death-rule` (set at seed). On `slain`, the engine routes
> the entity's `alive`/`form` cells to a different bilattice value per death kind — death is not
> one rule, it is five.

For a single-player daily, the five outcomes split cleanly by **which entity the rule fires on** —
the player, or a monster the player kills — and this spec assigns each a distinct in-run meaning
rather than forcing all five onto "what happens when you die":

| `death-rule` | fires on | run-terms meaning |
|---|---|---|
| **mortal** (player, default) | the player | **RUN ENDS.** `alive`→f exactly as legacy's player branch already does (no corpse; `status`→`ghost`, `form`→`ghost`, `health`→0). Score locks at this tick. The client transitions to **ghost-spectator**: reusing the existing "you are a ghost" render state, the player can now watch *replays of other submitted runs from today's leaderboard*, ghosting through the same seed's dungeon as a spectral overlay, instead of continuing to play. Permadeath is real; the ghost state that legacy built for shrine-walking gets repurposed as the spectate-mode signal. |
| **undead** (player, via a one-time relic — new mechanic) | the player, once, if they are carrying the "Heart of the Hollow" relic (a rare floor drop) at the moment a mortal death would otherwise trigger | **RUN CONTINUES, at a price.** This is `death.mjs`'s existing undead branch (`alive-revives++`, heal, `status`→`risen`) retargeted at the player instead of a skeleton: instead of ending, the player rises at 50% max health, the relic is consumed (once per run, never twice), an `effect-weaken` is applied for the remainder of the run, and a **flat −150 style-score penalty** (§4) is locked in permanently. The bilattice contradiction (alive AND slain) is literally the game mechanic: you cheated the ending, and the run's own scoring remembers it. A second mortal death after the relic is spent is final, per the row above. |
| **construct** (environmental, not combat) | the player, on a rare seed-placed void hazard (a chasm tile / an unstable floor / a wraith's void bolt — flavor for the existing `⊥` retract-both-faces branch) | **RUN VOIDED.** `death.mjs`'s existing construct branch (retract both `alive` and `slain` → the cell settles to `⊥`, "un-made," no corpse) maps onto "this attempt un-happened": the run is **not scored at all** — not a locked bad score, no leaderboard row, `endedAt.reason: "voided"`. The attempt is still consumed (§1.4's one-scored-attempt rule; a free do-over would turn every hazard into a non-event), so a void tile is a genuine, distinct risk from ordinary death — the sting of ⊥ ("returns to mystery") given real stakes rather than being a curiosity. |
| **named**/boss | a monster the player kills | Unchanged from legacy: true, settled `f` death. The final-floor boss dying is what makes `endedAt.reason: "cleared"` possible — see §4's `CLEAR_BONUS` and the `SWIFT` style bonus, both gated on actually killing the boss, not merely surviving to the last tick. |
| **cursed** | a monster the player kills (the moon-stalker-analog on some floor) | Not a death outcome for the player at all — mirrors legacy's own semantics exactly: killing a cursed-tagged monster curses the *killer*. The player's `human` cell settles to `⊤` (human AND beast) permanently for the rest of the run via `declareConverse`, exactly as `death.mjs`'s `curse()` already does. This unlocks a beast-form toggle for the remainder of the run (a build-variety knob, not scored directly beyond the one-time `LYCANTHROPE` style bonus, §4) and renders as a distinct aura in the client (§6.2) — the "bilattice charge shown as aura" the client spec asks for, quite literally: `formGlyph` is already `⊤` in `snapshot.mjs`'s existing output. |

## 4. Scoring

All-integer, by construction: every input field (`xp-value`, `archetype.value`, `gold`, tick
counts, floor indices) is already an integer in the ported data model — no floating point appears
anywhere in the formula.

```
depthScore    = 100 × maxFloorReached                         (maxFloorReached: 0..floorCount)
              + 500  if endedAt.reason === "cleared"           (CLEAR_BONUS — full-dungeon bonus)

killScore     = Σ xp-value, over every monster whose `slain` row is attributed to this player
                (reuses combat.strike's existing agent-attribution — no new tracking needed)

treasureScore = goldHeld-at-end
              + Σ archetype.value, over every item held or equipped at run end
                (final state, not "ever picked up" — carrying loot OUT is what counts)

styleScore    = 40   × floorsFlawless    (a floor exited with zero health lost while on it)
              + 75   if LYCANTHROPE ever triggered (player's `human` glyph observed === "⊤")
              − 150  if RISEN ever triggered (the undead-relic continuation, §3.3)
              + floor(200 × (RUN_TICK_CAP − endTick) / RUN_TICK_CAP)   only if endedAt.reason === "cleared"
                (SWIFT — speed measured in TICKS, the engine's own deterministic clock, never
                wall-clock time; see the callout below for why this matters)

totalScore    = max(0, depthScore + killScore + treasureScore + styleScore)
```

A **voided** run (§3.3) has no `totalScore` at all — `null`, not `0` — and does not appear on the
leaderboard.

**Why speed is scored in ticks, never wall-clock milliseconds:** this is the one place a naive
"reward fast play" design would reach for `Date.now()`, and it's exactly the thing the task's hard
constraint forbids inside game logic. `tick` is already the engine's own deterministic counter —
scoring "ticks-to-clear" instead of "seconds-to-clear" means the SWIFT bonus is itself a pure
function of the replayed trace, computable identically on any machine, at any time, from the log
alone. A wall-clock speed bonus would also be a straightforward exploit surface (submit a
low-tick-count log with a forged fast timestamp) that a tick-count bonus simply doesn't have,
since the tick count *is* the number of `runTick` calls the replay actually performed.

### Worked example (grounded in real legacy data values)

A run that reaches floor 3 of a 6-floor daily, is killed there (does not clear), having slain 2
skeletons (12 xp each), 1 goblin (8 xp), 1 wraith (18 xp), holding an iron blade (value 30) and a
leather jerkin (value 25) plus 47 gold, having triggered the lycanthrope curse once and cleared 2
of its 3 floors flawlessly:

```
depthScore    = 100 × 3                          = 300
killScore     = 12 + 12 + 8 + 18                  = 50
treasureScore = 47 + 30 + 25                      = 102
styleScore    = 40×2 + 75                         = 155
totalScore    = max(0, 300 + 50 + 102 + 155)      = 607
```

(No `CLEAR_BONUS`/`SWIFT` — this run didn't clear. `RISEN` didn't trigger. All five death-rules
still touched this hypothetical run's trace — the goblin/skeleton/wraith kills and the
lycanthrope curse — without any of them being the player's own ending.)

## 5. Rewards

### 5.1 Leaderboard

One leaderboard per UTC date, `mode:"scored"` runs only, `totalScore` descending. Deterministic
tiebreak (ranking must never be ambiguous):

1. higher `totalScore`
2. lower `endedAt.tick` (faster clear, by the engine's own clock — same non-wall-clock principle
   as SWIFT)
3. earlier server-received submission time (this tiebreak level *is* allowed to read a real
   timestamp — it's session/bookkeeping metadata at the impure server boundary, exactly the "one
   stateful/impure piece" pattern the ZBD doc already uses for `server.mts`, not game logic, and
   it only ever matters after (1) and (2) are already equal)

### 5.2 Week-boons — cosmetic-forward, capped mechanical edge

Weekly window: UTC Monday–Sunday (ISO week). `weeklyScore(player) = Σ that player's scored daily
totalScores across the week's 7 dates` (a missed day contributes 0, not a penalty — this rewards
consistency without punishing a missed day beyond the lost opportunity). At week close, the top 3
by `weeklyScore` each receive a **named** boon, auto-equipped for every daily in the *following*
week only:

| rank | boon | mechanical edge | grounding for "small" |
|---|---|---|---|
| 1 | Ashfall Coronet | +1 armor | armor items in the existing catalogue grant 2–5 (`ARCHETYPES`) — this is sub-tier |
| 2 | Cinderveil Cloak | +5 max health | `statsForLevel` grants +8 maxHealth *per level* — this is well under one level's worth |
| 3 | Rootbound Charm | +1 attack-power | `statsForLevel` grants +2 attack-power per level — same, half a level |

Cosmetic-forward: each boon also tints the wearer's aura/glyph rendering in the client (§6.2) and
their leaderboard row, so it reads as a visible "last week's champion" tell even before the
mechanical edge is noticed. **Cap rule:** exactly one boon slot; it never stacks with a prior
week's boon, and not requalifying next week simply means no boon is equipped — there is no
accumulation path.

### 5.3 Satoshi payouts — gated on the family ZBD rails, hook only

`zbd-micropayment-rails.md` exists and is current (read in full for this spec). Two load-bearing
facts from it, carried forward rather than re-derived:

- **Ruinfold is not yet in that doc's §11 Family Adoption Map.** Onestone, solitaire, and
  (explicitly, deliberately) *not yet* flickering-delve are the only games addressed. This spec
  flags that as an open item for whoever maintains that doc — ruinfold's proof-of-play story (§2's
  replay contract) is structurally the same free-rider pattern §6 of that doc describes for
  onestone/solitaire ("a claimed outcome is either reproducible from a legal log or it's rejected,
  no client assertion trusted"), so ruinfold is a clean fourth candidate, not a special case — but
  this document does not add itself to that doc's table, since that file is outside this app's
  write scope.
- **The payout-curve shape in that doc's §5 (`reward(n) = base · n^-0.3`, decaying per accrual
  unit in a rolling window) does not fit a daily-winner prize and should not be reused as-is.**
  That curve exists to make *volume* botting unprofitable for a game where a player can attempt
  many scored sessions per day. Ruinfold's daily structurally cannot have that abuse shape: §1.4's
  one-scored-attempt-per-player-per-day rule means a player can win at most once per day by
  construction, before any rate-limiting policy even runs. The curve's whole job is already done
  by the daily's own rules.

Given that, the proposed hook (not implemented, pending that doc's own open items — fee schedule,
withdrawal tiers, webhook signing, per §12 of that doc):

- **Proof-of-play**: the replay-verified run log itself (§2), the same free-rider pattern as
  onestone/solitaire — no new anti-abuse subsystem, no Quago-equivalent vendor, consistent with
  that doc's §6 house-doctrine stance.
- **Accrual unit**: one flat accrual event per UTC day, to the `#1` ranked `mode:"scored"` actor
  on that day's leaderboard (or split across a top-3 pool — an open tuning choice, not resolved
  here) — reusing that doc's exact §4b ledger shape:

  ```
  2026-08-19 * reward accrual: ruinfold daily #1 (actor wanderer-w1vxpa)  ; ref:accrue-ruinfold-20260819
      income:ads                       0.XXXX USD
      liabilities:rewards:wanderer-w1vxpa  -0.XXXX USD
  ```

  gated, in order, by that doc's existing `reward-policy.mts` chain: country allow-list → the
  `income:ads`-balance ceiling check (§4 of that doc) → per-account/per-IP rate caps (redundant
  with, not replacing, §1.4's one-attempt rule — defense in depth against Sybil multi-accounting,
  which the one-attempt rule alone does *not* stop) → `ledger.record()`.
- **A day with zero eligible `scored` submissions pays out nothing that day** — it does not roll
  forward into a bigger next-day prize. An escalating rollover jackpot is explicitly declined here
  because it reintroduces exactly the "chance-scaled payout" shape that doc's §10 rules out —
  quoted directly: **"No wagering, ever, regardless of jurisdiction legality... reward amount
  tracks verified ad revenue share of verified play, never a lucky outcome."** A rollover jackpot
  makes *when you happen to play* matter more than *how well you play*, which is the wrong shape
  for a skill leaderboard prize to have.
- **Earn-only, no entry fees, ever** — restated as the hard line it is. The daily is free to
  attempt and free to submit; nothing about winning costs anything, and nothing about losing costs
  anything either. There is no wager, no stake, no pool funded by other players' entries — the
  entire prize, if and when this hook is built, is funded out of the ad-revenue accrual pool per
  that doc's `income:ads` invariant, identically to how every other game's rewards would be
  funded. This is the one point in this document that is not a design choice open to revision —
  it's the family's existing hard constraint, carried forward unchanged.

## 6. Client v0: browser Canvas TILE presentation

### 6.1 Two-tier architecture: responsive live-play, authoritative replay-scoring

Live play reuses the legacy server's session machinery (`server/loop.mjs`/`http.mjs`/`sse.mjs`)
close to as-is: a player's client sends intents to a live per-session tick loop and gets immediate
feedback, exactly like the MMO server already does — this is what makes the game feel responsive
to play. But **the live session's state is never what gets scored.** At run end (or periodically,
for resilience against a dropped connection), the client's accumulated move-log — every intent it
sent, in order, with the tick it was sent at — is what actually gets submitted to `replayAndScore`
(§2.2), which rebuilds the daily from scratch server-side and replays the log independently. The
live session is the *experience*; the replay is the *proof*. This cleanly satisfies "the server
accepts a log and REPLAYS it against the engine to verify score" without discarding the legacy
server's already-working live-play code.

The client **never runs the dungeon generator itself** — it requests the generated daily from the
server (a `snapshot.mjs`-shaped read, unchanged) and renders what it's told, the same
server-authoritative-state / client-renders-only split the legacy 3D client already uses.

### 6.2 Rendering: ASCII-tile aesthetic, glyphs + color, bilattice charge as aura

The render loop is a grid of glyph tiles, one cell per world position (v0 needs no continuous
positioning — the roguelike-native presentation is a better fit for the underlying scalar
`pos-x`/`pos-z` model than the legacy three.js client's continuous movement is). `renderType`
already exists in `snapshot.mjs` and needs no change: monsters render by `death-rule`
(`mortal`/`undead`/`construct`/`cursed`/`named`), so the glyph table is a direct lookup, not new
logic:

| entity | glyph | base color | **aura** (driven directly by `glyphOf`, unchanged from `_world.mjs`) |
|---|---|---|---|
| player | `@` | white | ring color/pulse keyed to `aliveGlyph`: `t` → none, `⊤` (risen, §3.3) → pulsing gold ring, `⊤` on `formGlyph` (cursed, §3.3) → a second, distinct violet ring |
| mortal monster (goblin) | `g` | green | none (plain `t` while alive; monster disappears on `f`) |
| undead monster (skeleton) | `s` | pale grey | pulsing gold ring while `aliveGlyph === "⊤"` — the exact "held contradiction" tell |
| construct (wraith) | `w` | translucent blue | a flicker/fade-out animation at the tick it settles to `⊥` (vanish), then the tile is simply empty — no corpse, matching the fiction |
| cursed (moon-stalker) | `M` | deep violet | none special (its own death is what curses the *player*, not itself) |
| named boss | `K` | gold | none while alive; a settled `f` (dead) renders as a corpse glyph, once, then the loot drop |
| item | archetype-specific glyph (`)`/weapon, `[`/armor, `=`/trinket, `*`/trash), tinted by `rarity` (junk grey → common white → uncommon blue → rare gold) | — |

This is `glyphOf()` from `_world.mjs` used **as the render driver**, not merely as an internal
engine detail — the recon's observation that `snapshot.mjs` already ships `aliveGlyph`/`formGlyph`
in every actor snapshot means the client needs zero new server-side plumbing to show the bilattice
charge; it only needs a glyph→aura lookup table.

**Field of view = `perception.mjs`, reused as the actual game mechanic it always structurally
was.** Legacy built `canSee()`/`SIGHT`/`DEATH_SIGHT` as multiplayer fog-of-war ("what does *this*
connected player currently know"); in a single-player daily it's simply the roguelike's field of
view, unchanged code, reframed purpose. The existing "a risen `⊤` undead is only visible within
`DEATH_SIGHT` unless you're attuned to `slain`" rule becomes a genuine roguelike detect-undead
mechanic for free — a natural, already-built hook for a future relic ("this charm attunes your
Umwelt to `slain`") without writing a new perception system.

### 6.3 Controls

Keyboard-first: WASD/arrow keys → `{kind:"move", dir}` (unchanged intent shape); number keys
1–4 → `{kind:"ability", ability}` for the four abilities; Space/Enter → `{kind:"attack", target}`
against the nearest hostile in range (a client-side target-selection convenience — the intent it
emits is still the exact same validated shape). Touch d-pad overlay (rendered only when
touch-capable) emits the identical `move{dir}` intents — no new intent kinds anywhere, `intents.mjs`
stays the single trust boundary regardless of input device.

### 6.4 Explicitly deferred: the 3D client

Legacy's three.js client remains a **later skin over the same intent log** — per the task, not v0.
Nothing in this document's engine/replay/scoring design is 3D-client-specific; a later 3D skin
consumes the identical `snapshot.mjs` contract the tile client does.

## 7. Out of scope for v0 (later)

| system | why deferred |
|---|---|
| `party.mjs` | multiplayer-only; a solo daily run has no party to form |
| `playertrade.mjs` | multiplayer-only; no other live player to trade with in a solo run |
| `vendor.mjs` (buy/sell economy) | not cut for a technical reason — it's just orthogonal to a single-life daily; revisit if a "shop floor" becomes part of the roguelike loop later |
| `crafting.mjs` | same — data-table recipes are fine, just not v0 scope |
| `quests.mjs` (NPC bounty system) | beyond what the task lists, cut here too: it assumes a stable, persistent NPC to return to, which a procedurally-regenerated daily doesn't naturally have. Could return as a per-floor generated mini-objective later, but that's new design, not a port. |
| `skills.mjs` (skill-by-use leveling) | pulls in an extra external workspace package (`@561-group/fizzos/practicing`) beyond `@561-group/tab` per the recon; not worth the added dependency surface for v0's scope. Revisit either by confirming that package's availability or reimplementing its small evidence-counting scheme locally. |
| `threat.mjs`'s multiplayer half (tanking) | collapses to "the monster targets the one player in the zone" for solo play; `ai.mjs`'s nearest-in-aggro logic already works without threat, per the recon |
| `ludics.mjs` | inert/unwired even in the legacy build (zero importers besides its own self-test) — can be ported wholesale later with zero risk as a "structured non-combat contest" primitive (a duel/haggle/debate encounter type), or left out with zero loss; not needed for v0's combat-and-death loop |
| non-linear/branching floor layouts | v0 is a single linear chain per §1.3; branching is a real future improvement, not a cut for lack of value |
| the three.js 3D client | explicitly a later skin per the task — see §6.4 |

## 8. Module tree (proposed, for whoever implements this spec)

```
apps/ruinfold/
  engine/                # ported near-verbatim from lib/legacy/2026-06-15-ruinfold/engine
    _world.mjs  functional.mjs  movement.mjs  combat.mjs  abilities.mjs
    items.mjs  archetypes.mjs  loot.mjs  effects.mjs  progression.mjs
    death.mjs  zones.mjs  ai.mjs  intents.mjs  stats.mjs  perception.mjs  tick.mjs
  server/
    prng.mjs              # NEW — mulberry32, generation-only (§1.2)
    dungeon.mjs            # NEW — dailySeed(date), buildDaily(root, date) (§1.1–1.3)
    replay.mjs             # NEW — replayAndScore(), the authoritative scoring pass (§2.2)
    scoring.mjs            # NEW — the pure formula from §4
    leaderboard.mjs         # NEW — per-date ranking + tiebreak + weekly aggregation (§5.1–5.2)
    reward-hook.mjs          # NEW — the interface stub described in §5.3, unimplemented pending
                              #       the ZBD doc's own open gaps
    loop.mjs  http.mjs  sse.mjs   # adapted from legacy for live-session responsive play (§6.1)
  tests/
    prove-replay.mjs         # NEW — determinism proof (§2.3)
    prove-dungeon.mjs         # NEW — same date → byte-identical generated world, every time
    prove-scoring.mjs          # NEW — the §4 formula against fixed fixtures
    prove-death-run-outcomes.mjs # NEW — the five-way table from §3.3, each outcome exercised
    prove-combat.mjs  prove-abilities.mjs  # ported/adapted from legacy, same assertions
  client/                   # v0 canvas tile renderer, keyboard + touch d-pad input (§6)
```

## 9. Open gaps carried forward, not resolved here

1. Whether the daily prize (§5.3) splits across a top-3 pool or goes entirely to `#1` — an open
   tuning choice deferred to whoever sets the actual sats amount once the ZBD doc's own §12 gaps
   (fee schedule, withdrawal tiers) are closed.
2. Whether `apps/ruinfold` gets added to `zbd-micropayment-rails.md`'s §11 Family Adoption Map is
   a decision for that document's owner, not this one — flagged in §5.3, not resolved here.
3. Floor count range (4–7, §1.3) and the relic/hazard placement rates (§3.3) are illustrative
   starting numbers, not final balance — same posture the legacy `perception.mjs` already takes
   toward its own `SIGHT`/`DEATH_SIGHT` constants.
4. `skills.mjs`'s external dependency (§7) needs a decision before any future v1 that wants
   skill-by-use progression: confirm `@561-group/fizzos` availability, or reimplement locally.
