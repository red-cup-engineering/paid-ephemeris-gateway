---
title: Okaga Substrate-Fit Brief
description: "The house-substrate fit read for the owner's Okaga commission (persistent browser world, one warp conceit, 0.2c ships, billions of players, galactic confederacy): which existing house math/systems carry which commission pillar, stated precisely, with owner canon and newly-proposed canon kept separate."
date: 2026-08-19
keywords: ["gaming", "enterprises", "okaga", "substrate-fit", "qbn", "shrimp", "lorentzian", "cartridge", "energy-bank"]
---

# Okaga Substrate-Fit Brief

The commission (owner, 2026-08-19, verbatim substance): a persistent online world people play
in browser — "picture quality narrative meets Discworld MUD meets EVE." As hard scifi as
possible, with exactly one conceit — "some people can channel energy from outside the
dimensions of this world to do warp travel and other forms of accelerating the arrow of
time." Ships otherwise reach only ~0.2c, giving "Rimworld-y elements, Foundation-y elements,
but also closer to Hyperion-y elements BECAUSE OF THE PLAYERS." A galactic confederacy. World
scale such that a few billion players (assume 50% of humanity) doesn't skew galactic
economics.

**What this note is.** Not a design document — a fit read. For each commission pillar: which
already-built or already-proved house system carries it, cited to source, and whether the
claim is **OWNER CANON** (already said, in-repo, about Okaga specifically), **HOUSE SUBSTRATE**
(a real, built or proved system this brief proposes pointing at Okaga — not yet Okaga canon
until the owner says so), or **NEW CANON PROPOSED** (this brief's own invention, offered for
the owner to keep or cut, per the standing instruction that Okaga canon in-repo is thin).

## 0. What is actually OWNER CANON on Okaga today — the whole list

Thin, per the owner's own framing, and it is genuinely all four items:

1. A legacy, unverified, archived Elite-like space-flight game named Okaga, built on the
   `tsander` wireframe-3D engine, recovery-blocked on `render-substrate-service`
   (`planned/okaga.md`). **This is a different artifact from the commission** — the note
   filing it says so explicitly and this brief does not conflate them.
2. The credits-as-warp conceit, already stated house-wide, not Okaga-specific but named
   against Okaga first: *"if money is energy and time is energy, then purchasing credits is
   what allows warp travel — or other forms of 'magic' — within each world system... warp in
   Okaga, magic elsewhere"* (`gaming-enterprises-vision.md` §4).
3. Okaga chosen as the fiction-heavy setting because *"the interstellar laser-powered
   solar-sail material is 'so in line with how the math of Obsmetrologia works'"*
   (`gaming-enterprises-vision.md` §4, owner statement) — asserted, not derived anywhere in
   the read set. No document in this fit read shows *which* Obsmetrologia math the sail
   physics maps to. **Genuinely open — do not invent a derivation to fill this in.**
4. Shelf placement: "The Stars (later) — Okaga-set games; credits-as-warp — the space-sim
   disc" (`the-suite-and-the-studio.md` §3), last-named shelf, explicitly deferred.

Everything below pillar-by-pillar is HOUSE SUBSTRATE or NEW CANON PROPOSED, labeled as such,
because nothing else in the corpus ties these systems to Okaga yet.

## 1. "Picture quality narrative meets Discworld MUD meets EVE"

**Discworld-MUD half — carried by the current fizzos chassis, not by Farstone's fiction.**
`farstone-qbn-design.md` establishes the mechanism, but the load-bearing part transplants
cleanly because it's engine-level, not setting-level: a quality is a settled EAVT-shaped cell,
and a storylet is a situation the settling/join fold makes visible *without anyone authoring
an if-branch* — proven in committed code (`permit-23`'s `within-window` × its declared
converse `overdue` settling to ⊤ "past tick 30... nobody coded 'permits go bad,' the bilattice
fold produced it"). §6 of that note is explicit that the *transplantable* artifact is the
**active** fizzos module surface — `world.mjs`, `engine.mjs`, `npc.mjs`, `predication.mjs`,
`world-clock.mjs`, `ecology.mjs`, `skills.mjs`, `social.mjs` — not the retired `tab`/EAVT API
the old Farstone game was written against, and not any of Farstone's place-names or NPCs.
**HOUSE SUBSTRATE, precisely scoped:** this is the correct narrative-QBN engine for Okaga's
text layer (situations, NPC routines, contested/⊤-legal qualities dramatizing contradiction
rather than resolving it) — but nothing in the corpus has pointed fizzos at Okaga content yet;
doing so is new work, not a discovered fact. Browser-first is already the house default
(`bin/farstone.mjs` serves HTTP/SSE; `gaming-enterprises-vision.md`: "all browser-based, with
terminal/API interfaces welcomed wherever they fit") — matches "picture quality narrative"
only insofar as a real reading UI gets built on top; today the transport is a bare endpoint,
not a QBN-shaped reading surface (farstone-qbn-design.md §2).

**EVE half — carried by two separate, already-built systems.** (a) The player-driven-economy
half: `@561-group/energy-bank`'s `transfer` module already implements player-to-player
`transferEnergy`, pooling (`createPool`/`contributeToPool`/`distributePool`, largest-remainder
split), and `sellEnergy` (a transfer whose narration carries an agreed price) — a real market
primitive, house-generic, unskinned. (b) The peers-not-pets half: `the-suite-and-the-studio.md`
§2's cast — *"named recurring agent players who actually play, by the same intent-log API as
humans"* — is EVE's "everyone plays the same economy, including the whales and the corp
alliances" instinct, done honestly, because the house's own players-vs-NPCs distinction is
already architecturally collapsed (peers-not-pets). **HOUSE SUBSTRATE**, both halves built,
neither yet wired to a game, let alone Okaga.

## 2. Exactly one conceit — the wallet it prices against

**This is a precise fit, not a loose one.** The commission's "exactly one conceit" constraint
and the Energy Bank's single-commodity, earn-only discipline are the same rule stated twice,
independently, once in fiction and once in code:

- Fiction: *"some people can channel energy from outside the dimensions of this world to do
  warp travel"* — one conceit, one exception to otherwise-hard physics.
- Code (`energy-bank/README.md`): *"there is no random-outcome, stake-at-risk, or house-edge
  mechanic anywhere in it... `ENERGY` is earned by playing, spent inside games, transferred or
  pooled between players, and (optionally) redeemed... That is the whole vocabulary. This
  posture is a property of every module in this package, not a flag one can turn off."*

Concretely: a channeler spending "energy from outside the dimensions of this world" on a warp
jump **is** a debit against `liabilities:energy:<id>` on the fixed chart-of-accounts path the
`accounts` module already derives, checked by the same `checkNoNegativeBalances`/
`checkPayoutInvariant` invariants every other game in the fleet uses. No new ledger mechanics
are needed for the conceit itself — Okaga's one exception to hard physics is priced by the
system that already exists to be the one exception to every other game's raw stat economy.
**HOUSE SUBSTRATE, tightly scoped.** What is genuinely unbuilt and must be named as such,
per the energy-bank README's own scope statement: the `EnergyHooks`/`priceOf` action-pricing
surface (spec §2.5) and the aggregate `EnergyBank` manager class (§2.6) are **not implemented
in 0.1.1** — "no game is wired to this package yet." Warp-jump pricing (distance × some
obstruction-shaped cost, per the energy-tiling precedent in `gaming-enterprises-vision.md`
§2/§7 proposal 2) is **NEW CANON PROPOSED**: no document specifies what a warp jump costs in
`ENERGY`, only that it would be a debit of the same commodity everything else already uses.

## 3. 0.2c ships, Rimworld/Foundation/Hyperion "because of the players" — the key fit

`shrimp-ecology-brief-v2.md` §1 proves, at the mathematics layer (not as a game metaphor):
*"Light cones are Lorentzian (proved): on a causal-set settling, the apex cone is the timelike
(causally connected) substructure and the void cone the spacelike one; H¹ generators are
causal-precedence-acquisition events."* §3 (revised build order) turns this into a design
decision for that MUD: *"adopt the Lorentzian causal settling as the event model — a player's
light cone is the apex cone of their causal history; spacelike players are provably
non-interfering (this is the CALM/coordination-free property worn as fiction: the abyss
between you is real mathematics)."*

**Why this is not a metaphor for Okaga specifically, unlike its origin use.** In the SHRIMP
brief, the light-cone model is chosen as a *design* decision (marked `[D]`) for a fictional
undersea ecology — the causal structure is imposed on a game that has no physical reason to be
relativistic. In Okaga, it is not imposed at all: the commission's own physics — bounded
sub-light travel (~0.2c) and lightspeed comms — means two regions of the galaxy that have not
yet exchanged a lightspeed signal or a warp-capable ship **are, by the stated setting physics
itself, spacelike separated in exactly the technical sense this theorem proves things about.**
The same proved theorem applies to Okaga natively, because Okaga's one hard-scifi rule (no
FTL except the one conceit) is the physical precondition the theorem's Lorentzian structure
already assumes. That is simultaneously: (a) hard scifi — it is literally special-relativistic
causality, not invented game lore; (b) the SHRIMP causal math verbatim, reused because the
shape is the same, not paraphrased; and (c) the mechanism for pillar 5 below.

This also gives the tonal blend its mechanism, not just its vibe:
- **Hyperion-y** — Hyperion's Hegemony worlds are politically and socially asynchronous
  *because of* pre-Farcaster light-lag; that is precisely a population of players living inside
  each other's void cones.
- **Foundation-y** — a wide, slow galaxy where local political drift is possible *because*
  information cannot outrun light is the same causal-set fact read at civilizational scale.
- **Rimworld-y** — an isolated frontier colony is self-governing not by authorial choice but
  because no timely intervention from the metropole is *causally possible* — the void cone
  again, at the scale of one settlement.
- **"Because of the players"** is the owner's own tell that this must be a real multi-agent
  causal fact, not scripted isolation — which is exactly what "spacelike separation" is: an
  emergent property of where players and ships actually are, not an authored zone boundary.

**HOUSE SUBSTRATE, proposed as a genuine transplant, not yet Okaga canon anywhere.** Nothing in
the corpus currently states Okaga uses this model — the SHRIMP brief was written for the
undersea cooperative MUD. This brief proposes reusing the identical proved math for Okaga's
galaxy because Okaga's stated physics is the case the theorem was already about, more
literally than the MUD it was written for.

## 4. Billions of players without skewing galactic economics

**Carried by the same theorem in §3, applied as a scaling argument rather than a tone
argument.** "Spacelike separation = provably non-interfering" is not just flavor — it is
CALM-shaped coordination-freedom (`shrimp-ecology-brief-v2.md` §1: *"The distributed strand is
the proved strand: CRDT convergence / Mayer–Vietoris / cohomological-CALM"*). Two galactic
regions that cannot causally affect each other within the observed time window **do not need
to reconcile state with each other at all** — not "eventually," structurally never, until a
warp-capable channeler or a lightspeed signal actually connects their light cones. This is
precisely how a few billion players fail to skew galactic economics without sharding: the
galaxy partitions itself causally, by physics, not by a server-assignment decision anyone
makes. Locally, within one causally-connected region, `@561-group/cartridge`'s deterministic
seed/replay contract is the consistency mechanism already built for exactly this shape — a
`daily-utc` seed is *"a pure function of a UTC calendar day and a game/config id — every
player worldwide resolves the same seed on the same day"* (`cartridge/README.md`), and
`defaultReplay`/`createVerifier` make every region's local simulation independently
replay-checkable without any other region's cooperation. Region-local determinism plus
cross-region causal non-interference is a complete, two-piece answer to the scale question,
built from two systems that already exist for other reasons.

**The refinement that makes this the safe version of an idea the house already flagged as
risky.** `wilder-conceptions-01.md` item 6 proposed something adjacent and *literal*: measure
real ActivityPub federation latency between live servers and let that be the Commons' actual
regional geometry — *"a remote Mastodon instance with slow, unreliable delivery to you is,
honestly and un-metaphorically, 'far away.'"* The ringleader's same-day response adopted the
cheap sub-step (log latency as a metric) but explicitly deferred the literal-geometry claim,
naming the reason: *"your own failure mode (an admin's bad day reshaping the world map) is
disqualifying for a shipped game until someone designs damping; measured-latency-as-*input* to
an authored map may be the survivable version."* **Okaga's version of this idea does not carry
that risk**, because the causal-separation signal is diegetic distance (light-years ÷ c, a
static galactic geometry) rather than live network health — it cannot have "a bad day." Okaga
gets the exact shape wilder-conceptions item 6 wanted (real physics as real geometry, not an
authored zone map) while sidestepping the specific objection that got it deferred elsewhere,
because the input is stable by construction. **NEW CANON PROPOSED**: this specific
resolution — "Okaga is the safe case of the deferred wilder-conceptions #6 idea" — is this
brief's synthesis, not stated anywhere in the source documents.

## 5. Galactic confederacy — the one pillar with no clean house-system answer

Named for completeness rather than papered over: nothing in the read set specifies a house
system for confederacy-scale governance mechanics. The nearest structural cousin is pyfars —
governance-as-markdown-records dispatched by a rules engine, with closure-rule records
carrying `reads`/`writes` frontmatter (`farstone-qbn-design.md` §1b, §3) — which demonstrates
the house *can* make a polity's charter, duties, and violations game-legible data at the scale
of one town's city hall. Whether that same record shape scales to a galactic confederacy's
charter bodies is untested anywhere in this corpus at any scale beyond a single municipality.
**Genuinely open — flagged, not resolved, per the standing instruction not to invent past what
the corpus supports.**

## 6. Solar sails / Obsmetrologia

Left exactly where §0 item 3 puts it: an owner assertion, unelaborated, no document in this
read maps solar-sail laser-propulsion physics to specific Obsmetrologia mathematics. The
SHRIMP brief §4 records a related but distinct owner claim — that Obsmetrologia, relationality,
semiotics, and Lakotaean metaphysics are "the same mathematics under different lenses" — which
is a claim about *cross-framework equivalence*, not about sail physics specifically. **Do not
conflate the two claims or invent the missing derivation; both are owner-attested, neither is
derived in-repo.**

## 7. The wallet, precisely — what `cartridge`/`energy-bank` are and are not today

For the record, since the conceit prices against this system directly (§2): `@561-group/
cartridge` (0.1.0, 74 tests) is the seed/intent-log/replay contract — manifest schema,
canonical stringification, `hashState`, `createVerifier` — with zero opinion on RNG or on any
game's payload shape. `@561-group/energy-bank` (0.1.1, 79 tests, rebuilt from `.mts` to `.mjs`
because Node refuses to type-strip `.mts` resolved through `node_modules`) is identity +
double-entry ledger + transfer/pool/sell + pluggable settlement (`mockBackend` real today;
`zbdBackend` shape-correct but makes no live network call; on-chain a future third
implementation of the same `SettlementBackend` interface, per the README, "with zero schema
change"). **Neither package currently imports the other** — no `@561-group/cartridge`
integration exists in energy-bank 0.1.1, per its own README's "not implemented" list. Any
Okaga build wiring warp-cost to a cartridge-driven game engine is new integration work on both
sides, not a flip of an existing switch.

## 8. The stopped MUD lane — noted, not opened

Per instruction: a MUD lane (tidepool) has design ideas cached but is unbuilt and currently
stopped. No file matching that name was found anywhere in the active or legacy tree during
this read; noting its stopped status here only, as directed, without further investigation.

## 9. Summary table — pillar → carrier → canon status

| Commission pillar | House carrier | Canon status |
|---|---|---|
| Discworld-MUD narrative layer | current fizzos module surface (`world.mjs`/`engine.mjs`/`npc.mjs`/`predication.mjs`/`world-clock.mjs`) | HOUSE SUBSTRATE |
| EVE player-driven economy | `energy-bank/transfer` (transfer/pool/sell) | HOUSE SUBSTRATE |
| EVE peers, not NPCs | the cast, intent-log API (the-suite-and-the-studio.md §2) | HOUSE SUBSTRATE |
| The one conceit, priced | `energy-bank` ledger, `liabilities:energy:<id>` | HOUSE SUBSTRATE (wallet real; warp-specific pricing unbuilt — NEW CANON PROPOSED) |
| 0.2c causal texture (Rimworld/Foundation/Hyperion) | SHRIMP brief's proved Lorentzian light-cone / apex-void math | HOUSE SUBSTRATE, transplant proposed — NOT yet stated as Okaga canon |
| Billions of players, no shard | same Lorentzian math, read as CALM-shaped non-interference, plus cartridge's daily-seed/replay determinism | HOUSE SUBSTRATE, transplant proposed |
| Latency-as-geometry, safely | wilder-conceptions-01 item 6 + ringleader deferral, resolved for Okaga because the "latency" is static galactic distance not live network health | NEW CANON PROPOSED (this brief's synthesis) |
| Galactic confederacy | pyfars governance-as-records (untested past one town) | OPEN — no clean fit found |
| Solar sails / Obsmetrologia | none found | OPEN — owner assertion only |
| Credits-as-warp conceit itself | already named | OWNER CANON |
