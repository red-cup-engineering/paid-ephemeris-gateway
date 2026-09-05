# Biome of Farstone

Farstone sits in a **cool maritime climate band** on the eastern coastal shelf.
The living system is organized around one mountain (Mt. Farstone, 620 m) and its single watershed, which feeds the Farr River and the island's freshwater aquifer.
From granite bedrock up through six soil zones, seven vegetation communities run from krummholz summit to cultivated valley to salt marsh; a diverse fauna of mammals, migratory birds, and marine species lives across them; and the whole island breathes on a semidiurnal tide (2.6 m mean range, 3.4 m spring range) governed by Farston Harbor.

Two of the island's systems are explicitly *simulated* on the world clock and are documented here as world data: **weather** (a deterministic five-state Markov chain with dry-streak tracking for fire-watch) and **tides** (a simplified semidiurnal model).
Seasons turn at the astronomical equinoxes and solstices.

---

## Climate

A cool maritime band:

- **Mean annual temperature:** 8.4 °C
- **Frost-free period:** 150 days (early May to early October)
- **Mean annual precipitation:** 1,180 mm
- **Winds:** southwest in summer, northwest in winter
- **Storm exposure:** Atlantic frontal systems are dominant; occasional remnant tropical systems August–October
- **Tides:** semidiurnal — mean range **2.6 m**, spring range **3.4 m**

---

## Bedrock and soil zones

Farstone rests on **granite bedrock** with overlying alluvial and marine sediments.
Six distinct bedrock-soil zones partition the island:

| Zone | Bedrock / soil | Drainage | Character |
|------|----------------|----------|-----------|
| **Summit & Flanks** | Granite intrusive; thin acidic leaf-litter mor (podzol) | Rapid | Bare-rock fraction climbs above 500 m. |
| **The Ridge** | Granite + glacial till; thin acidic loam | Moderate | Forested SW shoulder; 200 m development limit. |
| **Farr Valley** | Granite under alluvium; deep silty alluvial loam | Well-drained on terraces, poor near river | Cleared farmland (~140 ha). |
| **Coastal Lowland** | Granite under marine sediment; sandy loam over clay | Moderate, some hardpan | Contains Farston Harbor. |
| **The Marsh** | Granite under peat & tidal mud; organic peat over saline mud | Tidal saturation | ~3 km² Spartina salt marsh. |
| **North Shore** | Granite + glacial till; thin gravelly loam | Rapid | Rural forest, intermittent streams. |

---

## Vegetation zones

Seven successional-state communities carpet the island:

1. **Summit & Upper Flanks** *(climax)* — krummholz spruce, subalpine fir, juniper, lichen.
  Bare rock dominates above 500 m.
2. **Mid-Flanks Forest** *(mid-to-late successional)* — red spruce, balsam fir, paper birch, red maple.
  Watershed of the municipal wells; logging restricted by ordinance; headwater streams originate here.
3. **Lower-Flanks Mixed Forest** *(mature mixed broadleaf-conifer)* — sugar maple, beech, yellow birch, eastern hemlock.
  Recreational trails; town watershed.
4. **Riparian Corridor** *(climax flood-adapted)* — red maple, silver maple, alder, fern understory.
  The 30 m Farr River buffer (well-field to tidewater); two Farr Valley dairies chronically non-compliant.
5. **Farr Valley Farmland** *(actively cultivated)* — hay, vegetable row crops, two small orchards. ~140 ha across 22 farmsteads.
6. **Coastal Scrub & Dune** *(naturalizing on disturbed sites)* — beach pea, beach plum, marsh elder, bayberry.
  Thin band along harbor and beaches.
7. **Salt Marsh** *(climax tidal)* — Spartina patens, Spartina alterniflora, salt-meadow rush.
  3 km², with the shellfish bed and the bird-rich tern colony.

The Mt. Farstone watershed forest was identified as **old-growth-with-disturbance** in a 2018 environmental survey and is logging-restricted by ordinance.

---

## The watershed system

A **single catchment** centered on Mt. Farstone:

- Snowmelt and rain on the upper flanks flow into headwater streams, then the **Farr River**.
- Mid-course, the river passes the **municipal well-field** — a fractured-granite aquifer tapped by three public wells north of town, serving 9,000+ residents.
- The river meets the sea at **Farston Harbor**.
  On outgoing tides its freshwater plume extends past the breakwater; that plume's extent sets shellfish-closure boundaries during heavy-rainfall events.
- **North-flank streams** drain to **The Marsh** (not the Farr River), producing its brackish tidal regime.
- **North Shore** drains via intermittent streams directly to the coast.

The aquifer is a **fractured-granite system** underlying the whole island; the municipal wells tap fracture zones aligned with the Farr River recharge zone.

### Water-quality thresholds (public health)

The city council adopted thresholds at or above state public-health minima for the public water supply:

| Parameter | Pass | Fail action |
|-----------|------|-------------|
| Total coliform | <1 CFU/100 mL | ≥1 → re-test within 24 h; boil-water advisory if confirmed |
| Free chlorine residual | 0.2–4.0 mg/L | outside → adjust treatment, re-test within 4 h |
| Turbidity | <0.3 NTU | ≥1.0 → identify cause, re-test within 12 h |
| pH | 6.5–8.5 | outside → adjust treatment, re-test within 12 h |
| Nitrate | <10 mg/L | ≥10 → do-not-drink advisory, investigate source |

Sampling: **daily** at the treatment plant, **weekly** at distribution points, **quarterly** at public hydrants, and after any main break, hydrant flushing, or contamination report.
If two inspectors file conflicting status on the same target within 24 h, the substrate produces a **contested value (⊤/TOP)**; the director has 24 h to resolve via re-inspection, and until then the target is treated as *fail* (precautionary principle).
This is the mechanism behind the live **Hydrant-23** dispute.

---

## Tides (simplified semidiurnal model)

The harbor breathes on a deterministic, replayable tide model recomputed each settling pass.
It reads mean-tide-range, spring-tide-range, tidal period (12.42 h default), lunar cycle (14.77 days default), and current time:

- Phase: **ϕ(T) = 2π·((T − T₀) mod P) / P**
- Lunar modulation: **L(d) = ½(R + (S − R)·|cos(2πd / 14.77)|)**
- Height: **Height = MSL + L(d)·cos(ϕ)**
- State: **rising | falling**, with next-high and next-low tide times computed each pass.

Defaults: 2.6 m mean, 3.4 m spring, 12.42 h period, 14.77-day lunar cycle.
(In the playable MUD reading, this is coarsened to 6 ticks rising / 6 ticks falling; at low water the marsh clam bed exposes.)

Derived harbor cells: `(farston-harbor, tide-state, rising|falling)`, `(farston-harbor, tide-height-m, x)`, `(farston-harbor, next-high-tide-at, t)`, `(farston-harbor, next-low-tide-at, t)`.

---

## Weather (deterministic Markov chain)

Weather rolls each world-hour via a **seed-based, season-conditioned, replayable Markov chain** over five states: **clear, cloudy, rain, storm, fog**.

- **Dry-streak tracking:** `dry-streak-days` increments by 1/24 per dry hour (clear or cloudy) and resets to 0 on rain or storm.
- The dry streak couples to **fire-watch** via a fire-watch-trigger rule (*forthcoming*) that reads `dry-streak-days` and the season to set a fire-danger base-rate.

Storms cascade into the human systems: the harbormaster issues a temporary harbor closure, the morning ferry sailing is cancelled or rescheduled, the library basement readies as an emergency shelter, and the Harbor Café extends hours for stranded passengers.

Derived cells: `(farstone, weather, X)` over [clear, cloudy, rain, storm, fog] and `(farstone, dry-streak-days, n)`.

---

## Seasons and growing season

Seasons turn at the **astronomical** equinoxes and solstices (period ~89–93 sim-days).
The current season drives:

- `growing-season-active` (boolean),
- ferry-schedule adjustments (winter reduced),
- shellfish-closure defaults,
- fire-watch base-rate,
- and other biome-coupled logic.

The next cycle-end is computed by projecting current-time forward to the next astronomical event.
Derived cells: `(farstone, season, X)` and `(farstone, growing-season-active, true|false)`.

---

## Wildlife

**Mammals:** white-tailed deer, raccoon, red fox, snowshoe hare, harbor seal (offshore), eastern coyote (occasional).

**Birds:** osprey (nesting at the harbor), bald eagle (winter), great blue heron (marsh), **common tern** (breeding colony at South Point — *state-listed*), warblers and thrushes (seasonal).

**Marine:** striped bass, lobster, blue mussel, **soft-shell clam** (marsh bed, summer closures), Atlantic herring (offshore).

**State protections:** the common-tern marsh colony is state-listed and regulates public access and no-build zones; the state shoreline-protection designation limits the city council's direct authority over The Marsh itself.

---

## The clam bed and its closure

The soft-shell clam bed in The Marsh **closes to harvest during summer warm spells** — a closure rule reads water-temperature and recent-rainfall cells and writes `(the-marsh, shellfish-closed, true|false)`, which the records clerk's office publishes.
During heavy-rainfall events the Farr River freshwater plume extent (past the breakwater) sets the closure boundary.

---

## Renewable resources (what actors draw on)

In the lived-in / MUD reading, the ecology surfaces as **need-providing resources** that deplete on use and (where ecology regen is enabled) regrow toward caps.
Each provides one of three need categories — `need:hunger`, `need:rest`, `need:recreation` — with an amount that depletes per use.

**Hunger (food):**

- the stew-pot (Saltloft Inn, amount 30)
- the clam-bed (fish-pier, amount 12)
- the marsh-clams (marsh, amount 20)
- the fishwives' fry (market row, amount 24)
- the ration-barrel (tutorial cove, amount 40)

**Rest:**

- the inn-beds (Saltloft, amount 24)
- the warming-bench (tutorial cove, amount 40)
- the almshouse-cots (almshouse, amount 20)

**Recreation:**

- the taproom (Saltloft Inn, amount 30)
- the guild-hearth (guild hall, amount 30)
- the chapel-quiet (chapel, amount 24)

Scarcity here is the engine of Farstone's stories: in the off-season, the failing fishery and small resource amounts mean that when a food source runs dry, the actors who lived off it go hungry, their mood drops, and competition becomes real.

---

## Open questions (biome)

- The **weather transition matrix** is referenced but not yet specified — the seasonal Markov values and state transitions are not in the archive.
- The **fire-watch-trigger** rule and fire-danger base-rate mechanics are forthcoming.
- The **summer water-temperature threshold** that triggers the shellfish closure is noted but not given a value.
- **Population dynamics** for the tern colony (spawn times, life cycle) and **clam bed productivity / harvest yield** are referenced as resources but not quantified.
- Detailed **parcel-level soil survey** records are out of scope until an arc needs them; the forestry / old-growth designation map is referenced but not detailed.
- Fish and shellfish **population cells** are currently absent (required when a biology-focused arc lands).
- Offshore rocks and shoals relevant to ferry routing remain undetailed.
