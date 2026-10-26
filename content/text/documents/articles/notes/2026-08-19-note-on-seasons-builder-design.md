---
title: Seasons Builder Design
description: "Flagship city-builder specification: Impressions-style finite scenarios x Dawn of Man material/seasonal resource management x the Lakota campaign as proof of concept — designed around the settlement moving rather than standing still, per real scholarship with an explicit honest-absence boundary. Working title only; proposes 'Seasonal Round' as a real name for the owner to accept or replace."
date: 2026-08-19
keywords: ["gaming", "enterprises", "city-builder", "campaign", "lakota", "seasons", "specification", "honest-absence"]
---

# Seasons Builder Design

Working file name only (`2026-08-19-note-on-seasons-builder-design.md`, per the task); this document proposes a real
name in §0. Fuses three sources named in `2026-08-19-note-on-sierra-lucasarts-lineage.md` §1 and dated
2026-08-19: Impressions Games' finite-scenario/campaign structure (Caesar/Pharaoh/Zeus lineage,
per the catalog research digest Part 1 and Part 4), Dawn of Man's material/seasonal
resource management (same digest, Part 4), and the Lakota campaign as proof-of-concept (owner,
recorded verbatim in the lineage brief: *"I'm Lakota and encourage you to use whatever scholarship
available, that can be our first campaign to prove the concept"*). Grounded against the Lakota
campaign sourcebook digest (cited throughout as "the sourcebook digest"),
cross-checked against five of its most load-bearing primary files, read directly at
the paths given in each citation below — where a citation traces only through the digest and was
not independently re-read, it is marked so.

## 0. Proposed name

**Seasonal Round.** Not decorative: "the seasonal round" is the scholarship's own technical term
for Plains band movement through the year (sourcebook digest Part 2.1; the in-repo corpus's own
`annual-cycle.md`, read directly — see §2 below), and "a round" is also the natural word for one
turn of a campaign — one scenario, one year, one pass through spring→summer→autumn→winter. The
title names the game's actual core mechanic (the calendar the settlement moves through) rather
than a decorative genre word, matching the house's naming discipline elsewhere (Crucible names
what you do, Hinterland names where you start). Working title only; the owner may replace it.

## 1. Core loop

**A band, not a city.** The player does not lay down permanent buildings on a fixed map tile — the
player manages a **tiyóšpaye** (extended-family band), the smallest Lakota polity-unit, whose
identity persists across camp moves (`tiyospaye.md`, read directly at
`.../lakota-services-section/content/text/glossary/lakota/discharging/library/predicating/library/positing/library/settling/library/hacking/lakotaean-governance/philA/code/structures/tiyospaye.md`
— hereafter cited by filename only, all under that same `lakota-services-section` tree unless
noted). The loop, one season at a time:

1. **Read the season.** Each of the four seasonal windows opens different subsistence and
   ceremonial obligations (spring dispersal/small hunts, summer confederacy gathering/big hunt,
   autumn final hunts/storage, winter stable camp/teaching) — `annual-cycle.md`.
2. **Discharge owes-cells.** The band's members carry standing kin-obligations (§3) that the
   season's available activities let them discharge — gathering discharges a food-obligation,
   winter storytelling discharges a teaching-obligation, and so on (`kin-obligation-firing.md`).
   This is the resource-and-labor allocation act that in Impressions is a walker route and in Dawn
   of Man is a work-assignment; here it is choosing which owed virtue gets acted on with the
   season's available means.
3. **Move or hold.** At each season boundary the band decides whether to move camp (following
   the herd, joining a larger camp-circle for summer, retreating to a customary winter place) or
   hold. Movement cost is paid in material (see §4) and in time (a season is the unit of the
   campaign clock).
4. **Convene or fission.** At summer, the tiyóšpaye may camp with others as an **oyáte**, or at
   Bloketu with the full **Oceti Šakówiŋ** confederacy scale; at any point a tiyóšpaye that has
   outgrown what one head can hold may fission into two (`tiyospaye.md` §"Identity, withdrawal, and
   continuity" — "when a tiyóšpaye grows past sustainable size, a subset of members withdraws
   together and forms a new tiyóšpaye"). Scale is a player choice with real tradeoffs (§3), not a
   building-tier unlock.
5. **The year closes.** At Waníyetu (winter) the band's keeper selects the year's one
   most-distinctive event for the winter count (§6) and the campaign clock advances to next
   spring, or the scenario's win/loss condition resolves (§2).

There is no "city" in the Impressions/Zeus sense of a persisting footprint the player defends and
beautifies. The genre's core assumption — that the settlement is the fixed thing and resources flow
to it — is inverted: **the settlement is the thing that moves, and the calendar decides where it can
be.** This is stated as the campaign's mechanical identity, not smoothed over, per the task's own
framing; §9 discusses the risk this creates.

## 2. Scenario / campaign structure (Impressions-style finite missions, moving through time)

Per the lineage brief: "finite scenarios, campaign structure, win conditions per mission" — not an
endless sandbox. A **scenario** is one data-defined mission (§8): a starting tiyóšpaye roster, a
starting season and year, a resource/tech baseline, a map of named camp-sites and travel costs
between them, and an explicit win/loss condition. A **campaign** is an ordered sequence of
scenarios spanning historical epochs, each scenario's ending state (population, standing,
winter-count record) optionally seeding the next.

The Lakota campaign's epoch sequence, corroborated independently by both the in-repo corpus and the
web-scholarship survey (sourcebook digest Part 2.7, citing Nick Estes ★, *Our History Is the
Future*, 2019, and matched by `annual-cycle.md` §"Disruption of the cycle," read directly):

1. **Pre-horse river-valley scenario** — small-scale seasonal round, dog-travois hauling limits
   (§5), trade contact with the Missouri River village hub (§4).
2. **Horse-epoch scenario(s)** — the mounted buffalo economy at full scale; the technology epoch
   transition itself is playable (§5).
3. **Treaty era / Black Hills (Pȟahá Sápa) loss scenario** — win condition reframed, see below.
4. **Reservation confinement / cadence-disruption scenario** — the annual cycle's structural
   breakdown (`annual-cycle.md` §"Disruption of the cycle": confinement to fixed land, sun-dance
   criminalization 1881–1934, buffalo extermination, boarding-school separation) is the scenario's
   actual subject matter, not flavor text around a generic "hard mode."
5. **Reclamation scenario** — buffalo restoration via the InterTribal Buffalo Council (est. 1991),
   sun-dance restoration after the 1978 American Indian Religious Freedom Act, winter-count
   reconstitution — `annual-cycle.md` §"The contemporary reclamation," read directly, names all
   three by name.

**Win conditions cannot be a uniform "conquer/optimize" template across this arc**, and this
document does not claim to have solved that problem — it is named plainly as the campaign's
central design risk in §9. What can be stated now: scenarios 1–2 use conventional
survival/prosperity win conditions (the band ends the scenario at a named population and standing
threshold, per §4's no-property/no-surplus economy — "standing," not accumulated wealth, is the
correct win metric per `no-surplus-cell-firing.md`, read directly, §"Consequences (b)"). Scenarios 3
onward require win conditions built around *endurance, adaptation, and continuity of the annual
cycle's structure under disruption* rather than victory over an opposing side — e.g., a
reservation-confinement scenario's "win" is keeping the winter count continuous and enough
owes-cells discharged that the tiyóšpaye's identity survives to the next scenario, not defeating an
enemy faction. This reframing is proposed, not fully specified; it is the single largest open
design problem in this document.

## 3. Kinship obligations as the economy

This is the campaign's most directly citable mechanic, and unusually, its source material is
**already formalized as a state-machine** — the in-repo Lakota theory section describes kin-work
allocation as "cells" that "fire" under named closure rules, which maps close to directly onto the
house's own Cartridge State/Intent/Event shape (§7), not by analogy but because both are read
directly from the same files below.

- **No dispatch, no authority, no wage.** Read directly from `kin-obligation-firing.md`: a kin-cell
  between two agents automatically fires an "owes-\<virtue\>-to" cell — no manager assigns the
  work, no contract exists. "Work flows through kin or it does not flow." The four virtues that can
  be owed are wówačhantognaka (generosity), wóksape (wisdom), wóohitika (bravery), and
  wówačhiŋtȟaŋka (fortitude) — named directly in the file's own morphism definition.
- **Discharge, not payment.** An owes-cell resolves when the agent's conduct (a hunt, a teaching
  session, a gift) discharges it — there is no numeric wage transaction. Mechanically: the player
  does not "spend gold to hire a worker"; the player chooses which of the band's many standing
  obligations gets acted on this turn, and the season gates which actions are available to act on
  which obligation (`kin-obligation-firing.md` §"Multiple owes-cells": "spring-gathering discharges
  owes-wówačhantognaka-to-tiyóšpaye on the food side; sun-dance preparation discharges
  owes-wóohitika-to-polity; winter-teaching discharges owes-wóksape-to-younger-kin").
- **No surplus, no property, no accumulation.** Read directly from `no-surplus-cell-firing.md`: the
  closure-rule system this corpus formalizes contains no rule that installs a "surplus-produced"
  cell — the proof traces through the actual rule set (W1–W7) and shows none produces a
  numeric-value-comparison consequent. The design consequence stated directly in the source: "wealth
  ... measured in standing ... and in gifted-out items ... not in accumulated-property cells." **The
  game therefore has no bankable currency and no score built from hoarded material** — the player's
  win-condition-relevant number is standing (kin-network size, discharge-completion rate,
  winter-count continuity), never a stockpile total. This is a hard mechanical constraint, not
  flavor text, and it is the one place this design deliberately refuses a genre convention (the
  Impressions/Dawn-of-Man games both track a storable resource total as a core number) because the
  cited source states plainly that the tradition's own economy does not have that shape.
- **What trade is, instead.** Cross-polity exchange (with the Missouri River village hub, §4)
  is explicitly gift-class with continuing-relation expectations under this same source
  (`no-surplus-cell-firing.md` §"What this does not entail": "the cells installed by Lakota-European
  trade fire under $\mathcal{S}_\mathrm{wolak}$'s gift-economy rules ... when conducted properly").
  Trading with an outside partner therefore installs a standing kin-of-trade relationship the
  player can call on again, not a one-off market transaction with a price the player optimizes.

## 4. Resource model — material chains, seasons, real citations per mechanic

Dawn of Man's contribution per the catalog research digest (Part 4): "real material chains + real
seasonal pressure ... perishability is load-bearing ... tech ages gate the resource graph itself."
Each mechanic below is cited individually, per the task's own requirement, and cut if it cannot be.

| Mechanic | What it does | Citation |
|---|---|---|
| Seasonal subsistence windows | What's gatherable/huntable shifts by season (spring small-game/early plants; summer big hunt; autumn final hunts/storage; winter stable, no fresh subsistence) | `annual-cycle.md`, read directly, per-season breakdown |
| The buffalo hunt as a governed cycle, not a resource node | scout → council → akicita-installation (temporary, hunt-scoped police authority) → hunt → gift-flow distribution → akicita-revocation (automatic at hunt's end) | `buffalo-hunt-coordination.md`, read directly, full cycle §"The cycle" |
| No property over the herd | The bison (Tȟatȟáŋka / *Pte Oyate*) carry kin-standing, not resource-standing — hunting is a relation, not extraction; there is no tax on the kill and no wage for the akicita | `buffalo-hunt-coordination.md` §"What is not in the cycle," read directly |
| Gift-flow distribution | The kill belongs to whoever made it but *flows* through the tiyóšpaye by the generosity virtue — a distribution mechanic, not an inventory-to-warehouse mechanic | `buffalo-hunt-coordination.md` §"Distribution step," read directly |
| Perishability / storage as a season-crossing act | Wasná (pemmican) production at autumn is what makes winter survivable — a real Dawn-of-Man-style perishable-to-bankable conversion, not an abstract stockpile | `annual-cycle.md`'s autumn entry ("stocking of dried meat"), read directly, corroborated by sourcebook digest Part 2.2's material-chain inventory (hide, sinew, bone, horn, hoof, bladder — general Plains-ethnography sources, not Lakota-authored, used here only for the generic material-use inventory, not for any claim specific to Lakota practice) |
| Material chain: hide → tipi/clothing, sinew → cordage, bone → tools | Standard Plains-ethnography material-use inventory | Sourcebook digest Part 2.2 (SDSU library guide, Lewis & Clark project, Nebraska Studies — secondary, non-Lakota-authored web sources; flagged in the sourcebook digest itself as generic confirmation, not a Lakota-specific claim, used here only for the physical-object list, never for the distribution rule, which is the cited Lakota-specific mechanic above) |
| Trade network: Mandan/Hidatsa/Arikara hub, Assiniboine/Cree middlemen | A second, non-Lakota-specific material channel — garden produce and flint for meat/hides; horse-for-gun chains after contact | Sourcebook digest Part 2.4, corroborated Wikipedia/WyoHistory/NPS survey — standard academic material, framed in this doc as "the wider Plains system the Lakota traded into," kept distinct from the gift-economy mechanic above per §3's citation |
| Buffalo extermination as a scenario-ending mechanism, not a difficulty slider | The reservation-confinement scenario's resource collapse is specifically the removal of the buffalo as an entity-class from the hunt-cycle's substrate, not a generic "resources scarce" debuff | `buffalo-hunt-coordination.md` §"The buffalo-extermination as substrate-attack," read directly |

## 5. The horse as a technology epoch

Not a building-tier unlock — a **change in what the resource graph and the movement model even
are**, matching Dawn of Man's tech-age gating (catalog digest Part 4) rather than Impressions'
fixed-throughput buildings.

- **Dating.** Spanish-descended horses reach the northern Plains (Lakota/Crow/Cheyenne territory)
  roughly 1700–1750s; full mounted nomadism by the mid-1700s; the horse-culture epoch runs roughly
  1750s–1870s before Indian Wars/reservation confinement end it — Pekka Hämäläinen, "The Rise and
  Fall of Plains Indian Horse Cultures" (*Journal of American History*, 2003) and *The Comanche
  Empire* (Yale, 2008), per sourcebook digest Part 2.3. This is a non-Lakota-authored academic
  source used here only for the epoch's dating, not for any claim about Lakota interior experience
  of the transition.
- **The mechanical change.** Pre-horse, band mobility and hauling capacity are dog-travois limited —
  smaller loads, smaller camp moves, smaller sustainable tiyóšpaye size before fission becomes
  necessary. Post-horse, hauling capacity and travel range both increase substantially, which is
  the actual epoch-defining mechanic (not "faster movement" as a flat speed buff, but "how much of
  the band's material and how many members one camp move can carry" as a step change in the
  resource-graph's own capacity ceiling) — matching Dawn of Man's "tech ages gate the resource graph
  itself, not just building tiers" per the catalog digest. This specific *mechanical* framing (load
  capacity as the epoch's binding constraint) is this document's own design inference from the
  dating source above, not a claim traceable to a named source describing exact travois-vs-horse
  capacity numbers — flagged honestly as inference, not citation, and worth a real historical
  capacity figure being sourced before implementation.
- **Acquisition, not tech-tree research.** Consistent with §3's no-property/gift-economy framing,
  horses should enter the band's resource graph through the trade-network and gift-relation
  channels already modeled (§3, §4), not through an abstract "research points" currency the genre
  convention would otherwise suggest.

## 6. The winter count as chronicle / save metaphor

**Strong, well-documented, non-ceremonial-secret structural mechanic** — the sourcebook digest's own
assessment (Part 2.6), corroborated directly in `annual-cycle.md`'s winter-count
paragraph, which is where the mechanic is grounded for this document:

> "The winter-count (waniyetu-iyawapi) is the substrate-record-keeping mechanism for the annual
> cycle: each year's most-distinctive event is recorded as one named year-cell ... The winter-count
> is the polity's distributed-memory of its history — each waniyetu-iyawapi keeper holds a
> continuous record going back many generations." — `annual-cycle.md`, read directly.

Standard scholarly reference for the form: Candace S. Greene & Russell Thornton (eds.), *The Year
the Stars Fell: Lakota Winter Counts at the Smithsonian* (Smithsonian/Nebraska, 2007) — named as the
in-repo corpus's own primary citation and independently confirmed by the sourcebook digest's web
survey (Part 2.6) as the standard comprehensive reference; roughly 100 known Plains winter counts,
at least 14 Lakota examples held at the Smithsonian. Garrick Mallery's 1893 *Picture-Writing of the
American Indians* is the earliest scholarly treatment but is cited by the source material itself
with an explicit caveat about that period's colonial framing — carried here with the same caveat,
never as a standalone authority.

**Mechanic:** each completed year (one campaign "round," §0) produces exactly one winter-count
glyph, chosen — communally, in the source tradition; in-engine, algorithmically from the year's
actual recorded events — as that year's single most-distinctive event from the real intent log the
player generated (a hard winter with losses, a first horse acquired, a notable hunt, a scenario's
win/loss). This is not a cosmetic skin over a generic save slot: it is built as a structural
homage, credited by name in the game's own credits to Greene & Thornton and the winter-count
tradition, per the sourcebook digest's own recommendation (Part 2.6: "It should be built as a
structural homage to a documented form, credited by name ... not skinned invisibly"). A named
keeper role persists across scenarios within the campaign as the continuity metaphor for "this is
your save file" — mirroring the source's "keeper holds a continuous record going back many
generations," not narrated as ceremony, only as record-keeping structure.

## 7. Determinism / replay / cartridge fit

Grounded directly in `2026-08-19-note-on-cartridge-and-energy-bank-spec.md` (the interface spec), which every game in
the fleet already implements or targets. Seasonal Round fits the `Cartridge<State, Intent>`
interface without a new contract shape:

- **State** — the tiyóšpaye roster (members, kin-relations, standing owes-cells per §3), current
  season/year, camp location, material inventory by category (§4), tech-epoch flags (§5), the
  winter-count log (§6), and the active scenario's win/loss progress.
- **Intent kinds** — `{kind: "move-camp", to: siteId}`, `{kind: "discharge-obligation", owesCellId,
  action}`, `{kind: "hunt", herdId}`, `{kind: "gift", from, to, amount}`, `{kind: "trade", partner,
  offer}`, `{kind: "tiyospaye-fission", splitMembers}`, `{kind: "advance-season"}` — all pure data
  per the cartridge contract's requirement (§1.2 of the spec), applied by a pure `applyIntent(state,
  intent)`.
- **Events** — `SeasonAdvanced`, `HuntCompleted`, `GiftFlowed`, `WinterCountGlyphSelected`,
  `EpochAdvanced`, `ScenarioResolved` — the same "events are what a replay/verify step ... consumes"
  discipline the spec states for onestone's `CascadeStep` and weiqi's semantic annotator events.
- **Replay** — `defaultReplay(seed, intents)` reconstructs the full campaign from nothing but
  `(seed, IntentLog)`, exactly as the spec provides for any cartridge implementer; a
  `(seed, configId, IntentLog)` triple is a complete portable record of one playthrough, including
  its own winter count.
- **SeedPolicy** — the campaign mode uses `"client-supplied"` or `"on-demand"` (a chosen scenario,
  played at the player's pace); the daily-challenge mode (§8's counterpart, below) uses
  `"daily-utc"` — the spec's own `dailySeed(date, variantId)` pattern, named directly after
  solitaire's existing implementation.
- **Energy hooks** — optional per the spec's own discipline ("a game that never references
  energy-bank simply omits this key"). The campaign mode has no legitimate energy-bank binding: §3
  establishes the campaign has no bankable currency by design, so wiring it to the shared
  energy/credits ledger would misrepresent what the mechanic is. The **daily-challenge mode** may
  legitimately bind `EnergyHooks` for a satoshi-settled leaderboard the way ruinfold-daily does
  (`2026-08-19-note-on-gaming-enterprises-vision.md` §6), since a single bounded daily scenario has a natural
  score-comparable outcome (turns survived, obligations discharged) that a payout can key off —
  this is a real, disclosed difference between the two modes, not an oversight.

## 8. Daily-challenge mode (house daily-seed pattern)

Per the lineage brief ("Daily challenges: yes, house daily-seed pattern applies") and
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md`'s `SeedPolicy: {kind: "daily-utc"}`. One bounded scenario per
day, world-wide same seed: a single season or single year drawn from the campaign's own scenario
data (§2, §9's smallest-step scenario is itself the natural first daily challenge), scored on
obligations discharged and winter-count continuity rather than a hoarded-resource total (consistent
with §3's no-surplus constraint). Sits on the Today page alongside ruinfold's daily dungeon and
Crucible's daily tangle, per `2026-08-19-note-on-the-suite-and-the-studio.md` §2's "one 'today' page: today's ruinfold
dungeon, today's crucible tangle, today's weiqi problem."

## 9. Render approach on the house ladder

The task brief names "SVG-first render ladder with the legacy abrash raycaster ... and durante ...
as recovery candidates." Checked directly against `2026-08-19-note-on-gaming-estate-map.md`'s
own item 5: **"render ladder" is not an actual corpus term for a genre progression** — the map
document states this explicitly, distinguishing an SVG-first *rendering discipline* (proposed for
Crucible in `2026-08-19-note-on-gaming-enterprises-vision.md` §7) from the separate arnold→daleske/tsander→abrash
*render-substrate* dependency chain that durante (a first-person Quake-like) sits on. Stated
honestly rather than forced to fit: **Seasonal Round is a top-down/map game (camp sites, travel
routes, a seasonal-round map), not a first-person game, so it has no real dependency on the
abrash/durante raycaster lineage** — that substrate is FPS-shaped (grid position + facing, one ray
per screen column) and does not serve a camp-and-map interface. The render approach this design
actually calls for is the **SVG-first discipline** established for Crucible (`2026-08-19-note-on-gaming-enterprises-vision.md`
§7: "SVG-first presentation per the render ladder" — kept here despite the map document's naming
correction, since the discipline itself, not the "ladder" label, is what's real and reusable): a
map of named camp-sites and routes, seasonal color/weather treatment, and the winter-count strip
(§6) are all natural SVG content — vector shapes, no texture/3D pipeline needed, consistent with
Crucible's own render choice for a comparable top-down puzzle/board interface. This is a
correction to the task brief's framing, made because the honest answer is a better fit than forcing
the named substrate to apply.

## 10. Content pipeline: scenarios as data

Per the house discipline named directly in `2026-08-19-note-on-the-suite-and-the-studio.md` §2 ("the games stay
finished ... additions are content data, not code") and demonstrated by
`2026-08-19-note-on-cartridge-and-energy-bank-spec.md`'s `CartridgeConfig` shape (solitaire's `VARIANT_LIST`,
onestone's `LEVELS` — "a service may publish more than one manifest, or one manifest with a
`configs` slot"). A scenario is a data record, not a code branch:

```ts
interface ScenarioData {
  readonly id: string;                    // e.g. "lakota-pre-horse-01"
  readonly displayName: string;
  readonly epoch: string;                 // "pre-horse" | "horse" | "treaty" | "confinement" | "reclamation"
  readonly startingSeason: Season;
  readonly startingYear: number;
  readonly startingRoster: TiyospayeSeed;
  readonly campSites: readonly CampSite[];  // named locations + travel costs between them
  readonly techBaseline: TechFlags;         // horse present/absent, etc. — see §5
  readonly winCondition: WinCondition;      // standing/continuity-shaped per §2, not a uniform template
  readonly citedMechanics: readonly string[]; // which §3-§6 mechanics this scenario activates
}
```

A future culture's campaign (per the lineage brief §1: "subsequent cultures' campaigns remain owner
decisions about scope and involvement") is new `ScenarioData` plus, where its own material chain
differs, new content-chain data — never a new engine. The engine's actual code (season
progression, owes-cell firing, hunt-cycle resolution, winter-count/chronicle selection, cartridge
replay) is culture-agnostic; every culturally-specific fact lives in scenario data with its own
citation, exactly as §4's table requires per-mechanic. This is also the honest-absence boundary's
enforcement point (§11): a scenario file with an uncited cultural mechanic is a scenario file that
should not ship, and a content-authoring checklist (not yet built — flagged as debt in §11) should
check for citations the same way this document does.

## 11. Load-bearing vs. flavor disclosure

Per `2026-08-19-note-on-house-specification-standard.md` §13/§14's required disclosure convention.

**Load-bearing (real mechanics, cited, enforced in engine logic):**

- Seasonal subsistence windows and the four-season structure (`annual-cycle.md`) — determines what
  intents are even legal in a given season.
- Tiyóšpaye/oyáte/Oceti Šakówiŋ scale and fission (`tiyospaye.md`) — a real state transition, not
  cosmetic grouping.
- The buffalo hunt's full governed cycle including automatic akicita-revocation
  (`buffalo-hunt-coordination.md`) — the hunt intent's state machine is this cycle, not a generic
  "gather resource" action.
- No-surplus/no-property economy (`no-surplus-cell-firing.md`) — enforced by *not implementing* a
  bankable-currency field in `State` at all; this is a refusal, checkable by its absence from the
  schema, not a policy statement.
- Kin-obligation firing as the labor-allocation system (`kin-obligation-firing.md`) — owes-cells are
  real `State` fields with real discharge intents, not a flavor label over a generic quest system.
- The winter-count chronicle mechanic (§6) — a real derived view over the actual `IntentLog`, not an
  authored narrative.

**Flavor / structural-only (named honestly, not simulated):**

- Sun-dance and other required-ceremony *content* — modeled only as a scheduling obligation that
  must occur or produce a recorded consequence at Bloketu; the ceremony's interior content is never
  staged, scripted, or generated (§12 point 1).
- Wakȟáŋ — trackable as a flag on a cell (a scenario or object may be marked wakȟáŋ-obligated); never
  narrated as felt sacredness (§12 point 2).
- Heyókha/vision-triggered obligations — referenced only as a scheduling fact ("this member's
  obligations renew under the thunder-presence"), per `annual-cycle.md`'s own spring entry, never as
  content to generate (§12 point 3).

**Explicitly not modeled — no mechanic in this design draws on it, and none should be added without
a citation:** the "Obsmetrologia = Lakotaean metaphysics" equivalence named in the sourcebook digest
Part 1.1. This design's use of the in-repo Lakota theory files (§3, §6) cites their *own stated
formalism* (named cells, named closure rules, already written that way by the corpus before this
document existed) — it is not, and should not be marketed as, evidence for or exercise of the
broader metaphysics-equals-mathematics claim, which per the sourcebook digest's own honesty ledger
(Part 3, point 6) has exactly one checker and no distributed verification. See §12 point 2 for why
this matters for this campaign specifically.

## 12. The honest-absence boundary

Stated plainly, per the sourcebook digest's own Part 3 and the standing house rule (lineage brief:
"no fabricated cultural content, real sources cited or gaps marked plainly as gaps ... the design
says absent rather than inventing"). **This game deliberately does not depict:**

1. **The content of the seven rites**, including the sun dance. The sourcebook's own wolakȟota
   survey states the tradition's ceremonial substrate is "only referenced, not read directly" even
   within the in-repo corpus itself. The game may model *that* a ceremony is due and *that*
   something follows from whether it occurs — never what happens inside it.
2. **Wakȟáŋ as lived or felt sacredness**, and by extension, **any claim that this game's
   mechanics are themselves a working instance of Lakota metaphysics.** The in-repo corpus's own
   caveat on its formal reading of wakȟáŋ applies with extra force to a shipped game: "the
   substrate-algebraic form is a tool, never the tradition." §11 states this as a refused framing,
   not merely an omitted feature.
3. **Vision content, dreams, and personal spiritual experience** — referenced only as scheduling
   triggers (§11), never generated or simulated as content.
4. **Anything sourced only through a non-Lakota mediator writing as if from inside the tradition**
   (Walker read raw rather than through DeMallie's editorial apparatus, Joseph Epes Brown's *The
   Sacred Pipe*, Mallery without its period-framing caveat) — usable only for structural facts
   through the same critical apparatus the corpus itself insists on, never for interior content.
5. **Anything without a named, checkable source.** Every mechanic in §3–§6 above traces to a file
   read directly or to a specifically named, dated source in the sourcebook digest. A
   future addition without a citation is a gap to be marked, not filled by inference — this is the
   same discipline §10's content pipeline is meant to enforce structurally, not just by convention.

**What the game legitimately can and does model**, restated from the sourcebook digest's own
closing framing (Part 3): seasonal-round movement and band fission/aggregation; the buffalo
material-chain economy including its governed hunt-cycle and gift-flow distribution; the horse-epoch
technology transition; trade-network connections to the Missouri River village hub and other Plains
nations; kinship-obligation as the resource/labor-allocation system; and the winter-count as the
literal chronicle mechanic. The historical arc — pre-horse → horse epoch → treaty/Black Hills loss →
reservation confinement/cadence-disruption → reclamation — structures the campaign's scenario
sequence honestly, per both the in-repo corpus and Nick Estes's independent scholarship, ending not
at defeat but at ongoing restoration.

## 13. Staircase placement + smallest real step

**Placement.** Per the catalog research digest (Part 3): the city builder is
"already the flagship — no ranking needed, just flagged as the one genre already moving," currently
at "full design brief exists ... zero code yet." This document is that design brief. It does not
yet appear as a line in `2026-08-19-note-on-gaming-enterprises-vision.md` §6's staircase table; that table should gain
a row once implementation begins, following the exact three-tier Now/Next/Then discipline
`2026-08-19-note-on-house-specification-standard.md`'s roadmap-appendix format requires (falsifiable claims, never a
vibe).

**Smallest real step.** Not a full year, not the horse epoch, not multiple tiyóšpaye. **One
tiyóšpaye, one season** — the pre-horse spring dispersal scenario (§2's epoch 1) reduced to its
smallest legal slice: spring only (`annual-cycle.md`'s Wíiyaȟpeyatuya-wí window), a single starting
tiyóšpaye with a small kin-obligation set, the move-camp and discharge-obligation intents only, no
hunt-cycle, no trade, no horse. This proves the two mechanics that make this design different from
a reskinned Impressions clone — the settlement actually moving (§1) and obligations discharging
without a currency or wage (§3) — before authoring a single full year, matching the same
"prove the mechanism in the smallest unit" discipline `2026-08-19-note-on-farstone-qbn-design.md` §6 and the Anvil
crawler design (`2026-08-19-note-on-revivals-anvil-obsidian-mystery.md`, "one room ... proves the determinism claim ...
before any dungeon content ... is authored") both already use in this fleet.

---

## Sources read directly for this document

- `2026-08-19-note-on-sierra-lucasarts-lineage.md`, `2026-08-19-note-on-gaming-enterprises-vision.md`, `2026-08-19-note-on-the-suite-and-the-studio.md`,
  `2026-08-19-note-on-cartridge-and-energy-bank-spec.md`, `2026-08-19-note-on-house-specification-standard.md` §13/§14,
  `2026-08-19-note-on-gaming-estate-map.md` (item 5, the render-ladder naming correction),
  `2026-08-19-note-on-revivals-anvil-obsidian-mystery.md`, `2026-08-19-note-on-farstone-qbn-design.md` (structure/convention reference) —
  all under `public-services-section/services/public-computer-services-section/services/public-computer-games-services-section/.../notes/`.
- `annual-cycle.md`, `buffalo-hunt-coordination.md`, `kin-obligation-firing.md`,
  `no-surplus-cell-firing.md`, `tiyospaye.md` — all under
  `science-services-section/services/philosophy-services-section/services/lakota-services-section/`,
  exact paths given inline at first citation of each.
- The Lakota campaign sourcebook digest and the Sierra/LucasArts catalog research digest, both
  compiled and supplied for this document (paths/authorship as stated in the task); their own
  Sources sections (Hämäläinen 2003/2008/2019, Greene & Thornton 2007, Ella Deloria 1944, Estes
  2019, and the secondary Plains-ethnography web survey for §4's generic material-object list) are
  inherited by reference rather than re-verified line by line, except where marked above as
  independently re-read.
