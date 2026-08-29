---
title: Okaga Game Design
description: "Design specification for the Okaga commission — quality-based-narrative storylets meet Discworld MUD presence meet EVE industry, wired to light-lag as the shard boundary and to channeling as a reach-not-power premium currency, with an honest single-system v1 cut."
date: 2026-08-19
keywords: ["okaga", "game-design", "qbn", "mud", "eve", "light-lag", "cartridge", "energy-bank", "fizzos"]
---

# Okaga Game Design

> "Picture quality narrative meets Discworld MUD meets EVE." As hard scifi as it can be, with
> exactly one conceit: some people can channel energy from outside the dimensions of this world
> to do warp travel and other forms of accelerating the arrow of time. Ships otherwise reach only
> ~0.2c. A galactic confederacy. A few billion players shouldn't skew galactic economics.
> — the commission, owner, 2026-08-19

This document designs the game. It does not re-derive the setting or re-argue the system fit —
those are done, and cited by section number throughout: `2026-08-19-note-on-okaga-worldbook.md`
(physics, the one conceit priced, the gazetteer) and
`2026-08-19-note-on-okaga-substrate-fit.md` (which house system carries which commission pillar,
and what's real versus proposed in each). This document's own job is the part neither of those
did: turn the setting and the fit-read into a tick schedule, a storylet schema, a cast, a content
pipeline, and a v1 that could actually be built next — small enough to be honest, large enough to
prove all three of the Triple at once.

**Canon-tag legend, inherited unchanged from the worldbook §0**: **OWNER CANON** (said, in-repo,
about Okaga specifically), **OWNER-KEPT** (2023 tone material, not load-bearing), **HOUSE
SUBSTRATE** (a real system pointed at Okaga), **NEW CANON PROPOSED** (this document's own
invention). Nothing below contradicts an OWNER CANON sentence from the worldbook's §0 list. Where
this document invents game-design specifics beyond what the worldbook already priced — exact
tick ratios, a settlement's name, a cast roster — those inventions are tagged **NEW CANON
PROPOSED** or **NEW DESIGN PROPOSED** (a design choice with no fictional-truth claim attached,
freely revisable without touching canon) as they occur.

---

## 1. The Triple, wired precisely

The commission names three genres. Each one already has a real house carrier — the
substrate-fit-brief found them (§1–§2) — but "a carrier exists" and "the three carriers compose
into one playable loop" are different claims. This section makes the second claim, concretely.

### 1.1 Quality-based narrative — storylets on the farstone-qbn chassis, Rimworld-textured

`farstone-qbn-design.md` §1a proved the mechanism this game needs, in committed code, not as a
metaphor: a quality is a settled EAVT cell (current fizzos: `world.mjs`'s assertion trace plus
`predication.mjs`'s functional-predicate machinery), and a storylet is a situation the bilattice
join makes visible without anyone authoring an `if`-branch — Permit #23 aging into a contested ⊤
state because `within-window` was declared to have the converse `overdue`, once, is the whole
mechanism. That note's §4 also sorted every quality the corpus actually tracks into six families
(append-only trained stat, decaying need, derived-not-stored, contested/⊤-legal, relational,
world-clock-derived). Okaga's qualities are read off that same union, not invented fresh:

| family | Okaga instance |
|---|---|
| decaying need | Apotei Orchard's blight-progression cell; a settler's `need:hunger`/`need:rest` under a REQ shortage (OWNER CANON texture, worldbook §5.1) |
| contested/⊤-legal | the signalling array's `within-window` maintenance predicate × its declared converse `overdue` — the direct Okaga transplant of Permit #23, see §10 |
| world-clock-derived | today's array phasing-coil calibration state, the Orchard's irrigation cycle, whatever stands in for tide/weather at Buinga Station (all pure functions of `world-clock.mjs`'s `phaseAt`/`seasonAt`/`weatherAt`, recomputed each settle, never stored) |
| append-only trained stat | a settler's skill-by-use record (`skills.mjs`), a channeler's cumulative χ drawn (relevant only once §3's premium currency exists) |
| derived-not-stored | a channeler's apparent Toll-age (worldbook §2.5) — **must** be this family, not a hand-authored number; see §11's risk note |
| relational | `reputation.mjs`'s `standing(actor, faction)` — a settler's standing with the North Sanazi Confederacy or an unnamed rival Union |

**Rimworld texture is the local storylet's whole register**, and it is already the register of
"The Okaga"'s own draft scenes (worldbook §5.1, quoting Dapu's Scene 3 blight and Skah's Scene 2
seed-envelope requisition directly). A storylet in this game is never "the Confederacy declares
war" — it is "the irrigation line to the east terrace is down and there are eleven seed envelopes
left in the box," gated on and modifying exactly the qualities in the table above. This is the
correct scale match: §5.1 of the worldbook already argues Frontier/Established-Colony content
should almost never involve the Patrol or the Counting House arriving in time to matter — the
local cast solves it or doesn't, before help is even in transit. Storylet authoring inherits that
discipline directly: **no storylet at settlement scale is permitted to resolve on an off-screen
institution's timely intervention.**

### 1.2 Discworld MUD — presence, rooms, talk, the cast as real inhabitants

Presence is rooms: the gazetteer's places (worldbook §6.1 — Apotei Orchard, Buinga Station) are
fizzos locations exactly the way `farstone-qbn-design.md` §3 proposes reading a pyfars `place`
record as a room — the compiler's job (§7 below) generalizes the same way. Talk and social state
ride `social.mjs`/`communicating.mjs`; local governance and standing ride `progression.mjs`'s
law/support/enact primitives (a real fit for the North Sanazi Confederacy's Union structure,
worldbook §6.2) and `reputation.mjs`'s standing ledger.

**The cast is the load-bearing half of this pillar**, and it is not aspirational plumbing — it is
a structural fact `farstone-qbn-design.md` §7 already established: a Farstone NPC record (an
`intends` cell mapping perceived state to action) is *already*, in shape, indistinguishable from
an agent player's own decision loop, and `the-suite-and-the-studio.md` §2 names exactly this
pattern as the house's differentiator (*"named recurring agent players who actually play, by the
same intent-log API as humans... peers-not-pets is already the architecture"*). Concretely for
Okaga: a cast member playing a Union delegate, a Counting House clerk, or a loom operator submits
the identical `Intent` shape (`@561-group/cartridge/intent-log`) a human player's client would —
`move`, `talk`, `trade`, `propose-law` — validated at the same trust boundary, with no privileged
NPC-only API. §6 below names a starting roster.

### 1.3 EVE — industry, trade, contracts across light-lag; the wallet

The market half already exists, twice over, and the substrate-fit-brief only cited one of the two
carriers. It found `@561-group/energy-bank`'s `transfer`/`createPool`/`sellEnergy` (§1) as the
player-to-player economic primitive. What it did not have occasion to cite — a fresh read for this
document — is that **the current fizzos ships its own `market.mjs`, `crafting.mjs`, and
`progression.mjs`** (verified directly: `src/market.mjs` defines `initializeMarket` over
per-ware `price`/`base-price`/`stock` functional cells; `src/crafting.mjs` defines recipe-shaped
input→output transformation; `src/progression.mjs` carries a propose/support/enact law cycle).
This means Okaga's *local* Rimworld economy — the Orchard's requisition manifest, a REQ line's
price drifting with stock, a settler crafting a repaired irrigation part from scavenged parts —
already has a native, in-engine home, distinct from and complementary to the *player-to-player*
economy `energy-bank` carries. The design split: **`fizzos market.mjs` prices the settlement's
own goods against itself (the local Rimworld shop); `energy-bank` moves `ENERGY` between real
identities (the EVE-shaped player market, trades, pooled ventures, contracts)** — two real
systems, cleanly separated by who's on each side of the transaction, neither needing to be built
from scratch.

**Contracts across light-lag** are where EVE's texture actually shows up as a mechanic, not a
vibe: a contract posted at one settlement is not visible or executable anywhere else until the
light-lag delay (§2) has actually elapsed — this is the concrete form of "the market crash arrives
years later as history" applied to an active player market rather than passive news. **The
wallet is `energy-bank`'s ledger, and the earn-only discipline is restated as a hard line, not a
suggestion**: quoted directly from its own README, *"there is no random-outcome, stake-at-risk, or
house-edge mechanic anywhere in it... this posture is a property of every module in this package,
not a flag one can turn off."* Okaga inherits that posture unmodified for its `ENERGY` account;
§3 below is the whole design argument for why the one conceit's separate `chron` currency does not
get to relax it.

---

## 2. Light-lag as architecture

### 2.1 Spacelike separation is the shard boundary, not an authored zone map

The substrate-fit-brief's key finding (§3–§4) is the load-bearing fact this whole section builds
on. Restated in one sentence, because everything below is an application of it:
**two regions of the setting that have not yet exchanged a lightspeed signal or a warp-capable
ship are, by the commission's own stated physics, provably non-interfering** — not by a
server-assignment decision, by the same Lorentzian causal structure `shrimp-ecology-brief-v2.md`
§1 proved things about, applied to a setting where it is the literal physics rather than an
imposed design choice. Two systems in that relationship do not need to reconcile state with each
other at all — not eventually, structurally never, until a signal or a ship actually connects
their light cones. **This is the shard model, and it costs nothing to implement beyond getting
the delivery-tick math right (§2.2)**, because the causal partition is already free, supplied by
distance itself.

### 2.2 A formula for "propagates at c," made precise

Everything in this section reduces to one function, computed once the moment an event is
authored, never touched again:

```
delivery_tick(event, distance_ly, carriage) =
    origin_tick + ceil(distance_ly * ticks_per_ly(carriage))
```

Two values of `ticks_per_ly`, both anchored to worldbook §1.1's real numbers, using this
document's own tick skin (§2.3): a **signal** (news, a price quote, a Counting House rate change —
nothing physical moves) travels at c; a **carriage** (a ship, its cargo, a traveler, an unSkipped
crew member) travels at whatever velocity the sail (plus any Push, worldbook §2.3) actually
achieves, always strictly slower than c:

```
ticks_per_ly(c)      = 8,766     (one light-year at c, in this document's tick unit)
ticks_per_ly(0.2c)   = 43,830    (= 8,766 / 0.2 — unaided sail, the setting's floor)
ticks_per_ly(v)      = 8,766 / (v / c), for any Push-boosted v up to worldbook §2.3's 0.6–0.9c ceiling
```

Checked against the worldbook's own headline claim: at the standard 2 ly corridor spacing
(worldbook §1.2), a signal takes 17,532 ticks ≈ **2.00 years**, an unaided ship takes 87,660 ticks
≈ **10.00 years** — a 5:1 ratio, exactly what worldbook §1.3 states independently (*"a ship...
takes roughly five times that long"*). The formula reproduces the setting's own arithmetic rather
than inventing new numbers, and it generalizes Push cleanly: a Pushed ship's `ticks_per_ly` falls
between the signal rate and the unaided-sail rate, approaching but — by construction, since
`v < c` always — never reaching it. **This is the mathematical form of "channeling buys reach, not
power" (§3.1): the formula's floor is c, and no purchase, of any kind, is permitted to move that
floor.**

### 2.3 The tick unit, and why it was chosen rather than invented

Current fizzos's own `world-clock.mjs` already fixes a day at `PHASE_LENGTH * 4 = 24` ticks (dawn/
day/dusk/night, six ticks each) and a season at 720 ticks — real, verified constants, not this
document's invention. Nothing in that module names a tick as an hour; this document proposes,
as a **NEW DESIGN PROPOSED** skinning choice, reading **one tick as one in-fiction hour** — the
lowest-friction reading of an already-24-ticks-per-day engine, not a new ratio bolted on. Every
number in §2.2 depends on this choice and would rescale cleanly if a future build picks a
different one; nothing about the shard model itself depends on which skin is chosen, only the
concrete tick counts do.

Under this skin, fizzos's own proven capability is directly checkable against what the game
needs: `content/verification-report.md` records *"two identical 26,880-tick autonomous runs
replayed exactly"* — 26,880 ÷ 24 = **1,120 days ≈ 3.07 years** of settlement time, already proven
deterministic and exactly replayable, untended, today. It does not, by itself, cover a full 10-year corridor hop (87,660 ticks, about 3.3×
the proven horizon) — a real, honestly-flagged gap, addressed in §9's smallest-step and §11's
risk list, not papered over here.

### 2.4 Two clocks, and the reason a years-long voyage never asks anyone to wait years

This is the actual mechanism that makes "a persistent world where travel takes in-world years" a
**daily** game rather than a subscription nobody could survive, and it rests on a distinction
already proven in the corpus rather than invented for Okaga: `farstone-qbn-design.md` §2
separates **daily seed → which situations are live** (shared, content-deterministic) from
**action budget → a per-player quality** (personal, session-paced) as two orthogonal axes on the
same engine. Okaga needs the identical separation at a larger scale:

- **The settlement's world-clock** advances by exactly 24 ticks per real UTC day the settlement
  is being actively played — precisely `ruinfold-daily-design.md` §1.1's `dailySeed(dateUTC)`
  pattern, reused unmodified: one seed, one shared docket (today's blight-progression tick,
  today's array-calibration state, today's REQ manifest), everyone who logs in that day sees the
  same one. This is what §5's daily ritual runs on, and it is the only clock a settlement-only
  player ever has to think about.
- **A voyage is a scheduled event, not a walked simulation.** Booking passage at `origin_tick`
  computes `delivery_tick` once, via §2.2's formula, and the character is simply *elsewhere* until
  the world-clock (advancing at its own ordinary 24-ticks-per-played-day pace, or faster if a
  future build adds background/idle advancement — an unproven capability, flagged, not assumed,
  in §11) reaches that tick. **Nobody, including the server, "lives through" the intervening
  87,660 ticks in real time to make this true** — this is the entire point of a deterministic
  engine: `@561-group/cartridge`'s `defaultReplay` already computes final state from `(seed,
  intent-log)` in one pass regardless of how many ticks separate the two endpoints (`cartridge`
  README: *"given only `createEngine` + `applyIntent`, it rebuilds final state from a seed and an
  intent list"*) — advancing 87,660 ticks is not a different kind of operation from advancing 24,
  only a bigger one, and computing it does not require anyone to have waited through it.

The player experience this produces: booking a corridor hop is a real, weighed decision (your
character is off the settlement's active roster — talked-to by the cast, not by you — for
whatever in-fiction years the hop costs) but never a real-world waiting-room. A player returns
whenever they next log in after `delivery_tick` has passed and finds their character arrived,
with the settlement's own history in the interim available to read as a digest — literally the
worldbook §1.3 "Foundation problem" (a government can only arbitrate retroactively, never in real
time) experienced personally, at the scale of one absent player instead of one absent government.

### 2.5 Time-debt, made concrete — the Hyperion move as a mechanic

Worldbook §2.6 states time-debt as fiction (*"the person you left returns older, or not at
all"*); this is its mechanical form, and it is deliberately narrow, matching the worldbook's own
hard boundary (§2.8): **Skip never changes `delivery_tick`.** The ship still arrives on the
Confederacy's shared clock exactly when §2.2's formula says it does, at whatever velocity it's
actually going — Push is the only lever that moves `delivery_tick` earlier, because Push is the
only lever that changes velocity. What Skip changes is a second, personal number: how much of that
same fixed `[origin_tick, delivery_tick]` interval the *traveling character's own worldline*
actually experienced. A Skip of compression ratio `r` charges the traveler `time-debt = (1 - 1/r)
× hop_duration`, credited against a portable, Counting-House-tracked ledger (not the traveler's
purse — worldbook §2.6), repaid only by **settling**: living out ordinary, uncompressed ticks,
during which the traveler cannot legally book another Skip. This is the mechanical guarantee
behind the fiction's own "pilgrim who Skips to reach a dying relative" example (worldbook §2.6):
the ship arrives on schedule either way; Skip only decides whether the traveler's own character
was present, biologically, for the years in between, or spent them compressed and now owes them
back.

---

## 3. The conceit as premium currency, priced kindly

### 3.1 Reach, not power — the hard boundary stated as a design rule

§2.2's formula already carries the whole argument mathematically: `ticks_per_ly(v) = 8,766 / (v/c)`
has c as a hard floor that no purchase can cross, and channeling's two levers (worldbook §2.3)
only ever operate inside that floor. **Push moves you toward the floor** (a ship gets there
faster, still bounded by c) — this is reach in the literal, spatial sense: it is the lever that
lets a single season of real play cover a crossing that unaided sail would take a decade to cover,
without ever making a Pushed character *stronger* than an un-Pushed one once they arrive. **Skip
moves the floor's cost off the traveler's calendar and onto their worldline** (§2.5) — this is
reach in the personal sense: it is the lever that lets a mortal player's limited playtime and a
character's limited career span cover a distance that would otherwise consume it. Neither lever
touches combat, crafting, the local market's prices, a settlement's storylet outcomes, or standing
with a faction. **Chron is not a currency the local Rimworld game has any use for, structurally —
there is nothing in §1.1's local-scale storylet or §1.3's local market that chron is denominated
in or could purchase an advantage in.** This is the design answer to instruction: not a promise
enforced by policy, but a currency with no denomination-compatible sink anywhere in the game that
isn't crossing distance.

### 3.2 What chron can and cannot buy, restated as a table

| Chron buys | Chron does not buy |
|---|---|
| Push — a faster `delivery_tick` for a specific hop, bounded by the 0.6–0.9c ceiling | A storylet outcome, of any kind, at any settlement |
| Skip — less of a specific traveler's own worldline spent inside a fixed `[origin_tick, delivery_tick]` interval | A local market price, a crafting yield, a faction standing shift |
| Loom-queue priority at a chokepoint (an EVE-shaped scarcity good — worldbook §2.2's loom-as-infrastructure) | Combat, skill-by-use progression, or any `fizzos` quality tagged append-only-trained or decaying-need in §1.1's table |
| — | Information faster than the physical arrival that would carry it (worldbook §2.3's hard rule, restated §2.8) |

### 3.3 The credits-as-warp tension, named rather than silently resolved

There is a real tension between two things the house has already said, and this document names it
rather than picking a side without the owner's sign-off. `gaming-enterprises-vision.md` §4 states
the conceit's fictional logic plainly: *"if money is energy and time is energy, then purchasing
credits is what allows warp travel."* `the-suite-and-the-studio.md` §2 (corrected) states the
house's actual monetization posture just as plainly: *"We never take your money to play... never
pay out more than we verifiably earned."* Read literally, side by side, the first sentence could
be taken to mean a player buys warp with a real credit card; the second forecloses that reading
for the whole catalog. **This document's proposal, offered for the owner to keep or cut**: treat
these as two different kinds of sentence, not one. The vision note's sentence is **diegetic** — it
explains, inside the fiction, *why* chron costs what it costs (money is energy is time, in-world,
worked out fully in worldbook §2). The trust-copy sentence is a **real-world business rule**, and
it wins whenever the two would otherwise conflict: credits, in this game, are earned by playing —
identically to `ENERGY` under `energy-bank`'s existing earn-only discipline (§1.3) — and chron is
bought with *those*, never with a real-money purchase that bypasses play. The fiction's causal
chain (worldbook §2.7: *credits buy chron, chron buys a channeler's draw, the draw buys Push or
Skip*) stays exactly as written; what changes is only where credits themselves come from, and the
answer is the same answer every other `ENERGY` balance in the catalog already has. This keeps the
commission's own sentence true in-world while keeping the house's harder, more recently stated
promise true in the real one.

### 3.4 Why v1 can honestly ship with zero looms

Worldbook §2.2 already states looms are rare — *"a handful per Core World, fewer per Established
Colony, essentially none on the Frontier"* — and Ben is an Established-Colony-tier system
(worldbook §4.2's population table), which makes **zero operational looms at Ben** a plausible
reading of canon's own rarity claim, not a contrivance invented to duck scope. §4 below makes this
the actual v1 cut: the premium-currency system designed in full above is real design, ready to
build, but it is not required for v1 to be a complete, playable game — the strongest possible form
of "never pay-to-win the local game" is a v1 where the pay-adjacent system does not exist in the
build at all yet. A dormant, historical, or unlicensed loom stub at Ben (a Founding-era ruin, or a
smuggler's unregistered rig — either reads fine against worldbook §2.4's corona-detection hook) is
a free piece of foreshadowing furniture, not a functioning system, in v1.

---

## 4. Scope honesty: the v1 cut

### 4.1 What's in

**One system (Ben), one settlement cluster (Apotei Orchard + Buinga Station, Ben-Two — the exact
locations worldbook §6.1's gazetteer already names, and the setting "The Okaga"'s own draft
scenes already dramatize in detail: the requisition economy, the ticket numbers, the seed
envelopes, the blight).** This is deliberately the same content-well strategy
`farstone-qbn-design.md` §6 used for pyfars/legacy-Farstone — mine the existing draft fiction's
specifics directly for room prose, NPC bios, and the storylet seeds already sitting in it, rather
than inventing a setting from nothing. In scope: storylet play (§1.1) over the six quality
families, MUD presence and talk (§1.2) across Buinga Station and the Orchard's rooms, a
`fizzos market.mjs`-priced local REQ economy, a small starting cast (§6), one shared daily docket
(§5) driven by `dailySeed("okaga-ben-two", dateUTC)`.

### 4.2 What's explicitly not in

No interstellar travel of any kind — no ships depart or arrive as a playable action. No channeling,
Push, or Skip — §3.4's zero-loom cut. No player-to-player `energy-bank` market yet — v1's economy
is entirely the local `market.mjs` shop, not a player-driven one; EVE's *industry-and-contracts*
texture (§1.3) is a real, designed, next-tier feature, not a v1 claim. No Counting House or Patrol
as playable factions — per §1.1's own discipline, Frontier/Established-Colony content should
almost never resolve on an institution arriving in time to matter, and v1 has no interstellar
event for either institution to arrive *to* yet regardless.

### 4.3 The graph is real from day one — this is the actual scope-honesty claim

The easy failure mode here is building a single-system game with the shard model bolted on later,
when a second system finally exists. This document's proposal is the opposite, and it costs
nothing extra to build now: **v1 encodes Ben as a node with a real edge, at a real distance, to
one named-or-placeholder neighbor, from the first day of the build**, using exactly §2.2's
formula, exercised against real numbers instead of a stub. Worldbook §1.2/§6.1 already states
Ben's own topology: *"a spur system... one array, one route."* That one route already has a
canonical event to test the whole delivery-tick pipeline against, needing zero invented
justification: **HCS Okaga's own decadal patrol visit is the placeholder edge's scheduled
arrival** — the Arrival Convention (OWNER CANON) *is* a countdown storylet, computed by §2.2's
formula against the corridor's real 2 ly spacing, visible to players as "the Okaga is due in
`delivery_tick`" long before the far end of that edge has one line of authored content. When a
second system is eventually built, it is not a retrofit — it is filling in a distance the graph
already had.

A second, smaller proof of the same pipe, available even cheaper: Ben's own three inhabited/mined
bodies (Ben-Two, Ben-Three, Ben-Four — OWNER CANON, worldbook §0.2) are separated by ordinary
orbital distances (a few AU, illustrative — **NEW CANON PROPOSED**, flavor per worldbook §8's own
convention), which run to light-*minutes*, not light-years — under §2.2's formula, almost always
rounding to the very next tick. This is not meant to be a dramatic mechanic; it is meant to be a
cheap, low-stakes place to unit-test that the delivery-tick pipe computes correctly before
anything real depends on it — a garden hose proved before it has to carry a river.

---

## 5. Daily ritual

One shared docket per UTC day, exactly `ruinfold-daily-design.md` §1.1's `dailySeed(dateUTC)`
pattern with the game/config id set to the settlement (`"okaga-ben-two"`), producing: today's
blight-progression reading at the Orchard, today's array phasing-coil calibration state (feeding
directly into §10's within-window/overdue storylet), today's REQ manifest and `market.mjs` stock
levels, and — once HCS Okaga's own countdown (§4.3) is within some editorially-chosen final
stretch — an Arrival Convention docket entry naming which delegates are due to converge on Buinga
Station. This is `farstone-qbn-design.md` §2's exact division of labor: **the daily seed decides
which situations are live; each player's own presence, talk, and any personal action-budget
quality (not yet designed here — an open v1.1 item, matching that note's own honest "the engine
doesn't have this quality yet" framing) are session-paced, not seed-gated.**

---

## 6. Cast roster (v1 proposal)

Three named agent players, matching `the-suite-and-the-studio.md` §5.3's proposed starting size,
deliberately **not** reusing "The Okaga"'s own named characters (Skah, Dapu, Hotah) — worldbook §8
explicitly reserves those as *"canon-fixed as characters... usable as historical/ancestor figures,
not mandatory NPCs,"* so the living cast is new, built the way `farstone-qbn-design.md` §7
describes: a persona sheet is already the shape a fizzos `agent`/`citizen` record needs (name,
role, a skill set, a cadence to act on), promoted from a scripted routine to a real intent-log
loop.

| cast member | role | ties to |
|---|---|---|
| a North Sanazi Union delegate | negotiates REQ allotments, boards the countdown Arrival Convention when it fires | §1.1's local storylets, §1.2's presence/talk, `progression.mjs`'s law cycle |
| a Buinga Station requisition clerk | runs the day's manifest, the REQ ticket-number texture worldbook §0.3 already establishes as canon color | §1.3's `market.mjs` economy, §5's daily docket |
| a maintenance tech at the array | the character whose job the §10 smallest-step storylet is *about* — the person who watches `within-window` age toward `overdue` | §1.1's contested/⊤-legal quality family, §10 |

---

## 7. Content pipeline: worldbook lists become storylet data

The worldbook was built for exactly this, in its own words (§0 intro): *"eaten forever after by a
storylet compiler — §6's gazetteer entries are written as literal, schema-consistent blocks for
that purpose."* The pipeline this document proposes is the Okaga instance of the general pattern
`farstone-qbn-design.md` §3 already worked out for pyfars: a `place` YAML block (worldbook §6.1)
compiles to a fizzos room; a `faction` block (§6.2) compiles to a standing-ledger entry plus a
roster slot a cast persona can fill; an `era` block (§6.3) is metadata a storylet's flavor text can
reference but never branches on, since eras carry no `canon-status: owner-canon` mechanical claims
of their own. **The worldbook's own §8 load-bearing/flavor table is the compiler's canon-status
field**: a `canon-status: owner-canon` place name is never rewritten by procedural content; a
`flavor`-tagged number (population figures, exact distances) is exactly what a daily seed is free
to perturb within its stated ratio. Nothing about this pipeline is new machinery — it is the same
shape-rule, don't-hard-code-field-names discipline `lantern-service`'s compiler already
demonstrates (cited at one remove via `farstone-qbn-design.md` §3), pointed at YAML frontmatter
blocks instead of a markdown corpus's own frontmatter.

---

## 8. Determinism, replay, cartridge fit

A settlement session is a `Cartridge<State, Intent>` exactly per the spec: `createEngine(seed,
"okaga-ben-two")` seeds off `dailySeed`, `applyIntent` walks storylet choices and MUD commands
through the same validated `Intent` shape §1.2 already commits to for the cast, `defaultReplay` +
`hashState` give the anti-cheat argument `ruinfold-daily-design.md` §2 already proved out for a
different game on the identical contract (*"any single intent... fails validate() → whole run
rejected... (tick, seq) pairs not strictly increasing → rejected"* — the same tolerance table
applies verbatim, since it is a property of the cartridge contract, not of ruinfold's specific
content). §2.4's voyage-as-scheduled-event design is what actually asks something new of the
contract — computing state at a `delivery_tick` far past any tick a human interactively walked
through — and §2.3 already named the honest status of that ask: mechanically it is `defaultReplay`
used for its literal purpose (state from seed + intent-log, at whatever tick is requested), not a
new capability; empirically it is proven only up to 26,880 ticks today, and a hop needs up to
87,660. §11 turns that gap into a concrete, cheap proof obligation rather than leaving it as an
assumption.

The wallet side needs one piece of new engineering, named honestly per the substrate-fit-brief's
own scoping discipline (§2, §7): a `chron` balance needs its own chart-of-accounts path, parallel
to `energy-bank/accounts.mjs`'s existing `liabilities:energy:<id>` (`energyAccountPath`) —
propose `liabilities:chron:<id>`, same double-entry discipline, same
`checkNoNegativeBalances`/`checkPayoutInvariant` invariants, priced by the still-unbuilt
`EnergyHooks`/`priceOf` surface the substrate-fit-brief already flagged as unimplemented in
`0.1.1`. This is **NEW CANON PROPOSED at the schema level, unbuilt at the code level** — not
required for v1 (§4.2), real design debt for whichever step first needs §3's system live.

---

## 9. Staircase placement

Okaga does not appear in `gaming-enterprises-vision.md` §6's staircase table at all today; its
only current house placement is `the-suite-and-the-studio.md` §3's shelf table, **The Stars
(later)**, explicitly deferred, last-named shelf. That deferral is correct for the *full* vision —
a multi-system, channeling-live, EVE-scale galactic confederacy genuinely belongs at the "then"
tier, alongside the undersea cooperative MUD it shares its Lorentzian-shard mechanism with
(substrate-fit-brief §3–§4). **But the v1 this document actually specifies does not need any of
that tier's machinery** — no second system, no channeling, no player-to-player market. Stripped to
§4.1's cut, Okaga v1 is "the farstone-qbn chassis, plus `energy-bank`'s already-built wallet, plus
one new content pack" — the same shape of lift as the **next**-tier steps already on the table
(idle+gambling, energy-tiling). **Proposed staircase correction**: Okaga v1 belongs at **next**,
not **then** — a single-system storylet-and-MUD game buildable now, on substrate that already
exists; the galactic confederacy stays exactly where the shelf table already puts it, arriving
later by the graph-extension path §4.3 describes, not by Okaga v1 waiting for it.

---

## 10. The smallest real step

The single most load-bearing fact in the whole corpus is already named as such (worldbook §0.4):
the signalling array is dual-use, propulsion and comms backbone in one act, and destroying it is
what silences a spur system in "The Okaga"'s own plot skeleton. `farstone-qbn-design.md` §6's own
smallest step ported Permit #23 — the one piece of content proven twice, in two engines — as three
or four cells against current fizzos's real module surface. **Okaga's equivalent smallest step is
the direct transplant of that exact pattern onto its own most load-bearing fact**: author the
array's `within-window` maintenance predicate and its declared converse `overdue` (a **NEW CANON
PROPOSED** calibration cadence — illustrative, flavor-tagged, not a fixed number) as one
`declareConverse` binding against `predication.mjs`/`world-clock.mjs`, run the daily docket (§5)
forward, and confirm the array's calibration state settles to a visibly contested ⊤ on its own —
a sabotage-vulnerability window nobody hand-coded — after N ticks, zero authored `if overdue`
branch anywhere. This proves the entire QBN chassis against Okaga's single most canon-critical
fact, in the smallest possible unit, before a single room or NPC is authored.

---

## 11. Risks

**Prose at volume, inherited directly — cited, not restated as new.** `farstone-qbn-design.md` §5
names the real, evidenced risk: agent-authored prose is demonstrably good at small scale (that
note quotes real `farstone-harbor` room copy) but *volume and branching* — 500–2,000 words across
three to six branch-outcomes, times hundreds of situations — is undemonstrated anywhere in the
corpus, "the specific, nameable risk." Okaga inherits this unmodified, and worldbook §7's own
house-style guidance (terms like *chron*, *the Fold*, *a snap* left unglossed, trusted to the
reader) mitigates verbosity somewhat but does not touch the underlying volume math.

**The Toll's visible-aging continuity, an Okaga-specific compounding of the same risk.** A
channeler cast member's apparent age (worldbook §2.5) has to stay consistent across possibly years
of real calendar time and many authoring sessions — this is exactly why §1.1's table insists it be
a **derived-not-stored** quality, computed off cumulative χ drawn, the same discipline
`farstone-qbn-design.md` §4 already validated for a title-from-skill-bonus pattern (*"rises as you
train, no separate promotion"*) — never a number an author hand-updates and inevitably drifts.
Deferred entirely for v1 by §3.4's zero-loom cut; live risk only once §3 ships.

**The 26,880-vs-87,660-tick gap, named as a proof obligation, not an assumption.** §2.3/§8 already
state this precisely: v1 needs nothing past the proven horizon (a single system, played daily,
never needs a big jump); the first corridor hop does, at roughly 3.3× what's proven today. The
concrete, cheap fix, matching `ruinfold-daily-design.md` §2.3's own house pattern (*"determinism
as a test, not a claim"*): a `prove-long-horizon-tick.mjs` exercising the real Ben-Two content
across an 87,660-plus-tick horizon, written and green *before* any build lets a player book a
corridor hop — not before v1 ships.

**Scope creep toward the "then" tier before the "next" tier is proven.** The temptation this
document explicitly warns against: building §3's chron ledger, or a second system, before §10's
smallest step and §4's v1 cut are live and played. §9's staircase correction is deliberately
conservative about what v1 claims for exactly this reason.

---

## 12. Load-bearing vs. proposal

| Element | Status | Why |
|---|---|---|
| §2.2's delivery-tick formula (signal at c, carriage at v<c, Push narrows the gap, never closes it) | **Load-bearing** | Reproduces worldbook §1.1/§1.3's own stated numbers exactly (the 5:1 signal:ship ratio); no purchase is permitted to move the c floor |
| Skip never changes `delivery_tick`; only Push does | **Load-bearing** | The mechanical form of worldbook §2.8's hard boundary — remove this and "reach not power" collapses into "power" |
| The two-clock split (settlement world-clock vs. voyage-as-scheduled-event) | **Load-bearing design choice** | The actual mechanism that makes years-long travel a daily game; §2.4 |
| chron earned via play, not real-money-purchased directly | **Proposal, flagged for owner sign-off** | §3.3 names a real tension between two existing house statements; this is this document's resolution, not a settled fact |
| Tick = 1 in-fiction hour | **NEW DESIGN PROPOSED, freely rescalable** | Chosen for fit with fizzos's existing 24-ticks/day constant; every §2.2 number rescales if changed |
| v1 = Ben-Two only, zero looms, zero interstellar travel | **This document's scope proposal** | §4; the strongest available form of "never pay-to-win the local game" |
| Okaga v1 belongs at "next," not "then," on the staircase | **Proposal, contradicts the current shelf table's placement** | §9 — flagged explicitly as a correction, not assumed silently |
| `liabilities:chron:<id>` account path | **NEW CANON PROPOSED, unbuilt** | Parallels `energy-bank`'s real `energyAccountPath` shape; not implemented anywhere |
| Array calibration cadence, orbital AU distances, cast member names | **Flavor** | Illustrative per worldbook §8's own convention; adjust freely |

---

## 13. The v1 cut, in one paragraph

Okaga v1 is a single system — Ben, Established-Colony tier per
worldbook §4.2 — with exactly one playable settlement cluster, Apotei Orchard and Buinga Station
on Ben-Two, mined directly from "The Okaga"'s own draft scenes for room prose, NPC texture, and
storylet seeds; it runs storylet play over fizzos's six real quality families gated on the
settlement's own shortages and its one canon-critical contested quality (the signalling array's
maintenance window), MUD presence and talk across those rooms with a three-member cast playing
through the same validated intent-log path a human would, and a local REQ economy priced by
fizzos's own `market.mjs`, all synchronized by one shared daily-UTC seed exactly like
`ruinfold-daily-design.md`'s pattern; it has zero interstellar travel, zero looms, and zero
player-to-player `energy-bank` market, so the premium-currency system designed in full in §3 is
simply absent from the build rather than merely disabled — the strongest honest form of
"never pay-to-win the local game" available; and it already encodes, from the first day of the
build, Ben's real single corridor edge and the exact delivery-tick math for it, with HCS Okaga's
own canon decadal patrol visit standing in as that edge's first real, playable arrival event, so
that the day a second system is built it is filling in a distance the game already had rather than
retrofitting the shard model onto a game that was never designed to need one.
