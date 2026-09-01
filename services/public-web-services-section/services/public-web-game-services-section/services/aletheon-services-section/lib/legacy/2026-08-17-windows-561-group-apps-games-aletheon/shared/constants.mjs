// constants — the dials shared by server and client. Pure data, no imports, browser-safe
// (no `node:` anything) so the exact same file ships to the browser and runs on the server.
// One source of truth keeps client prediction and server authority in agreement.

export const PROTOCOL_VERSION = 1;

// --- simulation clock ---
export const TICK_HZ = 15; // authoritative server ticks per second
export const TICK_MS = 1000 / TICK_HZ;

// --- the world (a square patch of Aletheon, in world units = metres) ---
export const WORLD = Object.freeze({
  size: 256, // the terrain is SIZE x SIZE world units, centred on the origin
  maxHeight: 22, // peak terrain elevation
  seaLevel: 2.2, // below this the heightfield reads as water
});

// --- movement ---
export const MOVE = Object.freeze({
  walk: 7.0, // world units / second
  turn: 3.2, // radians / second (server-clamped yaw rate)
  gravity: 22.0,
  eyeHeight: 1.7,
});

// --- interest management: a client is only told about entities within this radius ---
export const VIEW_RADIUS = 64;

// --- combat (the single deep pillar) ---
// HP is not a number the world trusts; it is EVIDENCE. Each point of damage is one unit of
// NEGATIVE evidence appended to a creature's `alive` cell; each point of healing, POSITIVE.
// The bilattice verdict (t / f / ⊤) is what actually decides life, death, and corruption.
export const COMBAT = Object.freeze({
  attackRange: 2.6, // melee reach, world units
  attackCooldownMs: 700, // between a player's swings
  swingWindupMs: 180, // telegraph before damage lands
  baseDamage: 9, // negative-evidence units per landed hit
  playerMaxHp: 60, // positive-evidence capacity of a fresh player
  // A creature whose `alive` cell holds BOTH strong positive AND strong negative evidence
  // does not die — it settles to ⊤ and is reborn as a Corrupted Anomaly. This is the gate.
  anomalyEvidence: 8, // min evidence on BOTH faces for the ⊤ reading to be a real situation
  corpseLingerTicks: 45,
});

// [marks] the MARK — the kernel's base quantum (a single drawn distinction; Spencer-Brown's mark =
// Shannon's bit = `articulate`). Marks are a CONSERVED, condensing substance: a slain creature's
// marks TRANSFER to its slayer (never destroyed), and you SPEND them to POSIT a claim through the
// real kernel and settle a Cairn on a `t` verdict. One source of truth for the cost.
export const MARK = Object.freeze({
  settleCost: 8, // marks spent to POSIT a claim and raise one Cairn
  // [powers] the K₄ gauge as player powers — each spends marks (see shared/powers.mjs).
  reflectCost: 6, // negate: invert a target's life-charge (a costly finisher → f)
  banishCost: 5, // conflate: dissolve a ⊤ Anomaly (⊤ → ⊥)
  revealCost: 3, // possibilize: widen the caster's sight for a few seconds
  bindCost: 4, // necessitate: root a creature in place for a span of ticks
  // [claims] CLAIM ALTARS — staking SPENDS marks INTO an altar's evidence (conserved). A t-settled
  // SANCTUARY altar pays a small marks DIVIDEND back to its positive claimants on an interval.
  altarDividend: 1, // marks paid to each claimant of a sanctuary altar per dividend tick
  altarDividendEvery: 90, // ticks between sanctuary dividend payouts (≈ 6 s at 15 Hz)
});

// [powers] dials for the K₄ powers' effects (durations in seconds / ticks; radii in world units).
export const POWER = Object.freeze({
  revealRadius: 110, // widened interest radius while Reveal is active (vs VIEW_RADIUS = 64)
  revealMs: 6000, // how long Reveal widens the caster's sight
  bindTicks: 45, // how many ticks a Bind roots a creature in place
});

// [tide] THE SETTLING TIDE — the repo's thermodynamic + number-theoretic physics as world behavior.
// GROUNDING (the constants are load-bearing): the classical regime's growth is the GOLDEN RATIO
// Pisot factor φ (the Fibonacci substitution a→ab,b→a has Perron eigenvalue φ); the arrow of time
// is the world SETTLING (entropy rising monotonically toward calm equilibrium); an aperiodic /
// quasicrystal point set has pure-point diffraction with BRAGG PEAKS at lattice positions a+bφ —
// the rare "prime" resonances. These dials drive thermo.mjs: φ-paced ecology + Bragg blooms.
export const TIDE = Object.freeze({
  PHI: 1.6180339887498949, // φ — the Pisot growth factor of the classical (Fibonacci) regime
  GOLDEN_ANGLE: 2.399963229728653, // 2π(1 − 1/φ) rad — the most-irrational angle; sunflower packing
  // φ-paced ECOLOGY: critters regrow toward a cap, each step adding ~⌈current·(φ−1)⌉ newcomers,
  // on a fixed tick interval, placed at golden-angle ranks on the grade rings.
  repopulateEvery: 60, // ticks between repopulation steps (≈ 4 s at 15 Hz)
  critterCap: 32, // population ceiling — the ecology grows toward it, never beyond
  critterSeed: 2, // minimum newcomers when the population has collapsed toward zero
  critterMaxHp: 16, // vitality of a regrown critter
  ecologyGrade: 1, // the grade-ring newcomers settle onto (near the heart, gentle)
  // BRAGG RESONANCE blooms: a transient peaceful pickup, spawned rarely when the tick index is a
  // FIBONACCI number (a pure-point criterion), placed at a golden-ratio a+bφ lattice position.
  resonanceEvery: 1, // check every tick (the Fibonacci criterion gates how often it actually fires)
  resonanceReward: 13, // F₇ marks settle into the player who blooms it (a Fibonacci burst)
  resonanceRadius: 3.0, // a player within this many world units of the node BLOOMS it
  resonanceGrade: 2, // the grade-ring resonance nodes settle onto
  resonanceMax: 6, // at most this many resonance nodes stand in the world at once
});

// [tide] alias kept for readers who reach for the number-theoretic name (the Pisot/Perron factor).
export const PISOT = TIDE;

// --- entity kinds (the familiar fantasy surface over the bilattice) ---
export const KIND = Object.freeze({
  player: "player",
  critter: "critter", // wandering wildlife — t while alive
  brigand: "brigand", // hostile NPC — attacks players
  anomaly: "anomaly", // a ⊤ creature: the world holding a contradiction as a situation
  keeper: "keeper", // peaceful Keeper of a Way — never hostile, never a valid target (in-world culture)
  cairn: "cairn", // [marks] a standing peaceful marker raised by settling marks — never hostile, never a target
  resonance: "resonance", // [tide] a transient Bragg-resonance pickup — peaceful, immobile, blooms on touch
  altar: "altar", // [claims] a CLAIM ALTAR — peaceful, immobile; carries a player-authored claim cell
});

// --- wire message kinds (see shared/protocol.mjs for shapes) ---
export const MSG = Object.freeze({
  hello: "hello", // server -> client: version + your entity id + world meta
  join: "join", // client -> server: desired name
  input: "input", // client -> server: intent (move axes, yaw, attack)
  snapshot: "snapshot", // server -> client: full visible set (sent on join / re-sync)
  delta: "delta", // server -> client: per-tick changes to the visible set
  combat: "combat", // server -> client: a combat event to log/animate
  chat: "chat", // both ways: a line of chat
  bye: "bye", // server -> client: an entity left view / world
  codex: "codex", // server -> client: you have WITNESSED a bilattice Way for the first time
  field: "field", // server -> client: the void-tension field (downsampled, periodic)
  speak: "speak", // [illocution] client -> server: emit an illocutionary force (assert/deny/abstain/contest)
  said: "said", // [illocution] server -> client: a nearby player spoke a force (render the glyph)
  settle: "settle", // [marks] client -> server: spend marks to POSIT a claim and raise a Cairn
  power: "power", // [powers] client -> server: spend marks to use a K₄ gauge power on a target
  trade: "trade", // [economy] client<->server: propose/accept/cancel a fiber-exchange with a player
  inventory: "inventory", // [economy] server -> client: your held items + marks + total richness
  parley: "parley", // [dispute] client -> server: OPEN a ludics dispute (a parley) with a target foe
  move: "move", // [dispute] client -> server: PLAY one of the four forces into the active dispute
  dispute: "dispute", // [dispute] server -> client: the live parley state (stances/last/flow/yielded)
  claim: "claim", // [claims] client -> server: stake a force at a CLAIM ALTAR (assert/deny/contest/abstain)
  altar: "altar", // [claims] server -> client: a nearby altar's claim state (glyph, pos/neg, settled face)
});
