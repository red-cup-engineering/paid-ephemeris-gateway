# Farstone — the off-season

A **designed**, playable demo world for the `tab` engine, authored entirely in the engine's own DSL (`#dsl`).
Not a generated map — a *place*, with a premise, a named cast with goals, and a central tension that `tab`'s own systems (needs / mood / scarcity / the tick / `intends`) are built to turn into stories **without a line of scripting**.

```
examples/farstone-tale/
  definition.mjs   the world definition object (DSL format) — the world itself
  build.mjs        loads the definition into a target dir via #dsl loadWorld (CLI below)
  README.md        this design doc
tests/prove-demo-world.mjs   the standalone proof (lint-clean, connected, peopled, tense, live)
```

## The premise

Sálstrond — *Farstone* on the charts — is a granite harbor island off a cold coast, in the **lean season** after the summer trade has gone.
The inshore **fishery is failing**: the catch has thinned and the island can no longer feed everyone from its own waters.
The last ferry has sailed; nobody new is coming until spring.
Into that scarcity the engine drops its actors, each one pursuing its most pressing need through a world that no longer has enough to go round.

## The central tension (designed to dramatize itself — never scripted)

Three pressures sit on the world from tick zero.
The engine, not the author, plays them out:

1. **Scarce food (the failing fishery).** The hunger resources — the clam bed, the gull-egg ledge, the smokehouse's last smoked fish, the farm's root-cellar — carry deliberately *small* `amount`s.
  Every tick decays each actor's hunger; `decide` (utility-AI / GOAP) sends the hungriest to the nearest food and **depletes it on use**.
  When a flat runs dry the actors who lived off it go hungry, their **mood** drops (needs + trait modifiers + a contested-belief penalty), and the competition over what's left is real.
  (The commons regrows slowly via ecology, so scarcity is a *dynamic* — deplete vs. regrow — not a one-way drain.)
2. **A disputed permit (the ⊤ waiting to happen).** `the-dredging-permit` (App.
  23) sits in the Council Hall, held `within-window` by the clerk.
    Grant it and Coilin can dredge his deep-water channel; that same dredging silts Brannaugh's clam ground.
    A ruling against the standing `within-window` cell — or the window simply closing — drives the permit to the bilattice apex **⊤**: a contested fact the world *shows* rather than adjudicates away.
3. **A feud.** Coilin Vey (`hot-headed`, `ambitious`) and Brannaugh Ross (`cold`, `tenacious`) hold **opposed traits and opposed stakes** over the scarce catch and the dredging rights.
  The social system reads opposed traits + shared contested ground as rivalry.

Mood, the commons, and the disputed permit are all the world's **own machinery**.
`definition.mjs` only sets the initial conditions; the tick does the rest.

## The map (~15 designed areas, three biomed bands, every exit walkable both ways)

```
        THE UPPER VALLEY (the farms, rest, the only surplus)
        the-high-pasture ── branning-farm ── the-coast-road ── the-spring-house
                                                    │ (down)
        THE HARBOR WARD (town + working waterfront)  │
        the-council-hall ── the-market-row ── old-chapel
                                │
          the-boatyards ── harbor-quay ── the-fish-pier ── the-saltloft-inn
                  │              │
            the-salt-marsh   (west)
                               │
        THE OUTER SHORE (the lean edges where the food still is)
        lighthouse-point ── the-clam-flats ── gulls-ledge
```

The harbor, the fish-pier, the inn, the market, the council hall, the chapel, the boatyards; the lighthouse, the clam flats, the gull ledge, the salt marsh; the coast road up to the farm, the high pasture, the spring house.
The BFS connectivity check in the test proves you can walk anywhere from anywhere.

## The cast (10 NPCs — names, traits, needs, skills, homes, arcs)

| NPC | Role | Traits | Arc / `intends` |
|-----|------|--------|-----------------|
| **Takeshi Aoki** | harbormaster | steady, dutiful | tends the **fog-bell** when it rings; watches the tide on the exposed clam-bed |
| **Nessa Cawl** | innkeeper | cheerful, generous | keeps the **hearth lit** in fog — the social hub of the off-season |
| **Old Fenwick** | the failing fisher | anxious, stubborn | nets come up empty; **digs for clams** when the flat is exposed — the human face of the scarcity |
| **Coilin Vey** | deep-water fisher | hot-headed, ambitious | **presses for the permit** — wants the channel dredged (one half of the feud) |
| **Brannaugh Ross** | clam-ground fisher | cold, tenacious | **objects to the permit** — dredging would silt her ground (the other half) |
| **Mireille Dax** | council clerk | cautious, exacting | sits on the disputed permit; **files the day-book** — the bureaucratic fulcrum |
| **Sister Edda** | chapel healer | kind, patient | tends the strained; **gathers marsh-herbs** — the relief valve on mood pressure |
| **Hale Branning** | up-valley farmer | gruff, industrious | holds the only **surplus food** and resents the town — a second pole in the food fight |
| **Old Pell** | lamp-keeper | solitary, watchful | alone at the point; **lights the lamp** in fog — an explorer's hook, half off the social map |
| **the drifter** | stranded for the season | restless, sharp | can't leave till spring — a hungry, bored **wildcard** |

The starting needs are tuned so the **hungry** actors (Fenwick 34, the drifter 30, Coilin 44, Brannaugh 46) press on the food first — exactly the people the failing fishery hurts.

## The intended emergent stories

Nobody wrote these; the systems produce them from the initial conditions:

- **The flats run dry.** Fenwick, the drifter, and the two rivals all converge on the nearest food.
  `decide` depletes it on use; when the gull-egg ledge and clam bed empty faster than ecology regrows them, somebody goes hungry, their mood breaks, and the competition becomes the story.
- **The feud sharpens under scarcity.** Coilin and Brannaugh, hungry and opposed, both want the scarce catch *and* opposite rulings on the dredging — a rivalry the social system reads off their opposed traits and shared contested ground.
- **The permit goes ⊤.** When the dredging permit is ruled-against (or its window lapses) against the standing `within-window` cell, it settles to the contested apex — and every actor who holds a belief about it carries a contested-belief mood penalty.
  A disputed fact becomes a *value* in the world, not a bug.

## How to play it

```bash
# materialize the designed world into a directory
node examples/farstone-tale/build.mjs /tmp/farstone-tale
# optional: hang a little GENERATED breadth off the lighthouse for an Explorer to dig through
node examples/farstone-tale/build.mjs /tmp/farstone-tale --breadth 8

# then drive a session (see scripts/play.mjs / scripts/run.mjs in the package) with commands like:
#   look            describe the room, exits, occupants
#   n / s / e / w / up / down   walk the map
#   take <thing> / drop <thing>
# and advance the world with the tick (ticking) so the NPCs live between your turns.
```

`build.mjs` **lints** the definition and refuses to load if it isn't clean (the DSL contract).

## Which player type each hook serves (Bartle)

- **Explorers (♠).** A 15-area map across three biomes to walk and re-fold; the lamp-keeper alone at the point; `--breadth` generated rooms on the edge; the per-fiber Umwelt (two actors see the same harbor differently).
  The map *and the machinery* are the prize.
- **Achievers (♦).** Skills as closure (no level number): mend Fenwick's nets, smoke the catch (two **recipes** ship in the definition), keep the larder stocked.
  Progress is the fiber closing.
- **Socialisers (♥).** A named cast with relationships and stakes — the innkeeper's hearth, the healer, the **feud** to take a side in, the clerk to lobby.
  People with goals, not a chat lobby.
- **Killers (♣).** The feud and the disputed permit are the conflict surface; when combat lands, contested outcomes settle to **⊤** and are *recorded*, not silently overwritten — the honest material for consequence and governance.

## DSL gaps hit while authoring (feedback for EPIC F)

Dogfooding the DSL surfaced fields a *designed* world wants but the DSL can't yet express:

1. **No `describing` field.** Areas/items/npcs get a `naming` but no prose description; Farstone's hand-authored build (`examples/farstone/build-farstone.mjs`) `doing`s a `describing` cell directly.
  A designer authoring atmosphere has nowhere to put room/item flavor text.
2. **No relationships / feud as first-class data.** The feud is encoded *implicitly* via opposed traits; there's no `relationships` / `rivals` / `allies` field to state "Coilin feuds Brannaugh" directly, so the social tension depends on the reader inferring opposition from traits.
3. **No converse declaration for the ⊤-in-waiting.** The hand-authored permit calls `declareConverse(root, "permit-23", "within-window", "overdue")` so aging it past the window flips it to ⊤.
  The DSL can write `within-window` but **cannot declare its converse**, so a designed permit can't go contradictory under its own clock without out-of-band wiring.
4. **No `perceives` / Umwelt field on NPCs.** The hand-authored NPCs set a `perceives` list (what the actor can sense).
  The DSL emits no `perceives`, so authored NPCs rely on whatever the tick's default perception grants rather than a designed Umwelt.
5. **`intends` rules can't reference need/scarcity state.** A rule fires on a perceived `{predicate,object}` only; there's no way to author "when **hungry**, go to the boatyard" or a conditioned-on-mood reflex — goal-seeking is entirely the generic `decide`, so an NPC's *arc* is limited to the small `intends` reflex vocabulary plus the universal need-pursuit.
6. **Resources have no quality/regrow-rate field.** `amount` is the only knob; a designer can't say *how scarce* a thing regrows (ecology applies one global cap), so per-resource scarcity tuning (a slow ledge vs. a fast tide-flat) isn't authorable.

None block the demo — the world is lint-clean, connected, peopled, tense, and live — but each is a field a richer *designed* world would reach for.
