// definition — "Farstone — the off-season": a DESIGNED world authored in the tab DSL (a plain
// definition object `compile`/`loadWorld`/`lint` understand). This is NOT a generated map: it is a
// place with a premise, a cast with goals, and a central tension the engine's own systems
// (needs/mood/scarcity/the tick/intends) are meant to turn into stories WITHOUT any scripting.
//
// PREMISE. Sálstrond — "Farstone" on the charts — is a granite harbor island off a cold coast, in
// the lean season after the summer trade has gone. The fishery is failing: the inshore catch has
// thinned and the food the island can pull from its own waters no longer feeds everyone. Into that
// scarcity the engine drops its actors — a harbormaster, an innkeeper, a failing fisher, a council
// clerk sitting on a disputed permit, two fishers locked in a feud, a healer — each pursuing its
// most pressing need through a world that no longer has enough to go round.
//
// CENTRAL TENSION (designed to dramatize itself, not scripted):
//   1. SCARCE FOOD. The food resources (the clam flat, the smokehouse, the gull-egg ledge) carry
//      deliberately small `amount`s. The tick decays every actor's hunger; `decide` sends them to
//      the nearest food and DEPLETES it on use. When the flats run dry the actors who depend on
//      them go hungry, their mood drops, and the competition is real.
//   2. A DISPUTED PERMIT. `the-dredging-permit` is the ⊤ waiting to happen — Mireille the clerk
//      holds it `within-window`, and the two feuding fishers want opposite rulings on it.
//   3. A FEUD. Coilin and Brannaugh hold OPPOSED traits (hot-headed vs. cold; the permit would
//      help one boat and sink the other), so the social system reads them as rivals over the
//      scarce catch and the disputed dredging rights.
// Mood (needs + traits + contested-belief penalty), the commons (depleting resources), and the
// disputed permit are all the world's own machinery — this file only sets the initial conditions.
//
// The need-kinds the engine tracks are hunger / rest / recreation (see #needing); every food/rest/
// play resource `provides` one of `need:hunger` / `need:rest` / `need:recreation`. The map is
// fully connected and every exit is walkable both ways (the DSL writes the return automatically).

export default {
  // ── REGIONS — three biomed bands of the island, for flavor + the explorer's mental map ───────
  regions: [
    { id: "the-harbor-ward", name: "the Harbor Ward", biome: "coast",
      contains: ["harbor-quay", "the-fish-pier", "the-saltloft-inn", "the-market-row",
        "the-council-hall", "old-chapel", "the-boatyards"] },
    { id: "the-outer-shore", name: "the Outer Shore", biome: "shore",
      contains: ["lighthouse-point", "the-clam-flats", "gulls-ledge", "the-salt-marsh"] },
    { id: "the-upper-valley", name: "the Upper Valley", biome: "valley",
      contains: ["the-coast-road", "branning-farm", "the-high-pasture", "the-spring-house"] },
  ],

  // ── AREAS — ~15 designed places, each with character; exits wired both ways by the DSL ───────
  areas: [
    // Harbor Ward — the working waterfront and the town crammed above it.
    { id: "harbor-quay", name: "the Harbor Quay", biome: "coast", region: "the-harbor-ward",
      exits: { south: "the-fish-pier", north: "the-market-row", east: "the-boatyards", west: "lighthouse-point" } },
    { id: "the-fish-pier", name: "the Fish Pier", biome: "coast", region: "the-harbor-ward",
      exits: { north: "harbor-quay", east: "the-saltloft-inn" } },
    { id: "the-saltloft-inn", name: "the Saltloft Inn", biome: "coast", region: "the-harbor-ward",
      exits: { west: "the-fish-pier", north: "the-market-row" } },
    { id: "the-market-row", name: "Market Row", biome: "town", region: "the-harbor-ward",
      exits: { south: "harbor-quay", north: "the-council-hall", east: "old-chapel" } },
    { id: "the-council-hall", name: "the Council Hall", biome: "town", region: "the-harbor-ward",
      exits: { south: "the-market-row", up: "the-coast-road" } },
    { id: "old-chapel", name: "the Old Chapel", biome: "town", region: "the-harbor-ward",
      exits: { west: "the-market-row" } },
    { id: "the-boatyards", name: "the Boatyards", biome: "coast", region: "the-harbor-ward",
      exits: { west: "harbor-quay", south: "the-salt-marsh" } },

    // Outer Shore — the lean edges where the food still is, barely.
    { id: "lighthouse-point", name: "Lighthouse Point", biome: "shore", region: "the-outer-shore",
      exits: { east: "harbor-quay", south: "the-clam-flats" } },
    { id: "the-clam-flats", name: "the Clam Flats", biome: "shore", region: "the-outer-shore",
      exits: { north: "lighthouse-point", east: "gulls-ledge" } },
    { id: "gulls-ledge", name: "Gull's Ledge", biome: "shore", region: "the-outer-shore",
      exits: { west: "the-clam-flats" } },
    { id: "the-salt-marsh", name: "the Salt Marsh", biome: "marsh", region: "the-outer-shore",
      exits: { north: "the-boatyards" } },

    // Upper Valley — the farms above town, where rest and what little surplus there is live.
    { id: "the-coast-road", name: "the Coast Road", biome: "valley", region: "the-upper-valley",
      exits: { down: "the-council-hall", north: "branning-farm", west: "the-spring-house" } },
    { id: "branning-farm", name: "Branning Farm", biome: "valley", region: "the-upper-valley",
      exits: { south: "the-coast-road", north: "the-high-pasture" } },
    { id: "the-high-pasture", name: "the High Pasture", biome: "valley", region: "the-upper-valley",
      exits: { south: "branning-farm" } },
    { id: "the-spring-house", name: "the Spring House", biome: "valley", region: "the-upper-valley",
      exits: { east: "the-coast-road" } },
  ],

  // ── RESOURCES — food/rest/recreation, deliberately SCARCE so the systems compete over them ───
  // amounts are small on purpose: the clam flats and gull eggs run dry under sustained use, which
  // is the failing-fishery pressure that drives the hunger competition.
  resources: [
    // Food — thin, and getting thinner. Three sources, each modest.
    { id: "the-clam-bed", name: "the soft-shell clam bed", provides: "need:hunger",
      "located-in": "the-clam-flats", amount: 9 },
    { id: "the-gull-eggs", name: "the gull-egg ledge", provides: "need:hunger",
      "located-in": "gulls-ledge", amount: 5 },
    { id: "the-smokehouse-stock", name: "the smokehouse's last smoked fish", provides: "need:hunger",
      "located-in": "the-fish-pier", amount: 6 },
    { id: "the-farm-larder", name: "the Branning root-cellar", provides: "need:hunger",
      "located-in": "branning-farm", amount: 8 },
    // Rest — the inn's beds, a hayloft, a chapel pew.
    { id: "the-inn-beds", name: "the Saltloft's narrow beds", provides: "need:rest",
      "located-in": "the-saltloft-inn", amount: 20 },
    { id: "the-hayloft", name: "the Branning hayloft", provides: "need:rest",
      "located-in": "the-high-pasture", amount: 12 },
    // Recreation — the inn's hearth-talk, the chapel's quiet, the marsh birdsong.
    { id: "the-inn-hearth", name: "the Saltloft taproom", provides: "need:recreation",
      "located-in": "the-saltloft-inn", amount: 30 },
    { id: "the-chapel-quiet", name: "the chapel's quiet", provides: "need:recreation",
      "located-in": "old-chapel", amount: 30 },
  ],

  // ── NPCS — named cast with traits, needs, skills, homes, and intends-rules that give arcs ─────
  npcs: [
    // The harbormaster — tends the fog-bell (his intends reflex), keeper of the quay, level-headed.
    { id: "takeshi-aoki", name: "Takeshi Aoki, the harbormaster",
      home: "harbor-quay", "located-in": "harbor-quay",
      traits: ["steady", "dutiful"],
      needs: { hunger: 62, rest: 70, recreation: 55 },
      skills: ["seamanship", "bell-tending"],
      intends: [
        { when: { predicate: "ringing", object: "for-fog" }, do: { predicate: "tending", object: "the-fog-bell" } },
        { when: { predicate: "phase", object: "clam-bed-exposed" }, do: { predicate: "watching", object: "the-tide" } },
      ] },

    // The innkeeper — feeds and beds the town; cheerful, the social hub of the off-season.
    { id: "nessa-cawl", name: "Nessa Cawl, the innkeeper",
      home: "the-saltloft-inn", "located-in": "the-saltloft-inn",
      traits: ["cheerful", "generous"],
      needs: { hunger: 58, rest: 64, recreation: 72 },
      skills: ["cooking", "brewing"],
      intends: [
        { when: { predicate: "ringing", object: "for-fog" }, do: { predicate: "keeping", object: "the-hearth-lit" } },
      ] },

    // The FAILING FISHER — his catch is gone; anxious, hungry, the human face of the scarcity.
    { id: "old-fenwick", name: "Old Fenwick, whose nets come up empty",
      home: "the-fish-pier", "located-in": "the-fish-pier",
      traits: ["anxious", "stubborn"],
      needs: { hunger: 34, rest: 50, recreation: 40 },
      skills: ["fishing", "net-mending"],
      intends: [
        { when: { predicate: "phase", object: "clam-bed-exposed" }, do: { predicate: "digging", object: "for-clams" } },
      ] },

    // FEUD — Coilin (hot-headed) wants the dredging permit GRANTED to deepen his channel;
    // Brannaugh (cold) wants it DENIED — dredging would silt her clam ground. Opposed traits +
    // opposed stakes over the scarce catch = the rivalry the social system reads.
    { id: "coilin-vey", name: "Coilin Vey, of the deep-water boat",
      home: "the-boatyards", "located-in": "the-boatyards",
      traits: ["hot-headed", "ambitious"],
      needs: { hunger: 44, rest: 56, recreation: 48 },
      skills: ["fishing", "boatbuilding"],
      intends: [
        { when: { predicate: "within-window", object: "the-dredging" }, do: { predicate: "pressing-for", object: "the-permit" } },
      ] },
    { id: "brannaugh-ross", name: "Brannaugh Ross, of the clam ground",
      home: "the-clam-flats", "located-in": "the-clam-flats",
      traits: ["cold", "tenacious"],
      needs: { hunger: 46, rest: 58, recreation: 42 },
      skills: ["clamming", "haggling"],
      intends: [
        { when: { predicate: "within-window", object: "the-dredging" }, do: { predicate: "objecting-to", object: "the-permit" } },
      ] },

    // The COUNCIL CLERK — sits on the disputed permit; cautious, the bureaucratic fulcrum of the
    // tension. Her ruling (or failure to rule before the window closes) is the ⊤ in waiting.
    { id: "mireille-dax", name: "Mireille Dax, the council clerk",
      home: "the-council-hall", "located-in": "the-council-hall",
      traits: ["cautious", "exacting"],
      needs: { hunger: 60, rest: 66, recreation: 50 },
      skills: ["clerking", "law"],
      intends: [
        { when: { predicate: "ringing", object: "for-fog" }, do: { predicate: "filing", object: "the-day-book" } },
      ] },

    // The HEALER — tends the strained and the hungry; kind, the relief valve on the mood pressure.
    { id: "sister-edda", name: "Sister Edda, the chapel healer",
      home: "old-chapel", "located-in": "old-chapel",
      traits: ["kind", "patient"],
      needs: { hunger: 56, rest: 60, recreation: 64 },
      skills: ["healing", "herb-lore"],
      intends: [
        { when: { predicate: "phase", object: "clam-bed-exposed" }, do: { predicate: "gathering", object: "marsh-herbs" } },
      ] },

    // The FARMER up-valley — has the only surplus food (the root-cellar) and resents coming down
    // to a town that ignored the farms all summer; gruff, a second pole in the food competition.
    { id: "hale-branning", name: "Hale Branning, of the upper farm",
      home: "branning-farm", "located-in": "branning-farm",
      traits: ["gruff", "industrious"],
      needs: { hunger: 64, rest: 52, recreation: 46 },
      skills: ["farming", "herding"],
      intends: [] },

    // The lamp-keeper — alone at the point, an explorer's hook; taciturn, half off the social map.
    { id: "old-pell", name: "Old Pell, the lamp-keeper",
      home: "lighthouse-point", "located-in": "lighthouse-point",
      traits: ["solitary", "watchful"],
      needs: { hunger: 48, rest: 58, recreation: 30 },
      skills: ["lamp-keeping", "weather-reading"],
      intends: [
        { when: { predicate: "ringing", object: "for-fog" }, do: { predicate: "lighting", object: "the-lamp" } },
      ] },

    // A drifter who came on the last ferry and can't leave till spring — a wildcard, hungry and
    // bored, the kind of unsettled actor that turns scarcity into incident.
    { id: "the-drifter", name: "a drifter stranded for the season",
      home: "the-saltloft-inn", "located-in": "the-market-row",
      traits: ["restless", "sharp"],
      needs: { hunger: 30, rest: 44, recreation: 28 },
      skills: ["bargaining"],
      intends: [] },
  ],

  // ── ITEMS — material/quality, scattered as explorer/achiever flavor + the DISPUTED PERMIT ─────
  items: [
    // THE DISPUTED PERMIT — the ⊤-in-waiting at the heart of the tension. Mireille holds it
    // `within-window` (a positive assertion); the feud pulls it two opposite ways. The tick (or a
    // Director) filing `overdue`/a ruling against this standing cell drives it to the bilattice apex.
    { id: "the-dredging-permit", name: "the disputed dredging permit (App. 23)",
      material: "paper", quality: 50, "located-in": "the-council-hall" },
    // The bell the harbormaster tends — flavor + the target of his intends reflex.
    { id: "the-fog-bell", name: "the green harbor fog-bell", material: "bronze", quality: 70,
      "located-in": "harbor-quay" },
    { id: "a-clam-rake", name: "a salt-silvered clam rake", material: "iron", quality: 45,
      "located-in": "the-clam-flats" },
    { id: "fenwicks-nets", name: "Fenwick's empty herring nets", material: "hemp", quality: 30,
      "located-in": "the-fish-pier" },
    { id: "the-lamp-lens", name: "the lighthouse's cracked Fresnel lens", material: "glass", quality: 55,
      "located-in": "lighthouse-point" },
    { id: "a-smoking-rack", name: "the smokehouse's smoking rack", material: "oak", quality: 60,
      "located-in": "the-fish-pier" },
    { id: "the-day-book", name: "the council day-book", material: "leather", quality: 65,
      "located-in": "the-council-hall" },
    { id: "an-iron-kettle", name: "the Saltloft's iron kettle", material: "iron", quality: 50,
      "located-in": "the-saltloft-inn" },
  ],

  // ── RECIPES — two craftables the crafting system can read (DATA on their own entities) ────────
  recipes: [
    // Smoking fish — turns raw catch (a hunger source) into a keepable food; requires the rack.
    { id: "smoke-fish", name: "smoking a catch of fish",
      requires: [{ predicate: "material", object: "oak" }, { predicate: "provides", object: "need:hunger" }],
      yields: { id: "a-side-of-smoked-fish", cells: [
        { predicate: "kind", object: "item" },
        { predicate: "naming", object: "a side of smoked fish" },
        { predicate: "provides", object: "need:hunger" },
      ] } },
    // Mending a net — net-mending skill + hemp restores Fenwick's gear (an achiever/arc hook).
    { id: "mend-net", name: "mending a herring net",
      requires: [{ predicate: "skill:net-mending", object: "practiced" }, { predicate: "material", object: "hemp" }],
      yields: { id: "a-mended-net", cells: [
        { predicate: "kind", object: "item" },
        { predicate: "naming", object: "a mended herring net" },
        { predicate: "quality", object: 60 },
      ] } },
  ],
};
