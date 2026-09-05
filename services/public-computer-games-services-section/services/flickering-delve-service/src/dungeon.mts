/**
 * `dungeon` — the procedurally generated cave, pure and deterministic.
 *
 * The fiction (the user's brief): out past the last settlement, in wild country, the ground
 * opens — a cave the delvers call **the Gnaw**. Adventurers travel from everywhere for fame,
 * glory, riches, and knowledge, and descend. It is the *same* cave for everyone: floor N is a
 * pure function of a global seed and the depth, so two delvers at the same depth face the same
 * dark. As you go down you pass through regions, the fauna gets stranger and harder, and now
 * and then **Coyote** or **Crow** has been there first and left the floor twisted — a trickster
 * mutator that can rob you, gift you, or teach you. (Original homage in the register the user
 * asked for — Caves-of-Qud-meets-Coyote-and-Crow — not retold sacred story.)
 *
 * Everything is pure: no clock, no `Math.random`. Generation flows from `seed.mts`. That makes
 * the cave reproducible (a test sees the server's exact floor), unrerollable by a client, and
 * equally (un)lucky for all.
 */
import { rngAt } from "./seed.mts";

/** A descending region of the cave. The first region a player crosses is the threshold. */
export interface Biome {
  readonly id: string;
  readonly name: string;
  /** The depth at which this region begins. */
  readonly from: number;
}

/** A creature archetype; concrete stats are scaled to the floor's depth. */
export interface MonsterArchetype {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly atk: number;
}

export interface Hazard {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
}

/** A trickster's mark on a floor — Coyote robs and gambles, Crow gives sight and memory. */
export interface Trickster {
  readonly id: string;
  readonly name: string;
  /** What the mark does to the floor's reward. */
  readonly kind: "rob" | "gift" | "teach" | "gamble";
  readonly blurb: string;
  /** Multiplier applied to the floor's essence reward when this mark is present. */
  readonly rewardMult: number;
  /** Bonus echoes (knowledge) granted on clear, if any. */
  readonly echoes: number;
}

/** The fully-resolved description of one floor of the Gnaw. */
export interface FloorSpec {
  readonly depth: number;
  readonly name: string;
  readonly biome: string;
  readonly monster: { readonly id: string; readonly name: string; readonly hp: number; readonly atk: number };
  readonly hazard: Hazard | null;
  /** Essence yielded by clearing this floor, before run/prestige/boost multipliers. */
  readonly essenceReward: number;
  readonly trickster: Trickster | null;
}

/** The generation tables — overridable by `world/dungeon.json`, with sane defaults baked in. */
export interface DungeonConfig {
  readonly seed: string;
  readonly biomes: readonly Biome[];
  readonly monsters: readonly MonsterArchetype[];
  readonly hazards: readonly Hazard[];
  readonly tricksters: readonly Trickster[];
  /** Per-floor geometric growth of monster stats. */
  readonly growth: number;
  /** Base essence reward at depth 1. */
  readonly baseReward: number;
  /** Probability a floor carries a hazard. */
  readonly hazardChance: number;
  /** Probability a floor is marked by a trickster. */
  readonly tricksterChance: number;
}

export const DEFAULT_BIOMES: readonly Biome[] = [
  { id: "threshold", name: "the Threshold", from: 1 },
  { id: "root-tangle", name: "the Root-Tangle", from: 6 },
  { id: "drip-halls", name: "the Drip-Halls", from: 14 },
  { id: "emberveins", name: "the Emberveins", from: 26 },
  { id: "hollow-dark", name: "the Hollow Dark", from: 42 },
  { id: "star-cellar", name: "the Star-Cellar", from: 64 },
];

export const DEFAULT_MONSTERS: readonly MonsterArchetype[] = [
  { id: "husk-moth", name: "a husk-moth", hp: 6, atk: 2 },
  { id: "salt-crawler", name: "a salt-crawler", hp: 9, atk: 3 },
  { id: "ember-tick", name: "an ember-tick", hp: 7, atk: 4 },
  { id: "glasswing", name: "a glasswing", hp: 11, atk: 3 },
  { id: "chorus-of-teeth", name: "the chorus-of-teeth", hp: 16, atk: 5 },
  { id: "rust-shaman", name: "a rust-shaman", hp: 14, atk: 6 },
  { id: "hollow-elk", name: "a hollow elk", hp: 22, atk: 7 },
];

export const DEFAULT_HAZARDS: readonly Hazard[] = [
  { id: "spore-bloom", name: "a spore-bloom", blurb: "Pale spores hang in the air; each breath stings." },
  { id: "scree", name: "collapsing scree", blurb: "The floor sheds under your weight." },
  { id: "cold-draft", name: "a cold draft", blurb: "Something far below is breathing in." },
  { id: "singing-damp", name: "the singing damp", blurb: "Wet stone hums a note that loosens your grip." },
];

export const DEFAULT_TRICKSTERS: readonly Trickster[] = [
  { id: "coyote-rob", name: "Coyote's pawprint", kind: "rob", blurb: "Coyote got here first and left less than there should be.", rewardMult: 0.4, echoes: 0 },
  { id: "coyote-gamble", name: "Coyote's wager", kind: "gamble", blurb: "Coyote left a bet scratched in the dust — double or nothing.", rewardMult: 2.2, echoes: 0 },
  { id: "crow-gift", name: "Crow's feather", kind: "gift", blurb: "Crow dropped something bright on the way down.", rewardMult: 1.6, echoes: 0 },
  { id: "crow-teach", name: "Crow's question", kind: "teach", blurb: "Crow scratched a riddle on the wall; understanding it leaves an echo.", rewardMult: 1.0, echoes: 1 },
];

export const DEFAULT_DUNGEON: DungeonConfig = {
  seed: "the-gnaw-prime",
  biomes: DEFAULT_BIOMES,
  monsters: DEFAULT_MONSTERS,
  hazards: DEFAULT_HAZARDS,
  tricksters: DEFAULT_TRICKSTERS,
  growth: 1.18,
  baseReward: 4,
  hazardChance: 0.35,
  tricksterChance: 0.16,
};

/** The region a given depth falls within. */
export function biomeAt(config: DungeonConfig, depth: number): Biome {
  let current = config.biomes[0]!;
  for (const b of config.biomes) if (depth >= b.from) current = b;
  return current;
}

/** Monster stat scaling at a depth — a smooth geometric climb. */
export function difficultyAt(config: DungeonConfig, depth: number): number {
  return Math.pow(config.growth, depth - 1);
}

/**
 * Generate floor `depth` of the cave. Deterministic in `(config.seed, depth)` alone — the
 * same dungeon for every delver, every process, every test.
 */
export function floorSpec(config: DungeonConfig, depth: number): FloorSpec {
  const d = Math.max(1, Math.floor(depth));
  const rng = rngAt(config.seed, "floor", d);
  const biome = biomeAt(config, d);
  const scale = difficultyAt(config, d);

  // Fauna unfolds with depth: the threshold holds only the weakest archetypes, and tougher
  // ones surface deeper. (Monster tables are ordered weakest→strongest.) This keeps the first
  // floors survivable for a fresh delver while the deep gets genuinely dangerous — the
  // roguelike wall that, with a stalled descent, is what pushes you to rekindle.
  const poolSize = Math.min(config.monsters.length, 1 + Math.floor((d - 1) / 4));
  const pool = config.monsters.slice(0, poolSize);
  const archetype = rng.pick(pool) ?? DEFAULT_MONSTERS[0]!;
  const hp = Math.max(1, Math.round(archetype.hp * scale));
  const atk = Math.max(1, Math.round(archetype.atk * (1 + (scale - 1) * 0.6)));

  const hazard = rng.chance(config.hazardChance) ? (rng.pick(config.hazards) ?? null) : null;
  const trickster = rng.chance(config.tricksterChance) ? (rng.pick(config.tricksters) ?? null) : null;

  const baseEssence = config.baseReward * scale * (hazard ? 1.25 : 1);
  const essenceReward = Math.max(1, Math.round(baseEssence * (trickster?.rewardMult ?? 1)));

  const name = `${biome.name}, ${ordinal(d)} reach`;
  return {
    depth: d,
    name,
    biome: biome.id,
    monster: { id: archetype.id, name: archetype.name, hp, atk },
    hazard,
    essenceReward,
    trickster,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
