/** Farstone's genre-toolkit catalogs: wares, recipes, resources, ship classes, professions,
 * titles, souls, factions, and laws. Plain data for `@red-cup-engineering/feltos`'s `GameCatalogs` seam. */
type WareType = { id: string; name: string; description: string; tags: readonly string[]; basePrice: number; baseStock: number; sourceTags: readonly string[] };
type Recipe = { name: string; inputs: readonly { tag: string; count: number }[]; tool?: string; station?: string; skill?: string; output: { id: string; name: string; description: string; tags: readonly string[] } };
type ResourceNode = { resource: string; skill: string; max: number; regrowEvery: number; item: { name: string; description: string; tags: readonly string[] } };
type ShipClassRoom = { suffix: string; name: string; description: string; exits?: Readonly<Record<string, string>>; deck?: boolean; helm?: boolean };
type ShipClass = { hull: number; speed: number; cargo: number; cost: number; timber: number; rooms: readonly ShipClassRoom[] };
type Profession = { title: string; skills: readonly string[] };
type Title = { at: number; title: string };
type Soul = { id: string; actor: string; room: string };
type Faction = { id: string; name: string; rivals: readonly string[] };
type Structure = { id: string; name: string; description: string; needs: Readonly<Record<string, number>>; tags: readonly string[]; skill: string };

const defineSoul = (actor: string, room: string): Soul => Object.freeze({ id: actor, actor, room });

export const WARES: Readonly<Record<string, WareType>> = Object.freeze({
  fizzwater: { id: "fizzwater", name: "a pint of fizzwater", description: "A foaming pint cut with the spring's own fizz.", tags: ["item", "takeable", "edible", "nutrition:1"], basePrice: 3, baseStock: 10, sourceTags: ["harbor", "curiosity"] },
  fish: { id: "fish", name: "a fresh fish", description: "A silver fish off the bank.", tags: ["item", "takeable", "fish", "edible", "nutrition:3"], basePrice: 2, baseStock: 6, sourceTags: ["fishing", "dock", "harbor"] },
  rope: { id: "rope", name: "a coil of rope", description: "Hand-laid hemp rope, sound and strong.", tags: ["item", "takeable", "fiber"], basePrice: 8, baseStock: 4, sourceTags: ["forge", "craft", "shop"] },
});

export const RECIPES: Readonly<Record<string, Recipe>> = Object.freeze({
  rope: {
    name: "rope",
    inputs: [{ tag: "fiber", count: 2 }],
    skill: "ropework",
    output: { id: "rope", name: "a coil of rope", description: "Hand-laid hemp rope, sound and strong.", tags: ["item", "takeable", "fiber"] },
  },
  plank: {
    name: "plank",
    inputs: [{ tag: "timber", count: 1 }],
    tool: "saw",
    skill: "carpentry",
    output: { id: "plank", name: "a sawn plank", description: "A fresh-sawn plank, fair and true.", tags: ["item", "takeable", "timber"] },
  },
  knife: {
    name: "knife",
    inputs: [{ tag: "iron", count: 1 }],
    tool: "hammer",
    station: "forge",
    skill: "smithing",
    output: { id: "knife", name: "a fish knife", description: "A short blade, ground keen.", tags: ["item", "takeable", "weapon", "weapon-damage:2", "value:6"] },
  },
  stew: {
    name: "stew",
    inputs: [{ tag: "fish", count: 1 }],
    station: "galley",
    skill: "cooking",
    output: { id: "stew", name: "a bowl of stew", description: "Hot fish stew, thick and good.", tags: ["item", "takeable", "edible", "nutrition:5"] },
  },
});

export const RESOURCES: Readonly<Record<string, ResourceNode>> = Object.freeze({
  fish: {
    resource: "fish", skill: "fishing", max: 5, regrowEvery: 6,
    item: { name: "a fresh fish", description: "A silver fish, fresh off the bank.", tags: ["item", "takeable", "fish", "edible", "nutrition:3"] },
  },
  fiber: {
    resource: "fiber", skill: "foraging", max: 6, regrowEvery: 5,
    item: { name: "a hank of hemp fiber", description: "Raw combed hemp, ready to lay into rope.", tags: ["item", "takeable", "fiber"] },
  },
  timber: {
    resource: "timber", skill: "woodcutting", max: 4, regrowEvery: 10,
    item: { name: "a baulk of timber", description: "A squared length of seasoned oak.", tags: ["item", "takeable", "timber"] },
  },
  iron: {
    resource: "iron", skill: "mining", max: 4, regrowEvery: 12,
    item: { name: "a lump of iron ore", description: "Heavy red ore, ready for the forge.", tags: ["item", "takeable", "iron"] },
  },
  stone: {
    resource: "stone", skill: "masonry", max: 8, regrowEvery: 9,
    item: { name: "a block of granite", description: "Squared grey granite, cut from the quarry.", tags: ["item", "takeable", "stone"] },
  },
});

/** Verb aliases that gather a specific resource (bare `gather <resource>` works for any). */
export const GATHER_VERBS: Readonly<Record<string, string>> = Object.freeze({
  fish: "fish",
  forage: "fiber",
  chop: "timber",
  mine: "iron",
  quarry: "stone",
});

const oneRoom = (name: string, description: string): readonly ShipClassRoom[] =>
  [{ suffix: "deck", name, description, deck: true, helm: true }];

export const SHIP_CLASSES: Readonly<Record<string, ShipClass>> = Object.freeze({
  raft: {
    hull: 4, speed: 1, cargo: 1, cost: 15, timber: 2,
    rooms: oneRoom("the raft", "A few logs lashed with rope — barely a deck, but it floats."),
  },
  dinghy: {
    hull: 6, speed: 1, cargo: 2, cost: 35, timber: 3,
    rooms: oneRoom("the new dinghy", "A clinker-built dinghy fresh off the stocks, smelling of pitch."),
  },
  skiff: {
    hull: 8, speed: 1, cargo: 4, cost: 60, timber: 5,
    rooms: [
      { suffix: "deck", name: "the skiff's deck", description: "A trim single-masted deck of new planking, the tiller aft.", exits: { aft: "helm" }, deck: true },
      { suffix: "helm", name: "the skiff's tiller", description: "The aft thwart, tiller in hand.", exits: { forward: "deck" }, helm: true },
    ],
  },
  station: {
    hull: 24, speed: 0, cargo: 20, cost: 120, timber: 10,
    rooms: [
      { suffix: "deck", name: "the sea-station's platform", description: "A timber platform pinned to the seabed on tarred piles, derricks and winches crowding the deck.", deck: true },
    ],
  },
  lugger: {
    hull: 18, speed: 2, cargo: 12, cost: 240, timber: 14,
    rooms: [
      { suffix: "deck", name: "the lugger's deck", description: "A broad new working deck, hatch forward, wheel aft.", exits: { aft: "wheel", below: "hold" }, deck: true },
      { suffix: "wheel", name: "the lugger's wheel", description: "The helm aft; she answers from here.", exits: { forward: "deck" }, helm: true },
      { suffix: "hold", name: "the lugger's hold", description: "A dry dark hold, room for a real load.", exits: { above: "deck" } },
    ],
  },
});

export const PROFESSIONS: Readonly<Record<string, Profession>> = Object.freeze({
  fisher: { title: "Fisher", skills: ["fishing", "sailing"] },
  shipwright: { title: "Shipwright", skills: ["carpentry", "woodcutting"] },
  smith: { title: "Smith", skills: ["smithing", "mining"] },
  cook: { title: "Cook", skills: ["cooking", "foraging"] },
  trader: { title: "Trader", skills: ["ropework", "searching", "magic"] },
});

export const TITLES: readonly Title[] = Object.freeze([
  { at: 0, title: "newcomer" },
  { at: 25, title: "harbor-hand" },
  { at: 75, title: "mariner" },
  { at: 200, title: "master mariner" },
  { at: 500, title: "harbor legend" },
]);

export const SOULS: Readonly<Record<string, Soul>> = Object.freeze({
  smile: defineSoul("smile", "smiles"),
  grin: defineSoul("grin", "grins"),
  laugh: defineSoul("laugh", "laughs"),
  wave: defineSoul("wave", "waves"),
  bow: defineSoul("bow", "bows"),
  nod: defineSoul("nod", "nods"),
  wink: defineSoul("wink", "winks"),
  frown: defineSoul("frown", "frowns"),
  glare: defineSoul("glare", "glares"),
  cheer: defineSoul("cheer", "cheers"),
  shrug: defineSoul("shrug", "shrugs"),
  dance: defineSoul("dance", "dances"),
  bounce: defineSoul("bounce", "bounces"),
  ponder: defineSoul("ponder", "ponders"),
  sigh: defineSoul("sigh", "sighs"),
  cackle: defineSoul("cackle", "cackles"),
});

/** Farstone's four factions: the working fleet, the regulating watch, the chapel, the marsh. */
export const FACTIONS: Readonly<Record<string, Faction>> = Object.freeze({
  fishers: { id: "fishers", name: "the Fishers' fellowship", rivals: ["watch"] },
  watch: { id: "watch", name: "the Harbor Watch", rivals: ["fishers"] },
  chapel: { id: "chapel", name: "the Chapel of Maraset", rivals: ["marsh"] },
  marsh: { id: "marsh", name: "Morrigan's marsh-folk", rivals: ["chapel"] },
});

export const LAWS: readonly string[] = Object.freeze(["pollution-cap", "fishing-quota"]);

export const STRUCTURES: Readonly<Record<string, Structure>> = Object.freeze({
  shack: { id: "shack", name: "a fishing shack", description: "A rough plank shack, tar-caulked against the weather — a place of your own on the cold waterfront.", needs: { timber: 4 }, tags: ["place", "indoor", "built", "shelter"], skill: "carpentry" },
  jetty: { id: "jetty", name: "a timber jetty", description: "A jetty of driven piles reaching out over the water, sound enough to moor a vessel against.", needs: { timber: 5 }, tags: ["place", "outdoor", "built", "dock"], skill: "carpentry" },
  smokehouse: { id: "smokehouse", name: "a smokehouse", description: "A timber smokehouse, racks hung for curing the catch over a slow alder fire.", needs: { timber: 3, iron: 1 }, tags: ["place", "indoor", "built", "craft", "forge"], skill: "carpentry" },
  cottage: { id: "cottage", name: "a granite cottage", description: "A low cottage of squared granite under a turf roof — built to outlast its builder, the way the island builds.", needs: { stone: 6, timber: 2 }, tags: ["place", "indoor", "built", "shelter", "social-hub"], skill: "masonry" },
  cairn: { id: "cairn", name: "a stone cairn", description: "A cairn of stacked granite, a marker on the bare ground that will stand long after you are gone.", needs: { stone: 4 }, tags: ["place", "outdoor", "built"], skill: "masonry" },
});
