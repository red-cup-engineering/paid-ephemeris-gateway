---
title: Farstone QBN Design
description: "Design note testing whether Farstone's quality-based-narrative turn needs a new substrate, against the two real Farstone artifacts (the pyfars governance polity and the built tab/FizzOS MUD): verdict, core loop, content pipeline, qualities, prose-at-volume risk, staircase placement, and the cast."
date: 2026-08-19
keywords: ["gaming", "enterprises", "farstone", "qbn", "storylet", "design", "tab", "fizzos", "pyfars"]
---

# Farstone QBN Design

Prompted by the owner, 2026-08-19: "Which makes me wonder if that's not what Farstone shouldn't
turn into" — Farstone as a quality-based narrative (QBN) game in the register of *Sunless Sea* and
*Kingdom of Loathing*: text-forward, character state as named qualities, content as storylets
gated on and modifying qualities.

There are two real Farstone artifacts, not one. Naming them precisely, because the whole design
turns on the difference:

- **The pyfars polity** — an in-fiction municipality (Mayor Aliyah Reyes, Harbormaster Takeshi
  Aoki, city hall, a permit backlog) authored as markdown-plus-frontmatter governance records that
  a Python engine (`pyfars`) dispatches work against. Lives at
  `lib/legacy/2026-08-17-vps-561-group/_archive/code/pyfars/examples/farstone/`.
- **`@561-group/farstone`** — a *built* MUD: JavaScript game content riding the `tab` EAVT
  world-engine and the FizzOS MUD driver, servable today over HTTP/SSE and playable in a browser.
  Lives at `lib/legacy/2026-08-17-vps-561-group/_archive/from-content-source/apps/games/farstone/`.
  Its own README states the mechanic the owner is pointing at directly: *"Building Permit #23 ages
  under its own clock past its decision window and goes ⊤ on its own; nobody coded 'permits go
  bad,' the bilattice fold produced it."*

## Thesis verdict

**Partly true, and the part that's false matters more than the part that's true.** The MUD's
fold-produced ⊤-situations really are storylet-shaped — a quality settling to a value nobody
scripted, surfaced as content, is the actual mechanism, not a metaphor for it, and it is already
running in committed code (§1 below, with the receipts). But the pyfars records and the MUD world
are **not** two serializations of one town. They are two independently-implemented artifacts, in
two different languages, on two different engines, that share a common ancestor and were
deliberately **re-ported "for vibe not for specifics"** — the MUD's own `farstone/README.md` says
so in those words — which is provably true at the level of a single NPC's biography (§1) and
provably *not* true at the level of engine mechanics, permit numbering, or named cast (§1). A QBN
Farstone cannot compile both into one world; it has to pick a spine. The recommended spine, and
why, is in §6.

## 1. Are the fold-situations and the records actually storylets? (with receipts)

### 1a. The MUD: a quality settling to ⊤ nobody scripted

The seed-island world (`farstone/`, built by `build-farstone.mjs`) carries Building Permit #23 as
five EAVT rows, quoted verbatim from `farstone/permit-23.jsonl`:

```
{"e":"permit-23","a":"kind","v":"item","t":"seed:000106"}
{"e":"permit-23","a":"naming","v":"Building Permit #23","t":"seed:000107"}
{"e":"permit-23","a":"describing","v":"One of fourteen applications before Building & Safety; the charter requires a decision inside thirty days.","t":"seed:000108"}
{"e":"permit-23","a":"located-in","v":"downtown-farston","t":"seed:000109"}
{"e":"permit-23","a":"within-window","v":"building-permit","t":"seed:000110"}
{"e":"within-window","a":"has-converse","v":"overdue","t":"seed:000111"}
```

The last row is the whole mechanism: `within-window` is declared to have the converse
`overdue`. Nothing else is authored. The `farstone/README.md` explains what happens next: run the
world forward and *"Permit #23 ages; past tick 30 the world files `overdue`, and against its
standing `within-window` assertion the cell settles to ⊤."* That is a quality (`permit-23`'s
window-state) changing value as a pure function of elapsed world-time, with no storylet author
writing an `if (daysSincefiled > 30)` branch anywhere — the branch is a property of the bilattice
join (`⊤` = both `within-window` and its converse `overdue` are witnessed at once), triggered by
one `declareConverse` binding made once. This is genuinely the mechanism a QBN engine needs: **a
quality is a settled EAVT cell, and a storylet is a situation the fold makes visible.** The fog-bell
/ harbormaster pattern in the same world is the same shape at smaller grain — `takeshi-aoki.jsonl`
carries `{"a":"intends","v":{"when":{"predicate":"ringing","object":"for-fog"},"do":{"predicate":"tending","object":"the-fog-bell"}}}` — an NPC reflex keyed off a perceived quality-change, which is
exactly a KoL "an NPC does X when quality Y flips" hook, authored as one data row.

### 1b. pyfars: the *same convention*, authored a different way

pyfars encodes the identical "permit ages past a 30-day window into a violation" convention, but as
hand-written conditional logic rather than an emergent fold. From
`governance/duties/decide-permit-within-30-days.md`:

> *"An application whose `received-at` is more than 30 calendar days old without a decision record
> produces `(application, charter-bound-c5, jurisdictional-boundaries-violated) = T` and
> `(building-safety-director, charter-binding-violated, true) = T`."*

And a live instance of it, `work/tasks/municipal/decide-permit-application-2026-117.md`, filed
2026-06-22, **"27 of 30 days elapsed"** at time of authoring, with an explicit consequence: *"If a
decision is not filed by 2026-07-22, the substrate fires `(building-safety-director,
charter-binding-violated, true) = T`, the eligibility-by-charter-binding rule disqualifies the
office from new permits until any held application gets a decision."* pyfars's own closure-rule
records (`objects/tide-derivation.md`, `objects/opening-hours-derivation.md`) show it, too, runs on
a `reads` → `writes` cells-in/cells-out shape with a `fires-during: settling` cadence — structurally
the same *kind* of thing tab's closure engine does. So both engines are genuinely
closure-over-cells systems. The difference is where the trigger condition lives: tab's `T` above is
a **free consequence of the algebra** (declare one converse, get "ages into contradiction" for any
predicate with that shape, forever); pyfars's `T` is a **per-record authored consequent** (someone
had to write "more than 30 calendar days... produces `T`" into this specific duty file, and it only
fires for permits, because nobody wrote the analogous rule for anything else). Both are
storylet-shaped. Only one is free.

### 1c. The relationship between the two artifacts: shared lineage, not shared substrate

Proof of shared ancestry, quoted rather than inferred. The MUD's `farstone/` seed island names
eleven places by exact slug — `mt-farstone`, `the-ridge`, `downtown-farston`, `harbor-district`,
`farston-harbor`, `south-point-light`, `farr-river`, `farr-valley`, `north-shore`, `the-marsh`,
`marsh-end` (`farstone.jsonl`) — against pyfars's `governance/places/_index.md`, which names the
identical set: `farstone-island`, `mt-farstone`, `town-of-farston`, `downtown-farston`,
`harbor-district`, `marsh-end`, `the-ridge`, `farr-valley`, `north-shore`, `the-marsh`, `farr-river`,
`farston-harbor`, `south-point-light`. Eleven of eleven MUD place-slugs are pyfars place-slugs. And
at the level of a single character, the match is verbatim. The MUD's `takeshi-aoki.jsonl`:

> *"Thirty years on the water; lives aboard his sloop in the warm half of the year, a rented flat
> above the harbor café in winter."*

pyfars's `governance/agents/harbormaster-takeshi.md`:

> *"...thirty-plus-year career in commercial fishing before taking the office in 2023. Lives on a
> sailboat moored at the harbor in the warm half of the year, in a rented flat above
> [`harbor-cafe`]... in winter."*

That is not coincidence; the MUD's own README says exactly this happened: *"Farstone is ported, for
vibe not for specifics, from the prior Farstone in the tab archive... and from the PyFARS governance
Farstone under the predication-categories bucket."* But "for vibe not for specifics" is provably
true too: **Aliyah Reyes — pyfars's Mayor of Farston — does not appear anywhere in the MUD's named
cast.** The MUD's permit is `permit-23`, a *building* permit; the designed `farstone-tale/` world
(a third, separate MUD content-pack — see below) independently reinvents *"App. 23"* as **a
different permit** — `the-dredging-permit`, contested between two fishers, not Building & Safety.
pyfars's live permit instance is numbered `2026-117`, not 23, and concerns a rear-deck addition, not
a building generally. Three different "aging permit → contradiction" storylet-instances across the
corpus, none sharing an ID, all converging on the same 30-day-window convention independently. That
convergence — not a shared file — is the actual continuity between the artifacts.

**One correction worth flagging directly:** Aliyah Reyes is sometimes described as "clerk."
The current pyfars agent record (`governance/agents/aliyah-reyes.md`) makes her **Mayor of
Farston**, not the clerk — records-clerk duties belong to a separate office
(`governance/offices/records-clerk.md`, partly automated by `records-clerk-bot`). An earlier corpus
document, the 2026-05-09 friction report cited in §3, does call her *"an in-fiction Farston staffer
(the city clerk)"* — so the corpus's own internal continuity drifted between authoring passes. That
drift is itself a small, honest data point for §4: a hand-authored governance record has no engine
enforcing that "Aliyah Reyes is the clerk" and "Aliyah Reyes is the Mayor" can't both be true at
once across two files; an EAVT trace would hold that as a legible ⊤, not a silent inconsistency
found by a human three months later.

**Also, on the MUD side, "the world" is not singular.** `@561-group/farstone` ships *four* content
packs sharing one engine (`farstone/`, `farstone-harbor/`, `farstone-tale/`, `farstone-wild/`, all
enumerated in the top-level `games/farstone/README.md`), and only one of them —
`farstone-harbor/`, "quarrel on the quay" — is what `bin/farstone.mjs` actually serves today. It is
the dense, hand-authored ~30-room tutorial-plus-waterfront world, not the seed island that carries
Permit #23. So even inside the single MUD artifact, "the town" already means at least two different
things depending which content pack is loaded.

## 2. The core loop

**A KoL-style daily action budget is a good genre fit, but it is not the house's daily-seed pattern,
and treating them as the same thing would be a mistake.** The house convention, attested in
`2026-08-19-note-on-gaming-enterprises-vision.md`'s staircase table (*"ruinfold-daily — the shared daily ritual, one
seed, everyone, satoshi settlement"*) and in `2026-08-19-note-on-the-suite-and-the-studio.md`'s Today-page proposal
(*"today's ruinfold dungeon, today's crucible tangle... same seeds for everyone"*), is about
**content determinism**: one seed produces one board/situation-set that every player sees
identically, replay-verifiable. KoL's adventures/turns mechanic is about **per-player pacing**: a
personal, refilling resource spent across storylets, independent of what anyone else has. These are
orthogonal axes, and Farstone's engine already gives each one a natural home without conflating
them:

- **Daily seed → which situations are live.** Tide phase, weather, which permits are within-window
  vs. aging toward ⊤, which NPC routines are active (`farstone-harbor`'s `README.md`: *"Yorrick
  works his shop by day and drinks at the inn by night... where you find someone depends on the
  hour"*) — all of this is already clock-derived state in both artifacts (tab's `ticking`, pyfars's
  `world-clock` + cadence stack). A house daily seed should govern *today's* tide/weather/permit-
  docket, shared by every player, exactly like ruinfold's dungeon.
- **Action budget → a per-player quality, spent independently.** This is a new quality the engine
  doesn't have yet (needs/hunger/rest decay toward zero; an action budget refills toward a cap) but
  it composes cleanly on the existing substrate — it's one more functional cell (`you`'s
  `actions-remaining`), decremented by `doing`, refilled by a tick-boundary rule the same shape as
  `world-cadence-boundary-detection`.

Judged, not assumed: the genre needs scarcity to make a choice matter (Sunless Sea's fuel/supplies,
KoL's adventures are the same lever), and the engine already has the primitives (functional cells,
tick-gated writes) to build it cheaply. The mistake would be trying to make the *daily seed itself*
the action-budget mechanism — they should be two separate qualities, one shared, one personal.

**Browser vs. terminal — this is already decided, not a live question.** `bin/farstone.mjs`'s own
usage note reads *"Open `http://localhost:18793` in a browser to play"* — the MUD already defaults
to a browser-first HTTP/SSE transport. `wheatstone` is documented as *"the client half of the
561-group MUD stack"* — a terminal client, useful for the cast (agent players connecting the way a
person would telnet in) and for anyone who wants a MUD-native feel, but not the primary surface.
This matches the house vision verbatim (`2026-08-19-note-on-gaming-enterprises-vision.md`: *"all browser-based, with
terminal/API interfaces welcomed wherever they fit"*) — Farstone doesn't need a decision here, it
needs its existing default kept and its web client actually built out (today it's a bare HTTP/SSE
endpoint, not a QBN-shaped reading UI).

## 3. The content pipeline — the fiction-vs-deployable discriminator becomes the game's own gate

The boundary note (`2026-05-09-fictional-service-specs-vs-deployment-specs.md`) documents a real
bug: pyfars's `governance/specifications/services/pyfars-engine-farston.md` carried
`type: service-spec, status: active` while its content was pure in-fiction worldbuilding
(`host: farston-city-hall`, `authored-by: [aliyah-reyes]`) — *"The harness has no way to distinguish
'in-fiction service-spec the polity narrates as part of its world' from 'real service-spec
describing how this polity wants to be supervised.'"* The two fixes proposed there — status-based
(`status: sketch`/`fiction` skips the harness) or path-based (fictional content moves under its own
subtree) — were framed as an ops-harness problem to *avoid*.

**For a QBN Farstone, this is not a bug to route around — it is the compiler's actual selection
rule.** A game content-pipeline walking pyfars's `governance/` tree needs precisely this
discriminator, inverted: skip `type: service-spec` + `status: active` (that's infrastructure, not
content); compile everything else in `governance/{places,persons,citizens,agents,offices,duties,
skills}` plus `objects/*-derivation.md` closure-rule records into world content, because that's
already game-shaped — a `place` record IS a room, an `agent`/`citizen` record IS an NPC, a `duty`
record with a `triggering-powers` list IS a storylet's available-actions set, a
`closure-rule-record`'s `reads`/`writes` frontmatter IS already an EAVT-shaped cells-in/cells-out
contract (`tide-derivation.md`: `reads: [{subject: world-clock, predicate: current-time}, ...]`,
`writes: [{subject: farston-harbor, predicate: tide-height-m, domain: real}]`) that a tab/FizzOS
importer could translate almost mechanically into a functional predicate + closure rule.

`lantern-service`'s compiler (`src/compile.mts`, `src/frontmatter.mts`) is the closest thing the
house already has to this pipeline, and it generalizes **partially, honestly**. What ports directly:
the *shape*-rule door-extraction pattern — *"Any frontmatter key whose value is a string or array of
strings that resolves to another file in the same wing... becomes a hard door... The compiler never
hard-codes weiqi's field names"* (`DESIGN.md` §1) — is exactly the right approach for pyfars's
`contained-in`, `reports-to`, `active-holder`/`passive-party`, `serves` fields, none of which
Lantern has ever seen and none of which it needs to be told about by name. The FCA Hall-extraction
(§1, a *genuine* closed-concept lattice over a small declared attribute field set) is a legitimate
way to auto-cluster, say, every place/agent that `cites` the same charter section into a
storylet-deck. What does **not** port: Lantern has no tick, no NPC agency, no notion of a world that
changes state on its own between visits — its whole model is a static corpus a *player's memory*
decays against (the FSRS light-cone), never a *world* that decays or ages on its own. The runtime
half of a QBN Farstone — the part that actually settles `overdue`, walks NPC routines, and ticks the
tide — has to come from tab/FizzOS, not from Lantern. Lantern lends the compiler; it cannot lend the
engine.

## 4. Qualities design, grounded in what the trace actually tracks

Real cells already committed in the corpus, not invented for this note, quoted from
`farstone-harbor/world/you.jsonl` and the definitions behind them:

| kind of quality | evidence in the corpus | genre analog |
|---|---|---|
| **append-only trained stat** | `skill:fighting.melee.knife` appears as four separate witness rows ("taught ×4" per the README) before it reads as a numeric bonus | KoL's Muscle/Mysticality/Moxie — a quality that accumulates from repeated witnessed events, not a single overwrite |
| **decaying need** | `need:hunger`/`need:rest`/`need:recreation`, decremented every tick, restored by `provides`-tagged resources (`the-stew-pot`, `the-inn-beds`) | Sunless Sea's Supplies/Terror — a resource that runs down and gates what you can still do |
| **derived, not stored** | *"Your **title** is read off your governing-skill bonus — it rises as you train, no separate promotion"* (`farstone-harbor/README.md`) | Fallen London's status qualities that are pure projections of an underlying stat, never separately tracked — a real design lesson already learned here |
| **contested / ⊤-legal** | `within-window` × `overdue` on `permit-23`; pyfars's `charter-bound-c5` / `charter-binding-violated` | a quality the game is allowed to show as *both* true and false at once, and dramatize the contradiction rather than resolve it — this is the genre's "Notability"-shaped anomaly, and it's the one mechanic this substrate does better than a conventional flag-based engine |
| **relational** | `opinion-of` (Dax Pell / Mara Quill flagged `rival` of each other); pyfars's `jural-relations/` (`active-holder`/`passive-party` duty pairs) | Fallen London's "Connected: X" qualities — social state between two named entities, not a single actor's stat |
| **world-clock-derived** | pyfars's `tide-height-m`, `tide-state`, `open-now` — pure functions of `world-clock` + biome constants, recomputed each settle | Sunless Sea's weather/zee-state — ambient world quality nobody spends, but everyone reads |

The design implication: don't invent a quality taxonomy from genre conventions first and then hunt
for substrate to back it — the trace already sorts into these six families, and a QBN Farstone's
quality schema should be *read off* the union of what both artifacts already track, not designed
from scratch.

## 5. What the genre needs that the house lacks — prose at volume

Say this plainly: **agent-authored prose at Failbetter quality, at the volume the genre requires, is
not a solved problem here — it is the real risk, and the corpus itself already flags it.** The
evidence cuts both ways and both readings are honest.

The prose that exists is genuinely good at small scale. `farstone-harbor/definition.mjs` room
descriptions read like real published QBN copy — *"Granite cobbles slick with spray, bollards green
with verdigris, the fleet riding at their lines. The off-season has emptied the quay of everyone but
those who have nowhere warmer to be"* — economical, atmospheric, thematically disciplined across
~30 rooms and a dozen-plus named NPCs. That's real evidence agent-authored prose can hit a strong
register.

But volume and *branching* are the actual bar, and neither is demonstrated anywhere in this corpus.
Every world here — `farstone/`, `farstone-harbor/`, `farstone-tale/`, pyfars's governance tree — is
a single-pass authored vignette: tens of rooms, a dozen NPCs, one description each. A real QBN
storylet typically carries 500–2000 words spread across three to six branch-outcomes for a *single*
situation, times hundreds of situations (Fallen London ships on the order of a million-plus words).
Nothing in either Farstone artifact has ever been authored at that shape — variant text per
quality-gate, degrading gracefully across dozens of possible player states for the same room. The
engine's own designers already noticed the gap from the inside: `farstone-tale/README.md`'s "DSL
gaps hit while authoring" section states outright, *"No `describing` field. Areas/items/npcs get a
`naming` but no prose description... A designer authoring atmosphere has nowhere to put room/item
flavor text"* — the authoring *tool* under-serves prose today, not just the corpus. So: not solved.
The specific, nameable risk is **prose at 50–100x the volume seen here, with quality-gated
variation, sustained across many authoring sessions without voice drift** — none of which this
corpus has attempted yet, however good its small samples are.

## 6. Staircase placement + the smallest real step

Farstone does not currently appear anywhere on the staircase in `2026-08-19-note-on-gaming-enterprises-vision.md`'s §6
table (now: weiqi/TileSlots/solitaire/flickering-delve, ruinfold-daily, Lantern/Equivo; next:
idle+gambling, energy-tiling; then: the undersea MUD, the Commons). Its natural shelf-slot is named
explicitly in `2026-08-19-note-on-the-suite-and-the-studio.md`'s shelf table: **The Deep** — *"ruinfold daily, later the
undersea MUD and the Commons — the MUD/BBS door-games lineage."* Farstone-the-MUD is arguably ahead
of "the undersea cooperative MUD (SHRIMP ecology)" on that shelf already, in the specific sense that
its engine exists, is tested, and can be run today — but that claim needs the sober correction below
before it's a real staircase step and not a false head start.

**Sober judgment on reviving the legacy MUD vs. the active FizzOS: it is a port, not a restart, and
should be planned as one.** `bin/farstone.mjs` imports `@561-group/tab/scripts/web.mjs` and the game
content is built against the *old* fizzos lineage — the top-level MUD README lists its dependencies
as `@561-group/tab`, `@561-group/fizzos`, `@561-group/computer` (the tab/EAVT-riding generation).
The **active** fizzos, at
`services/computer-mud-services-section/apps/fizzos` (60 passed, 0 failed per its own
`content/verification-report.md`, confirmed by reading `package.json`'s `test` script and the report
together), has exactly **one** runtime dependency: `@lenticule-science/metrologic`. It does not import `tab` at
all — its own README states *"The current runtime does not import [retired implementations] and has
no build step... Retired implementations remain as read-only evidence in `lib/legacy`."* Reading
`src/world.mjs` confirms the *mechanism* survives in spirit — it still keeps an immutable
`assertions` trace, subject/predicate/object cells, and a `joinKnowledge` fold documented as
settling *"a subject's trace without destroying contradictory evidence"* — but the *API surface* the
old Farstone game was written against (`being`, `doing`, `declareConverse`, tab's `.jsonl` EAVT rows,
tab's DSL `compile`/`loadWorld`/`lint`) is retired and not what the current fizzos exports. Per this
corpus's own stated doctrine on absence (an old symbol going missing is a design judgment that the
old shape was wrong, and the fix is to find the new core primitive it collapsed into, not to
resurrect the old one) — the correct move is **not** `npm install`-ing the legacy game onto the
legacy fizzos and calling it revived. It is:

1. Treat the legacy MUD (`farstone/`, `farstone-harbor/`, `farstone-tale/`) as **design reference and
   content well only** — the room prose, the NPC bios, the permit-storylet pattern, the needs/mood
   loop are all worth mining verbatim.
2. Treat pyfars's `governance/` tree the same way — a second, larger content well (place records,
   citizen bios, the 30-day-permit convention, the "recent issues" list in `_index.md`: Hydrant-23,
   the permit backlog, the FY2026 budget, the Elm Street pothole — four ready-made storylet seeds
   nobody has to invent).
3. Build the actual game as new content authored **against the current fizzos's real module
   surface** (`world.mjs`, `engine.mjs`, `npc.mjs`, `predication.mjs`, `world-clock.mjs`,
   `ecology.mjs`, `skills.mjs`, `social.mjs`) — which already has the assertions-trace-plus-FOUR-join
   kernel the whole thesis depends on, just not under the `tab` names.

**The smallest real step**, concretely: pick one storylet — Permit #23's ages-into-⊤ arc is the
obvious candidate, since it's the one piece of content proven twice, in two engines, by two
different authoring passes — and re-author it as three or four cells against current fizzos's
`predication.mjs`/`world-clock.mjs` (a `within-window` predicate, its declared converse, and one
tick-boundary rule), render it through a bare page reading the assertions trace, and confirm it
settles to a visibly-contradictory state on its own after N ticks with zero hand-written "if overdue"
branch. That is the entire thesis, proven in the smallest possible unit, on the engine that's
actually alive.

## 7. The cast — NPCs as records/trace-entities

This may be the genre where cast-as-real-agents lands most naturally in the whole catalog, and the
evidence for that claim is concrete, not aspirational. A Farstone NPC is *already*, in both
artifacts, nothing but a record the engine reads and a trace of what it has done:
`takeshi-aoki.jsonl`'s `intends` cell (*when ringing-for-fog, do tending-the-fog-bell*) is
indistinguishable in shape from an agent player's own decision loop — a perceived-state-to-action
mapping, executed by the same tick that executes a human's typed command. `harbormaster.jsonl`'s
tick rows (`need:hunger` ticking down, `located-in` changing as the NPC walks its route) are the same
`{subject, predicate, object, source}` shape the cast's own intent logs would be. pyfars's
`agents/*.md` records — `serves`, `provides-skill`, `duties`, `jurisdiction`, `pulses-on` — are
already written in exactly the schema a cast member's persona sheet would need (a name, a role, a
skill set, a cadence to act on). `2026-08-19-note-on-the-suite-and-the-studio.md`'s framing of the cast — *"named
recurring agent players who actually play, by the same intent-log API as humans... the cast exists
somewhere — the Semioverse is their green room"* — describes precisely what a Farstone NPC record
already structurally is, minus only a live loop. Concretely: Takeshi Aoki, Dax Pell, Mara Quill,
Yorrick Vane and the rest don't need new persona infrastructure to become cast-playable; they need
the existing `intends`/needs/routine records promoted from tick-scripted reflexes to an actual agent
process reading the same perceived-state and writing the same action shape a human's client would.
The town's records were peer-shaped before the cast concept existed to name them that.

## 8. Load-bearing vs. flavor

Following the house disclosure convention (`lantern-service/DESIGN.md`, extended by
`2026-08-19-note-on-house-specification-standard.md`):

1. **Real, cited, checked against source, not invented for this note**: every quoted row of
   `permit-23.jsonl`, `takeshi-aoki.jsonl`, the `farstone-harbor/README.md` combat/systems
   inventory, pyfars's duty/workitem/closure-rule records, the fizzos verification-report numbers
   (60/60), and the place-slug overlap table in §1c — all read directly from the files named, not
   summarized from memory or from an earlier description of them.
2. **Real mechanism, honestly scoped**: the claim that the current fizzos retains the
   assertions-trace-plus-Belnap-FOUR kernel is grounded in reading `src/world.mjs` directly (the
   `assertions`, `joinKnowledge`, and settle-without-destroying-contradictory-evidence code is real);
   the claim that it is *not* the tab EAVT API is equally grounded (its `package.json` names exactly
   one dependency, `@lenticule-science/metrologic`). Neither claim is inferred from README prose alone.
2a. **Flavor, named as such**: the "which house shelf Farstone belongs on" framing (§6) and the
   "prose at 50–100x volume" multiplier (§5) are this note's own estimate, calibrated against
   Fallen London's known approximate word count and the corpus's measured room-description length —
   a reasoned order-of-magnitude, not a measured fact about this specific game's future needs.
3. **Speculative, marked as such**: §4's "derived-not-stored title" pattern being *the* right shape
   for all future status qualities is a design recommendation, not a demonstrated property of the
   engine beyond the one title/skill-bonus example quoted; §7's claim that NPC records are
   "cast-ready" describes a structural resemblance the author verified in the data, not a working
   integration — no agent currently drives a Farstone NPC's `intends` cell, and building that loop is
   unstarted work, not a discovered fact.
4. **Genuinely uncertain, flagged rather than resolved**: whether pyfars's Python/markdown-cells
   engine and tab/FizzOS's JS/EAVT engine *should* eventually converge on one substrate (the owner's
   original phrasing implies they might) is outside this note's scope to answer — §1 establishes only
   that they are not the same substrate *today*, not that they never should be.

## §6's "smallest real step" already exists, as a third generation

A build exists at `gaming-services-section/services/farstone-services-section`, specifically
`sites/farstone.emsenn.net` — see [the buried-games revival log](logs/2026-08-19-buried-games-revival-log.md)
for its recovery and deploy status. It is not the legacy MUD (`farstone`/`farstone-harbor`/
`farstone-tale`, tab/old-fizzos) and it is not pyfars — it is a **third, current generation**,
authored directly against `@red-cup-engineering/fizzos`'s real module surface, with **no tab import
and no legacy adapter**: its own README states "There is no Farstone scene subclass or legacy
adapter. Player commands enter the ordered FizzOS engine, capability ticks reduce to immutable world
assertions." That is precisely the shape §6 recommends (point 3: "build the actual game as new
content authored against the current fizzos's real module surface").

This does not settle the design questions §1–§8 raise (the QBN storylet layer, the prose-at-volume
risk, the pyfars/MUD content-well plan) — none of that content has been authored onto this engine
yet. What it does settle is §6's own open question about *which* engine a QBN Farstone should be
authored against: this build is the proof that authoring directly on current fizzos, without a
tab/legacy adapter, is not just recommended but already working, tested, and playable.
