/**
 * `economy` — the idle growth core, as pure functions over a read-model.
 *
 * This is the corpus's "minimal engine architecture" (idle-games.md §9) made concrete for
 * the Gnaw: a small set of repeatable primitives — resources, a derivative **generator
 * cascade**, geometric cost curves, a central modifier pipeline, soft caps, and large-number
 * formatting. None of it knows about FeltOS: it operates on a plain `GameState` the scene
 * projects out of the world's settled facts and writes deltas back into. Keeping it pure is
 * what lets us unit-test pacing (costs monotone, offline≈online at constant rate, prestige
 * speeds the rebuild) without standing up a server.
 *
 * The generators are a cascade, not parallel sources: archivists make cartographers,
 * cartographers make pathfinders, pathfinders make torchbearers, torchbearers make essence.
 * That is the Pecorella "manage a cascade" structure (idle-games.md §4) — it makes the
 * best-next-purchase question genuinely non-greedy instead of a solved spreadsheet.
 */

/** The player's whole run+meta state, projected from world facts. Plain data, no methods. */
export interface GameState {
  essence: number;
  echoes: number;
  depth: number;
  /** Deepest reach this run — resets on rekindle; drives the prestige reward. */
  maxDepth: number;
  /** Deepest reach ever — fame/glory, never resets, for the leaderboard. */
  fameDepth: number;
  lifetimeEssence: number;
  hp: number;
  maxHp: number;
  atk: number;
  prestigeCount: number;
  /** Generator id → owned (float; bought in integers, cascade-produced fractionally). */
  gens: Record<string, number>;
  /** Repeatable combat-investment id → times bought (whetstone, tallow). Run-local. */
  combat: Record<string, number>;
  upgrades: ReadonlySet<string>;
  automations: ReadonlySet<string>;
  /** Active production multiplier from a monetization/event boost (1 when none active). */
  boostRateMult: number;
}

/** A generator tier. Tier 1 produces essence; each higher tier produces the tier below it. */
export interface GeneratorDef {
  readonly id: string;
  readonly name: string;
  readonly tier: number;
  /** The generator id this tier produces; undefined for tier 1 (which produces essence). */
  readonly produces?: string;
  readonly baseRate: number;
  readonly baseCost: number;
  readonly costScale: number;
  readonly blurb: string;
}

/** A one-time upgrade and the modifier it applies. */
export interface UpgradeDef {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly currency: "essence" | "echoes";
  readonly blurb: string;
  /** Multiplies all generator production. */
  readonly prodMult?: number;
  /** Multiplies echoes gained on prestige. */
  readonly echoMult?: number;
  /** An unlock id this upgrade requires to be revealed. */
  readonly requires?: string;
}

/** Per-echo global production bonus β: production ×(1 + β·echoes). */
export const ECHO_BONUS = 0.02;

/** The generator cascade, shallowest (essence-making) first. */
export const GENERATORS: readonly GeneratorDef[] = [
  { id: "torchbearer", name: "Torchbearer", tier: 1, baseRate: 0.1, baseCost: 10, costScale: 1.12,
    blurb: "Carries a light a little deeper and brings back essence." },
  { id: "pathfinder", name: "Pathfinder", tier: 2, produces: "torchbearer", baseRate: 0.08, baseCost: 120, costScale: 1.14,
    blurb: "Finds the next safe way down — and recruits torchbearers." },
  { id: "cartographer", name: "Cartographer", tier: 3, produces: "pathfinder", baseRate: 0.06, baseCost: 2_000, costScale: 1.16,
    blurb: "Maps the dark, training pathfinders from the maps." },
  { id: "archivist", name: "Archivist", tier: 4, produces: "cartographer", baseRate: 0.05, baseCost: 45_000, costScale: 1.18,
    blurb: "Reads the cave's own memory and sends down cartographers." },
];

export const UPGRADES: readonly UpgradeDef[] = [
  { id: "bright-flame", name: "Bright Flame", cost: 250, currency: "essence", prodMult: 2,
    blurb: "Your light burns twice as fierce — all production ×2." },
  { id: "rendered-fat", name: "Rendered Fat", cost: 5_000, currency: "essence", prodMult: 3,
    blurb: "Fuel rendered from the deep fauna — all production ×3." },
  { id: "deep-veins", name: "Deep Veins", cost: 250_000, currency: "essence", prodMult: 4,
    blurb: "Tap the cave's own currents — all production ×4." },
  { id: "coyote-charm", name: "Coyote Charm", cost: 3, currency: "echoes", prodMult: 2.5,
    blurb: "A bone whistle Coyote can't resist. All production ×2.5.", requires: "rekindle" },
  { id: "crow-eyes", name: "Crow's Eyes", cost: 5, currency: "echoes", echoMult: 2,
    blurb: "See what the cave remembers — echoes gained ×2.", requires: "rekindle" },
];

/**
 * Repeatable combat investment — how abundant essence converts into *depth*. Each purchase
 * raises the avatar's attack or health on an escalating geometric cost, so a run's reach is
 * bounded by how much essence you pour into the delver, not a one-time cap. Reset on rekindle.
 */
export interface CombatDef {
  readonly id: string;
  readonly name: string;
  readonly baseCost: number;
  readonly costScale: number;
  readonly atk?: number;
  readonly maxHp?: number;
  readonly blurb: string;
}

export const COMBAT_UPGRADES: readonly CombatDef[] = [
  { id: "whetstone", name: "Whetstone", baseCost: 60, costScale: 1.45, atk: 3,
    blurb: "Grind your edge keener. +3 attack each." },
  { id: "tallow-ward", name: "Tallow Ward", baseCost: 60, costScale: 1.4, maxHp: 14,
    blurb: "Salve and ward against the deep air. +14 max health each." },
];

const COMBAT_BY_ID: ReadonlyMap<string, CombatDef> = new Map(COMBAT_UPGRADES.map((c) => [c.id, c]));
export const combatDef = (id: string): CombatDef | undefined => COMBAT_BY_ID.get(id);

/** Geometric cost to buy `count` of a repeatable combat upgrade already bought `owned` times. */
export function combatCost(def: CombatDef, owned: number, count = 1): number {
  const first = def.baseCost * Math.pow(def.costScale, Math.floor(owned));
  if (count <= 1) return Math.ceil(first);
  const bulk = (Math.pow(def.costScale, count) - 1) / (def.costScale - 1);
  return Math.ceil(first * bulk);
}

/** Per-echo permanent combat bonus: each echo grants +1 attack and +6 max health, forever. */
export const ECHO_ATK = 1;
export const ECHO_HP = 6;

const GEN_BY_ID: ReadonlyMap<string, GeneratorDef> = new Map(GENERATORS.map((g) => [g.id, g]));
const UPG_BY_ID: ReadonlyMap<string, UpgradeDef> = new Map(UPGRADES.map((u) => [u.id, u]));

export const generatorDef = (id: string): GeneratorDef | undefined => GEN_BY_ID.get(id);
export const upgradeDef = (id: string): UpgradeDef | undefined => UPG_BY_ID.get(id);

/** Geometric bulk cost to buy `count` of a generator that already has `owned`. */
export function generatorCost(def: GeneratorDef, owned: number, count = 1): number {
  const o = Math.floor(owned);
  const first = def.baseCost * Math.pow(def.costScale, o);
  if (count <= 1) return Math.ceil(first);
  const bulk = (Math.pow(def.costScale, count) - 1) / (def.costScale - 1);
  return Math.ceil(first * bulk);
}

/** The central modifier pipeline: every multiplicative production bonus, multiplied. */
export function productionMultiplier(state: GameState): number {
  let m = 1;
  for (const id of state.upgrades) {
    const u = UPG_BY_ID.get(id);
    if (u?.prodMult !== undefined) m *= u.prodMult;
  }
  m *= 1 + ECHO_BONUS * state.echoes;
  m *= Math.max(1, state.boostRateMult);
  return m;
}

/**
 * The avatar's effective attack and max health: a base, plus repeatable combat investment
 * (run-local), plus a permanent bonus per echo. The echo term is the cross-run loop — each
 * rekindle makes the delver flatly stronger, so the next dive reaches deeper than the last.
 */
export function avatarStats(state: GameState): { atk: number; maxHp: number } {
  let atk = 4 + ECHO_ATK * state.echoes;
  let maxHp = 20 + ECHO_HP * state.echoes;
  for (const c of COMBAT_UPGRADES) {
    const n = state.combat[c.id] ?? 0;
    if (n > 0) { atk += (c.atk ?? 0) * n; maxHp += (c.maxHp ?? 0) * n; }
  }
  return { atk, maxHp };
}

/** The echoes-gain multiplier from upgrades (Crow's Eyes, …). */
export function echoMultiplier(state: GameState): number {
  let m = 1;
  for (const id of state.upgrades) {
    const u = UPG_BY_ID.get(id);
    if (u?.echoMult !== undefined) m *= u.echoMult;
  }
  return m;
}

/** The essence/sec the cascade currently yields (tier-1 production × multiplier). */
export function essencePerSecond(state: GameState): number {
  const mult = productionMultiplier(state);
  return (state.gens["torchbearer"] ?? 0) * (GEN_BY_ID.get("torchbearer")!.baseRate) * mult;
}

/** The deltas one economy step of `dt` seconds produces — pure, no clock. */
export interface EconomyDelta {
  essence: number;
  gens: Record<string, number>;
}

/**
 * One explicit-Euler step of the cascade over `dt` seconds. All tiers are read at their
 * pre-step counts (so the step is stable and matches the live tick exactly), production is
 * accumulated as deltas, and applied by the caller. Offline accrual reuses this very function
 * with a larger `dt`/more steps — there is no second, divergent offline formula.
 */
export function stepEconomy(state: GameState, dt: number): EconomyDelta {
  const mult = productionMultiplier(state);
  const gens: Record<string, number> = {};
  let essence = 0;
  for (const def of GENERATORS) {
    const owned = state.gens[def.id] ?? 0;
    if (owned <= 0) continue;
    const produced = owned * def.baseRate * mult * dt;
    if (def.produces === undefined) essence += produced;
    else gens[def.produces] = (gens[def.produces] ?? 0) + produced;
  }
  return { essence, gens };
}

/** Apply a delta to a state, returning a new state (used for offline simulation/tests). */
export function applyDelta(state: GameState, delta: EconomyDelta): GameState {
  const gens = { ...state.gens };
  for (const [id, amt] of Object.entries(delta.gens)) gens[id] = (gens[id] ?? 0) + amt;
  return {
    ...state,
    essence: state.essence + delta.essence,
    lifetimeEssence: state.lifetimeEssence + Math.max(0, delta.essence),
    gens,
  };
}

/**
 * Offline / catch-up accrual: simulate elapsed seconds (capped) as coarse cascade ticks.
 * Coarse-tick simulation is the honest method when production is non-constant (the cascade
 * grows as it runs) — analytic linear grant would understate it. Returns the gained delta.
 */
export function offlineAccrual(state: GameState, elapsedSeconds: number, capSeconds: number, stepSeconds = 30): { delta: EconomyDelta; simulated: number; capped: boolean } {
  const simulated = Math.min(Math.max(0, elapsedSeconds), capSeconds);
  let working = state;
  const total: EconomyDelta = { essence: 0, gens: {} };
  let remaining = simulated;
  while (remaining > 0) {
    const dt = Math.min(stepSeconds, remaining);
    const d = stepEconomy(working, dt);
    total.essence += d.essence;
    for (const [id, amt] of Object.entries(d.gens)) total.gens[id] = (total.gens[id] ?? 0) + amt;
    working = applyDelta(working, d);
    remaining -= dt;
  }
  return { delta: total, simulated, capped: elapsedSeconds > capSeconds };
}

/** A soft cap: linear below `threshold`, then `x^alpha` growth above it. */
export function softCap(x: number, threshold: number, alpha = 0.5): number {
  return x <= threshold ? x : threshold + Math.pow(x - threshold, alpha);
}

// ── pure combat (one tick of a fight on the current floor) ───────────────────────

export interface CombatStep {
  readonly floorHp: number;
  readonly avatarHp: number;
  readonly cleared: boolean;
  readonly died: boolean;
}

/** Resolve one round of combat: the avatar strikes, then the surviving monster strikes back. */
export function combatStep(avatarAtk: number, monsterAtk: number, floorHp: number, avatarHp: number): CombatStep {
  const nextFloorHp = floorHp - avatarAtk;
  if (nextFloorHp <= 0) return { floorHp: 0, avatarHp, cleared: true, died: false };
  const nextAvatarHp = avatarHp - monsterAtk;
  if (nextAvatarHp <= 0) return { floorHp: nextFloorHp, avatarHp: 0, cleared: false, died: true };
  return { floorHp: nextFloorHp, avatarHp: nextAvatarHp, cleared: false, died: false };
}

// ── large-number formatting (legibility across orders of magnitude) ──────────────

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

/** Format a number for display: grouped suffix up to 1e36, scientific beyond. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const sign = n < 0 ? "-" : "";
  const x = Math.abs(n);
  if (x < 1000) return sign + (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const tier = Math.floor(Math.log10(x) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = x / Math.pow(10, tier * 3);
    return `${sign}${scaled.toFixed(2)}${SUFFIXES[tier]}`;
  }
  return sign + x.toExponential(2);
}
