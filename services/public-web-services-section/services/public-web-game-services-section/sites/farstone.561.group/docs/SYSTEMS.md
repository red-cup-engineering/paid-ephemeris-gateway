# Farstone — Systems Design Bible

[`DESIGN.md`](./DESIGN.md) is the engine design: why a MUD is the theory
wearing a walkable face.
This file is the **game-systems design**: the simulation systems that make
Farstone worth living in, designed upward from mechanics the engine
already runs tonight.
The lore is the carrier, not the cargo — every system names the island
story that makes its mechanic legible to a player who will never read
this file ([`world/mythos.md`](./world/mythos.md) holds those stories in
full).

Named incumbents (founder-named, meet-then-beat law): **Discworld MUD**
(2026-09-01) and **Project Gorgon** (2026-09-01, "the two seem so similar
in some ways") — with the founder's June 2026 design bar as the wider
horizon: Dwarf Fortress Adventure Mode, Caves of Qud, Disco Elysium,
Elite, Minecraft. Their capability surfaces are measured from their own
current documentation before any meet-gap is claimed, never from model
memory.

Design stance: seed conditions and dispositions, then let the world run.
Nothing below is a quest script; every system is a loop that produces
stories under pressure, in the tradition this project actually claims —
the storyteller-driven colony sim, the fortress sim's material depth, and
the working-ship sim's earned mastery of space.
The island's scope is a convenience of scale, not a cap on ambition: a
~63-room world is exactly small enough that every system below can couple
to every other and the player can feel all of it.

**What already runs** (the substrate these designs extend, all in
`@red-cup-engineering/feltos` unless marked site-side): the world-clock
(season, semidiurnal tide, weather, dry-streak — `world-clock.mjs`);
climate advisories (harbor-closed, shellfish-closed, fire-danger —
site `farstone-climate.mts`); NPC agency (needs drift, mood, utility
choice among eat/seek-food/rest-at-shelter/attack-rival/work-role —
`npc.mjs`); the director demand economy (`wants`/`want-reward`, role
wants, storm-driven civic demands, `fulfillDemand` on `ware-type` —
`director.mjs`, site `director.mts`); factions with symmetric tension
cells and arms demands (`factions.mjs`); reputation with rival penalties,
price multipliers, crime and bounty (`reputation.mjs`); skills with
practice, tiers, synergies (`skills.mjs`); recipes and crafting
(`crafting.mjs`); markets with mean-reverting prices and
distance-priced regional trade (`market.mjs`); water ecology cells with
growth, harvest, and pollution (`ecology.mjs`); laws
(propose/support/enact), the thought cabinet, and campaign stages
(`progression.mjs`); ships as movable multi-room places built from a
class ladder with coin+timber costs (`ships.mjs`, `ship-classes.mjs`);
monster homes, deaths, and respawns (site `depths.mts`); scalar fields
that diffuse over the room graph (`fields.mjs`); and the six-stage
Off-Season campaign (`farstone-campaign.mjs`, site `campaign.mts`).

Each system below states: **Loop** (state and verbs and what feeds back),
**Couples to** (the real modules and predicates it extends), **Carrier**
(the island story that teaches it), **First slice** (the smallest
buildable tranche, sequenced in §13), and **Surface** (the one line a
RimWorld-class TUFTE/QwzSpace interface should draw; a separate GUI
program consumes these).

---

## 1. The Winter Ledger — cold, needs, and the stove-circles

Survival is the base layer and winter is its author.
Add a third drifting need, `need:warmth`, whose drift rate is a function
of season and weather (winter storm outdoors: fast; summer: nil), paid
down only in rooms tagged `shelter` with a lit heat source.
Mood already derives from needs (`moodOf`); extend it to read warmth, and
let mood gate work quality (§2) and social output (§9).
Fuel becomes an economy: hearths consume firewood/charcoal stock
(Cael's kiln is no longer flavor — it is the winter's power grid).

- **Loop:** cold drifts up → actors converge on stove-circle rooms →
  hearths burn fuel stock → fuel demand flows up the timber chain →
  crowded warm rooms concentrate every social system in four rooms all
  winter, which is exactly what an off-season town does.
- **Couples to:** `npc.mjs` (needs drift, `chooseNpcAction`'s
  rest/shelter arm generalizes to warmth), `world-clock.mjs`
  (season/weather), site `director.mts` (need ticks), items with
  `provides:need:*` (the idiom the stew-pot already uses).
- **Carrier:** the stove-circles of `world/mythos.md` §The winter —
  Saltloft, fulling-shed, net-loft, library stove, chapel tallow.
- **First slice:** `need:warmth` drift on winter ticks + the existing
  `shelter`-tagged rooms relieve it; no fuel accounting yet.
- **Surface:** per-actor need sparklines (hunger/fatigue/warmth) on the
  roster, rooms shaded by warmth so the winter map visibly contracts.

## 2. Wool and Felt — the industry chain

The island's first full production chain, and the template for all
later ones: **fleece → carded wool → felt → garments**, each stage a
recipe (`defineRecipe`/`craft`), each stage a different NPC role working
a different room, quality carried on the output as a function of
`effectiveSkill` at craft time.
Chains create *logistics*: carded wool must physically move from Meg's
bench to Bett's stocks — a standing demand loop the director can mint
haulage work from, for players and NPCs alike.

- **Loop:** valley fleeces arrive seasonally → carding → fulling →
  garments enter the market → winter demand (warmth, §1) consumes them →
  role wants pull the next batch through; a skill-poor winter makes bad
  felt and cold islanders, and everyone knows whose mark was on it.
- **Couples to:** `crafting.mjs`, `skills.mjs` (practice + tiers name
  the quality), `npc.mjs` work (roles `felter`/`carder` shipped in
  `world/harbor.json`), `market.mjs`, `director.mjs` role wants
  (`ware-type:fiber` wares shipped).
- **Carrier:** the Wool Walk and Fulling-Shed district
  (`world/harbor.json`), the felt craft-metaphysic of
  `world/mythos.md` §Felt — the island literally manufactures
  holding-together every winter.
- **First slice:** three recipes (card fleece → carded wool; full
  carded wool → felt bolt; tailor felt bolt → boiled-wool coat) and Bett
  and Meg practicing them through the existing NPC work action.
- **Surface:** a chain strip per industry — stage nodes sized by stock,
  flows per season — so a starved stage reads at a glance.

## 3. The Shipwright's Ladder — boatbuilding

The construction system, and the campaign's "A Roof of Your Own" made
literal on the water.
`ship-classes.mjs` already prices a ladder — raft, dinghy, skiff,
sea-station, lugger — in coin and timber; `ships.mjs` already makes a
built hull a movable multi-room *place* the owner names.
Open the ladder to players and NPCs at the boatyard: gather timber
(node:timber rooms, the pit-saw, the charcoal forge for fittings), lay a
keel, and own a named vessel whose rooms are yours to walk.
This is the system that reaches furthest: a lugger with a hold is a
trading life (§6), a sea-station over the sponge-ground is a frontier
outpost, and a fleet rebuilt hull by hull is the island's long answer to
the Lean Years — the fourth era ending because players ended it.

- **Loop:** timber chain (fell → saw → season) → keel laid at the
  boatyard → hull class chosen → coin+timber consumed → a named ship
  exists as rooms → the ship enables seaward systems (§4-§6) → trade
  profits fund the next hull up the ladder.
- **Couples to:** `ship-classes.mjs`/`ships.mjs` (build + board +
  sail), `crafting.mjs` (timber stages), `progression.mjs`
  (`ownsBuilt` campaign threshold), the boatyard's shipped forge
  items.
- **Carrier:** the boatyard's cold steaming-box and the *Gannet* on the
  reef — the island remembers what a fleet costs and what it is worth.
- **First slice:** `build <class>` at the boatyard consuming coin +
  oak billets for the raft and dinghy rungs; the existing harbor dinghy
  becomes the rental teaser for ownership.
- **Surface:** a hull card per ship — hull/speed/cargo dials, room
  plan, crew roster — and a yard queue showing keels laid.

## 4. Pilotage and the Passes — navigation as mastery

Seaward movement should be *earned space*, not free walking.
Ocean rooms get hazard state: the Reefs' passes shift with the weather
seed each season; entering a hazard cell under sail rolls effective
`seamanship` (synergy: a pilot aboard lends theirs) against snag —
failed rolls cost hull points (`hull` from the ship class), nets, or in
a storm the ship itself, minting new wrecks (§8).
Knowledge is the counter-resource: pilotage is carried partly as skill
and partly as *charts* — internalized thoughts (§10) or purchasable
items — so mastery of the island's water is a real, tradeable thing.

- **Loop:** season reseeds the passes → charts go stale → pilots and
  the well-traveled hold the fresh knowledge → boats risk it, pay for a
  pilot, or fish the safe inshore water thin → snags feed the salvage
  economy and the wreck-registers.
- **Couples to:** `world-clock.mjs` (seeded weather), `skills.mjs`
  (`effectiveSkill` synergies), `ships.mjs` (hull damage on the ship
  entity), site `depths.mts` idiom (hazard rooms), `progression.mjs`
  thoughts as chart-knowledge.
- **Carrier:** Reef Halyard and the Reefs district
  (`world/harbor.json`) — the pun that is also a job description.
- **First slice:** a snag check on sailing into the three reef rooms —
  skill-gated hull damage, waived when a `role:pilot` actor is aboard.
- **Surface:** the chart panel — ocean cells with pass-state glyphs and
  staleness, the tide clock in the corner.

## 5. The Banks — fishery as living ecology

Replace the site's scalar `fish-stock` with `ecology.mjs` cells on every
water room (fishing grounds, Reefs, sponge-ground, the marsh bed): stock
that grows logistically, migrates seasonally (spawn inshore in spring,
school on the Banks in autumn), and collapses if fished under its
regeneration floor.
Pollution is the other half already in the module: **the dredging permit
becomes a real consequence** — granting it emits pollution into the
marsh cell and silts Brannaugh's clam ground for seasons, denying it
keeps the harbor channel shallow and the big hulls out.
The permit ⊤ stops being a story about paperwork and becomes a lever on
the island's food supply, which is what it always was.

- **Loop:** season moves the fish → the fleet follows or starves →
  harvest pressure vs. growth rate sets next season's stock → prices
  (§6) and hunger (§1) feel it → the permit fight and the closure rules
  (§7) are the polity's hands on the same loop.
- **Couples to:** `ecology.mjs` (initialize/harvest/step/pollute),
  site `director.mts` (its fish-stock/price lines migrate here),
  `farstone-arcs.mts` petition (its resolution emits or spares
  pollution), climate's shellfish closures.
- **Carrier:** the failing fishery of [`world/lore.md`](./world/lore.md)
  — "the island can no longer feed everyone from its own waters" — now
  a measured, recoverable, ruinable fact.
- **First slice:** ecology cells on the four water rooms with the
  site's current stock/price behavior reproduced through them; permit
  resolution wired to one `emitPollution` call.
- **Surface:** small-multiple stock/pollution bars per water cell, one
  season of history behind each.

## 6. Trade Winds — cargo, routes, and the price of weather

`market.mjs` already knows mean reversion and `regionalPrice(distance)`.
Stand up three market nodes — the quay (farstone-market), the valley
farm-stand, and the mainland (reachable only by ferry or own hull) —
with real distance and transport rates, and let the climate system move
the spreads: a closed harbor (storm) starves the mainland link and
spikes imports; a fat catch crashes fish at the quay while the valley
still pays dear.
Cargo is hold-limited (`cargo` on the ship class), so the lugger's
twelve crates are a real career and the raft's one is a real
apprenticeship.

- **Loop:** buy where it's cheap → sail it (through §4's risk) → sell
  where it's dear → prices mean-revert under the traffic → weather and
  season keep re-opening spreads → profits climb the shipwright's
  ladder (§3).
- **Couples to:** `market.mjs` (all of it, currently unwired site-side),
  `ships.mjs` cargo, climate harbor-closure, `reputation.mjs`
  `priceMultiplier` (standing prices, faction discounts).
- **Carrier:** the twice-daily weather-held ferry and the chandlery's
  scarce winter buyers — Farstone has always been a spread between two
  coasts.
- **First slice:** initialize the three markets over the existing
  `price:fish` behavior; buy/sell verbs at each; ferry passage sells
  deck cargo space before player hulls exist.
- **Surface:** a three-column price board with live spreads and a
  route-profit readout per hull class.

## 7. The Charter — law as a playable system

`progression.mjs` already carries propose/support/enact; the arcs
capability already settles the permit and re-inspects the hydrant.
Generalize: **ordinances are world cells that reparameterize other
systems**, proposed at the records office, supported by standing actors,
enacted past a quorum — a logging ban toggles the legality of
`node:timber` work (violation → `flagCrime`), a closure rule moves the
shellfish thresholds the climate system enforces, a dredging grant is
the §5 pollution lever, a hearth-fuel dole (chapel-sponsored) drains
the treasury against winter deaths.
Decision windows age (the clerk's day-book), and an aged-out window
settles ⊤ — the town holds the contradiction and every believer carries
the mood cost, exactly per the canon law.

- **Loop:** pressure from any system → a proposal → support gathers
  along faction lines (§8) → enact/lapse/⊤ → the enacted cell
  reparameterizes the pressuring system → new pressure somewhere else;
  the polity is a control surface the players can sit at.
- **Couples to:** `progression.mjs` laws, site `farstone-arcs.mts`
  (petition/inspect are the first two ordinances in this shape),
  `reputation.mjs` (`flagCrime` enforcement), every system above (as
  parameters).
- **Carrier:** Clerk Halloran holding Application 23 in two minds —
  `world/mythos.md` names him the one man doing the island's signature
  thing on purpose.
- **First slice:** one enactable ordinance end-to-end — the logging
  ban — proposed at the records office, supported by two NPCs, its
  cell read by the timber-work path.
- **Surface:** the docket — live ordinance cells with age-in-window
  bars, support tallies, and ⊤ marked as ⊤, not hidden.

## 8. Salvage and the Grey Trade — wrecks, contraband, crime

The island's shadow economy, built from parts that all exist: storms
and snags (§4) mint wrecks; wrecks hold salvage; salvage has two doors —
declared at the harbormaster's office (coin minus the crown's share,
Watch standing up) or fenced through Riba Voss (full price in clean
coin, `contraband` risk, `flagCrime` on discovery, Marsh standing up,
Watch down).
Bounties (`payBounty`) close the loop and give the Watch a live job;
smuggling routes give the sea-caves and the night tide a mechanical
meaning.

- **Loop:** weather makes wrecks → divers/salvors race the sand → each
  haul chooses a door → standing and wanted-state accumulate → the
  Watch presses, the Marsh shelters, the tension cell between them
  (§9) feeds the storyteller (§12).
- **Couples to:** `reputation.mjs` (crime/bounty/standing),
  `factions.mjs` (tension), the shipped Gannet wreck, conger, brandy,
  and Riba Voss (`world/harbor.json`), §4's wreck-minting.
- **Carrier:** *the sea keeps what it is given* — and the islanders
  argue forever about what was given and what was only lost; salvage
  law is Maraset's theology with a ledger.
- **First slice:** the two-door sale — Riba buys `contraband` at full
  value with a crime-flag chance; the harbormaster buys anything at a
  cut, no questions, no risk.
- **Surface:** the wanted ledger — actors with crime marks, open
  bounties, and each wreck's remaining salvage as a draining bar.

## 9. The Four Factions — politics under scarcity

`factions.mjs` has the machinery (catalogs, rival edges, symmetric
tension that cools daily and demands arms past a threshold) and the
site has the cast, but the catalog is never seeded.
Seed the four factions of `world/mythos.md` §The factions (Fleet,
Watch, Chapel, Marsh) with their rival edges, and wire tension's
*sources*: a rival-on-rival attack, a fenced haul discovered, a
closure ruling against a faction's living, a winter of hungry members —
each raises the right edge, and past threshold the members' demands
change character (arms, patrols, dole, censure) so a strained island
*feels* strained through what everyone asks of you.

- **Loop:** every other system's frictions convert to tension on a
  specific edge → tension mints demands and mood penalties → players
  ease it (deliveries, petitions, weddings at the chapel) or arm it →
  eased edges cool; armed edges hand the storyteller (§12) its
  material.
- **Couples to:** `factions.mjs` (all of it), `reputation.mjs`
  (standing shifts already charge cataloged rivals),
  `director.mjs` (`factionDemandFor` is already written and waiting),
  the `faction:*` tags shipped on every NPC.
- **Carrier:** the creeds and the standing tensions in
  `world/mythos.md` — Fleet against Watch over the permit, Chapel
  against Marsh over which Maraset is real.
- **First slice:** `defineFactions` seeded at world boot with the four
  catalogs; rival-attack events raise the Fleet-Watch edge; the
  existing arms-demand path switches on with no further work.
- **Surface:** a 4×4 tension matrix, cells warming through the winter,
  with each faction's open demands listed under its column.

## 10. The Thought Cabinet — a keener eye

The campaign's third stage ("Internalize a Thought — let the island
reshape how you see") awaits content; `defineThought`, `beginThought`,
`internalizeThought` await calls.
Farstone thoughts are earned island epistemology, each granting a
perceptual or mechanical edge: *Tough, Not Hard* (witness three held
⊤ cells; contested-belief mood penalties halve), *The Sea Keeps What It
Is Given* (make an offering over the side; drowning risk reads
differently), *The Passes By Feel* (survive five reef transits; acts as
a fresh chart, §4), *Nothing In Felt Agrees* (work the fulling-shed a
winter; faction tension readouts unlock).
Thoughts are the game's Disco Elysium direction: character growth as
changed reading of the same world.

- **Loop:** doing the island's things begins thoughts → ticks
  internalize them → internalized thoughts change perception and
  unlock verbs → `thoughtsFixed` advances the campaign → deeper
  systems become legible, which is itself the reward.
- **Couples to:** `progression.mjs` thought cabinet, site
  `campaign.mts` (`thoughtsFixed` is read and currently always 0),
  perception (`farstone-perception.mts` frames are where changed
  seeing lands).
- **Carrier:** every thought is a proverb from `world/mythos.md`
  said by a named islander first — Wenna's sermon, Bett's verdict, the
  founders' law.
- **First slice:** three thoughts defined and wired: begin-conditions
  checked by the site director, `thoughtsFixed` assembled into the
  campaign view.
- **Surface:** the cabinet — thought cards with progress rings and,
  once fixed, the one line of what it changed.

## 11. The Under-Island — depth as industry and dread

The five-depth descent is shipped content; make it a working frontier.
Mining reopens as an industry chain (§2's template on stone: ore from
`node:iron` faces → smelting at the forge → the smith's wants), the
flooded levels become a *pumpable* infrastructure project — restore the
pumphouse (timber, iron, labor, a law for the funding) and the water
table drops, opening rooms and raising hazards — and the deep's
inhabitants respond to traffic: cleared warrens repopulate on respawn
clocks, and sustained noise wakes things a level down.
Depth is the fortress-sim direction: riches, infrastructure, and the
dig-too-deep bargain the island already wrote into its own history.

- **Loop:** surface demand for iron/gems → descent → extraction under
  hazard → hauls fund pumping and props → deeper access → richer veins
  and worse neighbors → the catacombs and the vault put a hard
  theological price on the last levels.
- **Couples to:** site `depths.mts` (homes/respawn), `crafting.mjs`
  (smelting recipes), `npc.mjs` work, `fields.mjs` (water table and
  noise as diffusing fields over the mine graph — the module exists
  for exactly this shape of problem), §7 (a pumping levy).
- **Carrier:** the Quarry Years and the cave-in
  (`world/mythos.md` §eras); the survey that stops mid-line; TURNED
  BACK AT THE THIRD LEVEL.
- **First slice:** ore extraction — work at the stope yields iron bars
  through the existing role-work action, feeding the forge chain.
- **Surface:** a cross-section strip of the island, rooms as cells,
  water table shaded, hazard glyphs per level.

## 12. The Storyteller — the director grown up

The end state of the director systems: a storyteller that reads the
whole island and paces its winters.
Inputs it already has or that systems above give it: mood aggregates,
faction tension edges, stock levels, wanted lists, the weather seed,
campaign stages present in the population.
Give it an incident vocabulary (storm-closure cascade, wreck ashore,
mine breach, contagion at the clinic, a mainland buyer, a chapel
festival) and a pacing model — pressure accumulates from the fields
above, incidents spend it, cooldowns protect the quiet that makes the
loud legible.
House law for its design: signals are nutrients and perturbations, not
pre-routed tasks — the storyteller perturbs the simulation and lets the
systems produce the story, never scripts outcomes (the design law is
stated at
`lib/emsenn/services/561-group/services/engineering-services-section/content/text/documents/articles/notes/2026/08/01/2026-08-01-note-on-the-content-addressed-glass-sponge-semantic-compute-complex.md`
§15, and it is the Sylvester storyteller thesis in house dress).

- **Loop:** systems generate pressure → the storyteller spends it as
  perturbations sized to the island's current capacity → systems
  metabolize the perturbation into consequences → players' handling
  feeds the next reading; drama with a thermostat.
- **Couples to:** both directors (site `director.mts` becomes this),
  `fields.mjs` (pressure as a diffusing field is the natural
  aggregate), climate (weather is its biggest lever already), every
  system above (as sensors and effectors).
- **Carrier:** the island's own voice — "the most interesting events on
  Farstone are tides, fog, ferry schedules held up by weather" — the
  storyteller's taste is the tone law of
  [`world/lore.md`](./world/lore.md) made executable.
- **First slice:** one composed incident — the storm-closure cascade
  (all pieces exist: storm weather, harbor-closed, ferry stop, civic
  timber demands) — fired off a pressure counter instead of raw
  weather, with a cooldown.
- **Surface:** the storyteller gauge — pressure accumulating, last
  incident, cooldown — beside an event log written in the island's
  register.

---

## 13. Sequencing — the first slices in order

Ordered so each slice ships alone, tests green, and feeds the next;
slices 1-3 are pure wiring of existing modules to shipped content.

1. **Factions seeded** (§9) — `defineFactions` at boot; the dormant
   machinery wakes against the shipped `faction:*` tags.
2. **Warmth** (§1) — the winter becomes mechanical; shipped `shelter`
   rooms start mattering.
3. **Wool recipes** (§2) — the first chain, on shipped rooms, roles,
   and wares.
4. **Ecology cells** (§5) — the fishery becomes real; the permit
   becomes a lever.
5. **Markets** (§6) — three nodes over existing prices; trade exists
   before player hulls.
6. **Snag checks** (§4) — the Reefs get teeth; pilots get a living.
7. **Boatbuilding, low rungs** (§3) — raft and dinghy; ownership
   begins.
8. **Two-door salvage** (§8) — the grey trade opens on the shipped
   wreck.
9. **Three thoughts** (§10) — the campaign's dead stage comes alive.
10. **The logging ordinance** (§7) — law end-to-end once, small.
11. **Ore work** (§11) — the under-island joins the economy.
12. **The storyteller's first incident** (§12) — the cascade, paced.

Everything after slice 12 is the same systems deepening under their own
feedback — which is the point: past that line the island writes its own
roadmap.

---

## Open questions

- Whether NPC boat crews (the fleet actually sailing to the Banks in
  season) ride §3+§4 directly or need a cheaper abstraction for
  off-screen voyages.
- Whether warmth (§1) should kill — NPC death exists in the depths
  idiom; a freezing death ashore is a heavier authorial decision than a
  mechanical one.
- Where quality-graded goods (§2) meet the flat `price:` tag idiom —
  quality-priced wares likely need a market-side rule, not more tags.
- Whether charts-as-thoughts (§4, §10) or charts-as-items should win
  where they overlap; both are canon-plausible and one should own it.
