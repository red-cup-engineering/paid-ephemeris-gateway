// definition — "Farstone Harbor — quarrel on the quay": a LARGE, hand-authored demo world authored
// in the tab DSL (the plain object `compile`/`loadWorld`/`lint` understand). It is built for a
// player who connects and wants the ORDINARY MUD experience immediately — but now ALSO for a raw
// newcomer who has never played a MUD, who lands first in a calm, self-contained TUTORIAL zone (in
// the spirit of Discworld MUD's Pumpkin Town) and learns the verbs before stepping into the harbour.
//
// PLACE. Farston Harbor is the working waterfront of Farstone, a granite New-England island. It is
// the lean off-season: the summer trade has gone, the fleet is half-tied-up, and tempers on the
// quay are short. A newcomer arrives by the mainland ferry and steps ashore onto the NEWCOMER
// LANDING — a sheltered tutorial cove with a guide, readable signposts, and a harmless practice
// dummy — then follows a short guided path up through the Warden's Walk and the Lower Lane into the
// working harbour itself, which has grown from a compact loop into a whole walkable town: the quay
// and its piers, market streets, a tavern interior, a chapel, a guild hall, the lighthouse interior,
// the salt-marsh and the fishing boats, and the open road out to the granite quarry and the moor.
//
// THE CAST AT THE HARBOUR. The Harbor Quay holds TWO named people standing close enough to come to
// blows: Dax Pell, a hot-headed deckhand spoiling for a fight, and Sergeant Mara Quill, the harbor
// constable who keeps the peace. Both carry full needs, distinct traits, and (via the build script)
// a NUMERIC `skill:combat`. Around them now lives a far larger cast — shopkeepers, a priest, a
// guild-master, fishwives, a quarryman, a marsh-witch — each with needs, traits, and (for several)
// skills, gear, and daily routines the build script layers on.
//
// The need-kinds the engine tracks are hunger / rest / recreation (see #needing); each food/rest/
// play resource `provides` one of `need:hunger` / `need:rest` / `need:recreation`. Every exit is
// written both ways by the DSL, so the whole map is walkable in either direction.

export default {
  // ── REGIONS — bands of the island, for flavour and the explorer's mental map ──────────────────
  regions: [
    { id: "the-newcomer-cove", name: "the Newcomer's Cove", biome: "shore",
      contains: ["newcomer-landing", "the-wardens-walk", "the-lower-lane", "the-tutorial-yard"] },
    { id: "the-waterfront", name: "the Waterfront", biome: "coast",
      contains: ["harbor-quay", "the-fish-pier", "the-chandlery", "the-saltloft-inn",
        "the-market-row", "the-fishwives-stalls", "the-counting-house"] },
    { id: "the-outer-harbor", name: "the Outer Harbor", biome: "shore",
      contains: ["the-boatyard", "the-ferry-slip", "the-breakwater", "the-fishing-boats",
        "the-lighthouse-foot", "the-lighthouse-stair"] },
    { id: "the-old-town", name: "the Old Town", biome: "town",
      contains: ["the-chapel-of-maraset", "the-watch-house", "the-mariners-guild",
        "the-smithy", "the-high-street", "the-almshouse"] },
    { id: "the-hinterland", name: "the Hinterland", biome: "moor",
      contains: ["the-marsh", "the-quarry-road", "the-granite-quarry", "the-moor-gate", "the-witchs-hut"] },
  ],

  // ── AREAS ─────────────────────────────────────────────────────────────────────────────────────
  areas: [
    // ===== TUTORIAL ZONE — the Newcomer's Cove. START = newcomer-landing ========================
    // The ferry deck where new arrivals step ashore. Calm, sheltered, nothing here will hurt you.
    { id: "newcomer-landing", name: "the Newcomer's Landing", biome: "shore", region: "the-newcomer-cove",
      describing: "A sheltered timber landing in the lee of the headland, where the mainland ferry sets down those new to Farstone. The water is flat and grey, the air still. A weathered warden waits by a row of painted signboards, and a straw practice-dummy leans on a post. A path leads UP toward the warden's walk; the way is marked and safe.",
      exits: { up: "the-wardens-walk" } },

    { id: "the-wardens-walk", name: "the Warden's Walk", biome: "shore", region: "the-newcomer-cove",
      describing: "A planked walk climbing the headland from the landing, hand-rope on the seaward side. Notices are nailed to the rail at a reader's height — the warden's way of teaching the ropes to anyone who stops to look. DOWN returns to the landing; the walk goes on UP to a small training yard.",
      exits: { up: "the-tutorial-yard" } },

    { id: "the-tutorial-yard", name: "the Training Yard", biome: "shore", region: "the-newcomer-cove",
      describing: "A flat patch of trodden earth behind the warden's hut, fenced with old netting. A sand-filled practice-post stands at its centre, and a small lean-to shop sells a newcomer's first kit at a copper or two. A board explains how trade and combat work. The yard opens NORTH onto the lower lane.",
      exits: { north: "the-lower-lane" } },

    { id: "the-lower-lane", name: "the Lower Lane", biome: "town", region: "the-newcomer-cove",
      describing: "A cobbled lane where the newcomer's cove gives way to the working town. The shelter of the headland falls behind; ahead the smell of fish and tar and the noise of the quay carry up on the wind. A last notice points the way. The lane runs DOWN onto the harbour quay — the real Farstone begins there.",
      exits: { down: "harbor-quay" } },

    // ===== THE WORKING HARBOUR ===================================================================
    // The hub. The original quarrel-on-the-quay still plays out here; now the town spreads from it.
    { id: "harbor-quay", name: "the Harbor Quay", biome: "coast", region: "the-waterfront",
      describing: "Granite cobbles slick with spray, bollards green with verdigris, the fleet riding at their lines. The off-season has emptied the quay of everyone but those who have nowhere warmer to be. The town climbs UP the lower lane behind you; piers and shops open on every side.",
      exits: { south: "the-fish-pier", north: "the-saltloft-inn", east: "the-chandlery", west: "the-ferry-slip", up: "the-lower-lane" } },

    { id: "the-fish-pier", name: "the Fish Pier", biome: "coast", region: "the-waterfront",
      describing: "A long plank pier reeking of the last catch; gutting tables scrubbed grey, gulls working the scraps. Steps go DOWN to where the fishing boats lie tied.",
      exits: { north: "harbor-quay", east: "the-boatyard", down: "the-fishing-boats" } },

    { id: "the-chandlery", name: "the Chandlery", biome: "coast", region: "the-waterfront",
      describing: "A cramped shop of rope, tar, lamp-oil and brass fittings, the till long shut for the season. A passage leads NORTH to the market row.",
      exits: { west: "harbor-quay", south: "the-boatyard", north: "the-market-row" } },

    { id: "the-saltloft-inn", name: "the Saltloft Inn", biome: "town", region: "the-waterfront",
      describing: "The warm room on the island: a low-beamed taproom, a stew-pot always on the hearth, narrow beds up the stair for anyone caught out by the weather. A door at the back lets ONTO the high street of the old town.",
      exits: { south: "harbor-quay", north: "the-high-street" } },

    { id: "the-market-row", name: "the Market Row", biome: "town", region: "the-waterfront",
      describing: "A short row of shuttered market stalls running up behind the chandlery, awnings furled against the wind, a few off-season traders still crying their wares. The chandlery lies back SOUTH; the fishwives keep their stalls to the EAST; the counting-house stands to the NORTH.",
      exits: { east: "the-fishwives-stalls", north: "the-counting-house" } },

    { id: "the-fishwives-stalls", name: "the Fishwives' Stalls", biome: "town", region: "the-waterfront",
      describing: "Trestle stalls slick with brine where the fishwives sell the morning's catch — what little the off-season boats bring in. The talk here is the island's true newspaper.",
      exits: { west: "the-market-row" } },

    { id: "the-counting-house", name: "the Counting House", biome: "town", region: "the-waterfront",
      describing: "A narrow stone house where the harbour's tolls and the fleet's wages are reckoned. Ledgers behind a grille, an iron-bound strongbox under the clerk's stool.",
      exits: { south: "the-market-row" } },

    // ===== THE OUTER HARBOUR =====================================================================
    { id: "the-boatyard", name: "the Boatyard", biome: "coast", region: "the-outer-harbor",
      describing: "Hulls up on the hard under shrink-wrap, a steaming-box and a forge gone cold, wood-shavings rotting in the rain. The forge floor holds raw iron, oak, and a shipwright's tools.",
      exits: { west: "the-fish-pier", north: "the-chandlery" } },

    { id: "the-ferry-slip", name: "the Ferry Slip", biome: "shore", region: "the-outer-harbor",
      describing: "The mainland ferry's berth, the gangway chained up till the next crossing. Beyond it the breakwater runs out to the harbor light.",
      exits: { east: "harbor-quay", south: "the-breakwater" } },

    { id: "the-breakwater", name: "the Breakwater", biome: "shore", region: "the-outer-harbor",
      describing: "A granite arm thrown out against the open sea, the harbor light at its end blinking its slow watch. The wind never stops out here. The foot of the lighthouse stands at the breakwater's end, to the EAST.",
      exits: { north: "the-ferry-slip", east: "the-lighthouse-foot" } },

    { id: "the-lighthouse-foot", name: "the Foot of the Lighthouse", biome: "shore", region: "the-outer-harbor",
      describing: "The base of the harbor light — a squat granite drum, its door scoured to bare wood by the salt. A spiral iron stair climbs UP into the dark of the tower.",
      exits: { west: "the-breakwater", up: "the-lighthouse-stair" } },

    { id: "the-lighthouse-stair", name: "the Lighthouse Stair", biome: "shore", region: "the-outer-harbor",
      describing: "A tight spiral of iron treads winding up the inside of the tower, each turn a little brighter as the lamp-room nears. Wind moans in the masonry. The stair goes DOWN to the foot, or UP onto the lamp gallery.",
      exits: { down: "the-lighthouse-foot" } },

    { id: "the-fishing-boats", name: "the Fishing Boats", biome: "coast", region: "the-outer-harbor",
      describing: "A raft of small boats made fast to the pier, gunwale to gunwale, half of them tarped for the season. Nets hang drying on the shrouds; bilgewater slaps in the dark between the hulls.",
      exits: { up: "the-fish-pier" } },

    // ===== THE OLD TOWN ==========================================================================
    { id: "the-high-street", name: "the High Street", biome: "town", region: "the-old-town",
      describing: "The spine of the old town: granite house-fronts shoulder to shoulder, the chapel bell-cote above the rooftops. The inn lies back DOWN toward the water; the chapel, the watch-house, the guild and the smithy open off the street.",
      exits: { south: "the-saltloft-inn", north: "the-chapel-of-maraset", east: "the-watch-house", west: "the-mariners-guild", up: "the-almshouse" } },

    { id: "the-chapel-of-maraset", name: "the Chapel of Maraset", biome: "town", region: "the-old-town",
      describing: "A small grey chapel to Maraset, the lady of tide and harbour: a salt-bleached altar, a votive lamp kept burning for boats at sea, the worn flags polished by generations of fisherfolk's knees. A place to WORSHIP and to PRAY.",
      exits: { south: "the-high-street" } },

    { id: "the-watch-house", name: "the Watch House", biome: "town", region: "the-old-town",
      describing: "The City Watch's house on the island: a charge-room with a rack of batons, a cell with a barred door, and a notice-board of the season's troubles. The constable answers here when she is not on the quay.",
      exits: { west: "the-high-street" } },

    { id: "the-mariners-guild", name: "the Mariners' Guild Hall", biome: "town", region: "the-old-town",
      describing: "The Mariners' Guild keeps a panelled hall hung with half-models and the names of the lost. A guild-master sits by the fire, ready to enrol a likely hand and reckon their standing. A door at the back goes DOWN to the smithy.",
      exits: { east: "the-high-street", down: "the-smithy" } },

    { id: "the-smithy", name: "the Smithy", biome: "town", region: "the-old-town",
      describing: "A working forge under the guild hall: coke-smoke, the ring of hammer on anvil, a slack-tub gone scummy. The smith keeps iron and tools here and will teach a steady apprentice.",
      exits: { up: "the-mariners-guild" } },

    { id: "the-almshouse", name: "the Almshouse", biome: "town", region: "the-old-town",
      describing: "A low charitable house at the head of the street where the island keeps its old and infirm — fishermen the sea wore out. Warm, plain, and quiet; the matron tends what hurts the chapel cannot.",
      exits: { down: "the-high-street" } },

    // ===== THE HINTERLAND ========================================================================
    { id: "the-quarry-road", name: "the Quarry Road", biome: "moor", region: "the-hinterland",
      describing: "A rutted cart-road climbing inland off the high street, dry-stone walls to either hand, the granite quarry a raw scar ahead. The salt-marsh lies away to the EAST; the moor-gate stands at the road's far end.",
      exits: { south: "the-chapel-of-maraset", east: "the-marsh", up: "the-granite-quarry", north: "the-moor-gate" } },

    { id: "the-granite-quarry", name: "the Granite Quarry", biome: "moor", region: "the-hinterland",
      describing: "The island's heart laid open: tiered grey benches of cut granite, derrick-cranes idle, a flooded pit at the bottom mirroring the sky. The stone that built every wall on Farstone came up out of here.",
      exits: { down: "the-quarry-road" } },

    { id: "the-marsh", name: "the Salt Marsh", biome: "marsh", region: "the-hinterland",
      describing: "A flat reach of tidal salt-marsh behind the town, channels winding through the cord-grass, clam-beds bared at the ebb. Herons stand still as posts. A plank causeway keeps your feet dry as far as the witch's hut, to the EAST.",
      exits: { west: "the-quarry-road", east: "the-witchs-hut" } },

    { id: "the-witchs-hut", name: "the Marsh-Witch's Hut", biome: "marsh", region: "the-hinterland",
      describing: "A turf-roofed hut on a hummock in the marsh, hung with drying weed and the bones of small things. The marsh-witch trades in cures and curses and the older sort of knowing — a place to learn a spell the chapel would frown on.",
      exits: { west: "the-marsh" } },

    { id: "the-moor-gate", name: "the Moor Gate", biome: "moor", region: "the-hinterland",
      describing: "A leaning gate in the last wall, where the island's stone gives out and the open moor begins — heather, granite tors, and the wind off the whole Atlantic. The end of the made world; only sheep-tracks beyond.",
      exits: { south: "the-quarry-road" } },
  ],

  // ── RESOURCES — food, rest, recreation so eat/rest/play verbs work across the bigger map ───────
  resources: [
    { id: "the-stew-pot", name: "the Saltloft's fish-stew pot", provides: "need:hunger",
      describing: "A blackened pot of chowder kept on the boil — the surest meal on the island.",
      "located-in": "the-saltloft-inn", amount: 30 },
    { id: "the-clam-bed", name: "the soft-shell clam bed", provides: "need:hunger",
      describing: "A bed of soft-shell clams exposed at low tide off the pier, there for the digging.",
      "located-in": "the-fish-pier", amount: 12 },
    { id: "the-inn-beds", name: "the Saltloft's narrow beds", provides: "need:rest",
      describing: "A row of narrow rope-strung beds up the inn stair.",
      "located-in": "the-saltloft-inn", amount: 24 },
    { id: "the-taproom", name: "the Saltloft taproom", provides: "need:recreation",
      describing: "Warmth, a fire, and whatever talk the off-season leaves to be had.",
      "located-in": "the-saltloft-inn", amount: 30 },
    // Tutorial cove: a barrel of ferry-rations and a bench, so eat/rest can be TRIED safely first.
    { id: "the-ration-barrel", name: "the ferry-ration barrel", provides: "need:hunger",
      describing: "A barrel of hard biscuit and dried apple the warden keeps for new arrivals — take what you need.",
      "located-in": "newcomer-landing", amount: 40 },
    { id: "the-warming-bench", name: "the warming bench", provides: "need:rest",
      describing: "A sheltered bench out of the wind where a tired newcomer can sit and catch their breath.",
      "located-in": "the-wardens-walk", amount: 40 },
    // The bigger town's commons.
    { id: "the-marsh-clams", name: "the marsh clam-beds", provides: "need:hunger",
      describing: "Rich clam-beds bared in the marsh channels at the ebb, there for anyone with a fork and patience.",
      "located-in": "the-marsh", amount: 20 },
    { id: "the-almshouse-cots", name: "the almshouse cots", provides: "need:rest",
      describing: "Plain charitable cots in the almshouse, never turned to anyone who needs them.",
      "located-in": "the-almshouse", amount: 20 },
    { id: "the-fishwives-fry", name: "the fishwives' fry-stall", provides: "need:hunger",
      describing: "A stall frying the morning's small fish in dripping — a hot copper meal at the market.",
      "located-in": "the-fishwives-stalls", amount: 24 },
    { id: "the-guild-hearth", name: "the guild-hall hearth", provides: "need:recreation",
      describing: "A great fire and the company of mariners swapping lies — the best recreation off the water.",
      "located-in": "the-mariners-guild", amount: 30 },
    { id: "the-chapel-quiet", name: "the chapel's quiet", provides: "need:recreation",
      describing: "The still, lamp-lit calm of the chapel, a place to gather oneself.",
      "located-in": "the-chapel-of-maraset", amount: 24 },
  ],

  // ── NPCS — a living cast across the map (the build script layers skills/gear/routines on many) ──
  npcs: [
    // ----- THE TUTORIAL GUIDE ---------------------------------------------------------------------
    // Wynn the harbour-warden greets new arrivals and explains. Her intends file a friendly cell when
    // a newcomer is co-located (the build script also gives her a notice-board's worth of signs around
    // the cove; the signs carry the actual lessons, since the tick's `do` files a cell, not speech).
    { id: "wynn-warden", name: "Wynn the harbour-warden",
      home: "newcomer-landing", "located-in": "newcomer-landing",
      describing: "A broad, weatherbeaten woman in an oilskin, keeper of the newcomer's cove. She has met every soul who ever came to Farstone off the ferry, and points each one to the signs with the same patient half-smile. EXAMINE the signs around her; she is glad of a word.",
      traits: ["patient", "welcoming"],
      needs: { hunger: 70, rest: 72, recreation: 70 },
      skills: ["guiding", "weather-reading"],
      perceives: ["naming", "describing", "kind"],
      intends: [
        { when: { predicate: "kind", object: "player" }, do: { predicate: "greeting", object: "a-newcomer" } },
      ] },

    // ----- THE HARBOUR QUARREL (unchanged core) ---------------------------------------------------
    { id: "dax-pell", name: "Dax Pell, an out-of-work deckhand",
      home: "the-fish-pier", "located-in": "harbor-quay",
      describing: "Young, restless, and broke since the boats tied up; quick to take offence and quicker to throw a punch.",
      traits: ["hot-headed", "restless"],
      needs: { hunger: 34, rest: 52, recreation: 30 },
      skills: ["fishing"],
      rivals: ["mara-quill"],
      intends: [
        { when: { need: "hunger", below: 40 }, do: { predicate: "spoiling-for", object: "a-fight" } },
      ] },

    { id: "mara-quill", name: "Sergeant Mara Quill, the harbor constable",
      home: "the-watch-house", "located-in": "harbor-quay",
      describing: "Twenty years keeping order on a quay that mostly keeps itself; steady, fair, and not to be crossed.",
      traits: ["steady", "dutiful"],
      needs: { hunger: 58, rest: 64, recreation: 50 },
      skills: ["law"],
      rivals: ["dax-pell"],
      intends: [
        { when: { predicate: "spoiling-for", object: "a-fight" }, do: { predicate: "keeping", object: "the-peace" } },
      ] },

    { id: "nessa-cawl", name: "Nessa Cawl, the innkeeper",
      home: "the-saltloft-inn", "located-in": "the-saltloft-inn",
      describing: "Runs the Saltloft single-handed off-season; the warmest welcome on a cold island, and the nearest the harbour has to a doctor.",
      traits: ["cheerful", "generous"],
      needs: { hunger: 60, rest: 66, recreation: 72 },
      skills: ["cooking", "brewing"],
      intends: [] },

    { id: "old-pell", name: "Old Pell, the lamp-keeper",
      home: "the-lighthouse-foot", "located-in": "the-lighthouse-foot",
      describing: "Alone at the harbor light through every gale; taciturn, watchful, glad of any word from the quay. (Dax's uncle, hence the shared name.)",
      traits: ["solitary", "watchful"],
      needs: { hunger: 48, rest: 58, recreation: 30 },
      skills: ["lamp-keeping", "weather-reading"],
      intends: [] },

    // ----- THE MARKET AND THE TRADES --------------------------------------------------------------
    { id: "greer-tbenn", name: "Greer Tenn, the fishwife",
      home: "the-fishwives-stalls", "located-in": "the-fishwives-stalls",
      describing: "A broad-armed fishwife with a voice that carries to the breakwater; sells the catch and knows everyone's business.",
      traits: ["loud", "shrewd"],
      needs: { hunger: 66, rest: 60, recreation: 64 },
      skills: ["haggling", "gutting"],
      intends: [] },

    { id: "edrun-clerk", name: "Edrun Sable, the harbour clerk",
      home: "the-counting-house", "located-in": "the-counting-house",
      describing: "A precise, ink-stained man who keeps the harbour's tolls and the fleet's wages; trusts a ledger before a face.",
      traits: ["precise", "guarded"],
      needs: { hunger: 64, rest: 62, recreation: 50 },
      skills: ["reckoning", "law"],
      intends: [] },

    // ----- THE OLD TOWN ---------------------------------------------------------------------------
    { id: "father-coll", name: "Father Coll, priest of Maraset",
      home: "the-chapel-of-maraset", "located-in": "the-chapel-of-maraset",
      describing: "The island's priest of Maraset, lady of tide and harbour; tends the votive lamp for boats at sea and the souls ashore. Will hear a prayer or bless a hand bound for the water.",
      traits: ["devout", "kindly"],
      needs: { hunger: 62, rest: 64, recreation: 58 },
      skills: ["liturgy", "healing"],
      intends: [] },

    { id: "guildmaster-orla", name: "Guild-Master Orla Vane, of the Mariners' Guild",
      home: "the-mariners-guild", "located-in": "the-mariners-guild",
      describing: "Stern keeper of the Mariners' Guild, a master of every art the water demands; enrols likely hands and reckons their standing. Yorrick the chandler's elder sister, and no warmer for it.",
      traits: ["stern", "exacting"],
      needs: { hunger: 64, rest: 66, recreation: 60 },
      skills: ["seamanship", "navigation"],
      intends: [] },

    { id: "matron-ivy", name: "Matron Ivy, of the Almshouse",
      home: "the-almshouse", "located-in": "the-almshouse",
      describing: "The almshouse matron, who tends the island's old and broken sailors with a healer's patient hands and a sharp word for malingerers.",
      traits: ["brisk", "kind"],
      needs: { hunger: 64, rest: 60, recreation: 56 },
      skills: ["healing", "nursing"],
      intends: [] },

    // ----- THE HINTERLAND -------------------------------------------------------------------------
    { id: "tomas-quarryman", name: "Tomas Strake, the quarryman",
      home: "the-granite-quarry", "located-in": "the-granite-quarry",
      describing: "A slab-shouldered quarryman grey with stone-dust, who breaks Farstone's granite by hand and powder. Slow to speak, slower to anger, immovable once moved.",
      traits: ["stolid", "strong"],
      needs: { hunger: 70, rest: 58, recreation: 52 },
      skills: ["quarrying", "blasting"],
      intends: [] },

    { id: "morrigan-witch", name: "Morrigan, the marsh-witch",
      home: "the-witchs-hut", "located-in": "the-witchs-hut",
      describing: "The marsh-witch of Farstone, who keeps the older sort of knowing out past the cord-grass — cures, curses, and spells the chapel would frown on. Trades fairly enough with those who come politely.",
      traits: ["sly", "knowing"],
      needs: { hunger: 58, rest: 60, recreation: 54 },
      skills: ["herblore", "hexing"],
      intends: [] },
  ],

  // ── ITEMS — takeables and flavour scattered across the map ─────────────────────────────────────
  items: [
    { id: "a-mooring-line", name: "a coil of mooring-line", material: "hemp", quality: 45,
      describing: "A heavy coil of tarred mooring-line, salt-stiff but sound — takeable, and useful for hauling.",
      "located-in": "harbor-quay" },
    { id: "a-gaff-hook", name: "a gaff hook", material: "iron", quality: 50,
      describing: "A long iron gaff for landing fish — or, in a temper, for worse.",
      "located-in": "the-fish-pier" },
    { id: "a-storm-lantern", name: "a storm lantern", material: "brass", quality: 55,
      describing: "A brass storm lantern with a cracked but serviceable lens.",
      "located-in": "the-breakwater" },
    { id: "a-tar-pot", name: "a pot of pitch", material: "iron", quality: 40,
      describing: "A dented pot of black caulking pitch from the chandlery shelf.",
      "located-in": "the-chandlery" },
    // Scattered flavour across the new rooms.
    { id: "a-bait-bucket", name: "a bait bucket", material: "wood", quality: 30,
      describing: "A reeking wooden bucket of cut bait, left aboard one of the tied-up boats.",
      "located-in": "the-fishing-boats" },
    { id: "a-votive-candle", name: "a votive candle", material: "wax", quality: 35,
      describing: "A pale votive candle from the chapel rack, kept burning for boats at sea.",
      "located-in": "the-chapel-of-maraset" },
    { id: "a-half-model", name: "a builder's half-model", material: "oak", quality: 60,
      describing: "A varnished half-model of a Farstone smack, hung in the guild hall to record her lines.",
      "located-in": "the-mariners-guild" },
    { id: "a-quarry-maul", name: "a quarryman's maul", material: "iron", quality: 55,
      describing: "A long-hafted iron maul for splitting granite — heavy enough to need both hands.",
      "located-in": "the-granite-quarry" },
    { id: "a-bundle-of-weed", name: "a bundle of dried weed", material: "herb", quality: 40,
      describing: "A bundle of bitter marsh-herbs drying in the witch's rafters; the makings of a cure, or worse.",
      "located-in": "the-witchs-hut" },
    { id: "a-heron-feather", name: "a heron feather", material: "feather", quality: 25,
      describing: "A long grey heron feather dropped on the marsh causeway.",
      "located-in": "the-marsh" },
    { id: "a-ledger-key", name: "a small brass key", material: "brass", quality: 45,
      describing: "A small brass key on a string, fallen behind the counting-house grille.",
      "located-in": "the-counting-house" },
  ],
};
