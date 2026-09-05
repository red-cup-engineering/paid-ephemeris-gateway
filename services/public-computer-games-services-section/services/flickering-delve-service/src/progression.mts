/**
 * `progression` — unlocks, the autonomy ladder, and prestige ("rekindle").
 *
 * This is where flickering earns "next-generation". The autonomy ladder is not a set of
 * opaque autobuyer toggles bolted on — each tier folds a *manual action away* and contributes
 * a clause to a **decision program written in the FeltOS relational Lisp** (`strategy.mts`
 * runs it). Early on you click Attack / Descend yourself; you buy auto-attack, then
 * auto-descend, then auto-retreat, then auto-rekindle; by the time you own them all the
 * interface has nothing left to click but **Delve** — and the game has moved into the
 * **strategy editor**, where you tune or rewrite the very Lisp the tick runs for you. Playing
 * became strategizing, exactly as the brief asked, and on a real engine primitive.
 *
 * Prestige is the corpus's renormalization step (idle-games.md §5): the flame gutters out and
 * is rekindled brighter — run state (essence, generators, depth, run-upgrades) collapses into
 * persistent **echoes** that buy a permanent global multiplier and the deepest automations.
 */
import { type GameState, echoMultiplier } from "./economy.mts";

/** A subsystem that stays hidden until its predicate holds — unfolding the state space. */
export interface UnlockDef {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly predicate: (s: GameState) => boolean;
}

/** Minimum deepest-reach before the flame can be rekindled (first prestige is discoverable). */
export const REKINDLE_MIN_DEPTH = 8;

export const UNLOCKS: readonly UnlockDef[] = [
  { id: "shop", label: "Expedition", blurb: "Hire delvers to descend for you.",
    predicate: (s) => s.lifetimeEssence >= 10 },
  { id: "upgrades", label: "Gear", blurb: "Spend essence on lasting improvements.",
    predicate: (s) => s.lifetimeEssence >= 200 },
  { id: "automation", label: "Standing Orders", blurb: "Teach the expedition to act without you.",
    predicate: (s) => s.fameDepth >= 4 || s.lifetimeEssence >= 1_000 },
  { id: "rekindle", label: "Rekindle", blurb: "Let the flame die and rise brighter.",
    predicate: (s) => s.maxDepth >= REKINDLE_MIN_DEPTH },
  { id: "strategy", label: "Strategy", blurb: "Write the orders yourself, in the cave's own tongue.",
    predicate: (s) => s.automations.has("auto-rekindle") },
];

/** Which unlocks are currently revealed for a state. */
export function revealedUnlocks(state: GameState): ReadonlySet<string> {
  const out = new Set<string>();
  for (const u of UNLOCKS) if (u.predicate(state)) out.add(u.id);
  return out;
}

/** One rung of the autonomy ladder: a manual action it folds away + the Lisp clause it adds. */
export interface AutomationDef {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
  readonly currency: "essence" | "echoes";
  readonly blurb: string;
  /** The manual action this automation replaces (folded out of the UI once owned). */
  readonly replaces: string;
  /**
   * The decision clause this tier contributes to the composed strategy, or "" for a standing
   * behavior with no per-tick action (the autobuyer). Lower `order` = higher priority.
   */
  readonly clause: string;
  readonly order: number;
  /** Unlock gate (an unlock id) — undefined means available as soon as `automation` is shown. */
  readonly requires?: string;
}

/**
 * The ladder. Note each clause reads only world cells the relational Lisp can already see
 * (`num self <cell>`) and returns a quoted action symbol — so the composed program is a pure
 * decision function the tick evaluates. The thresholds (`stuck`/`patience`) are real cells the
 * player can tune from the strategy editor, which is what makes the endgame strategic.
 */
export const AUTOMATIONS: readonly AutomationDef[] = [
  { id: "auto-attack", name: "Killing Instinct", cost: 1_500, currency: "essence", replaces: "attack", order: 20,
    clause: "(if (> (number self floor-hp) 0) (quote attack))",
    blurb: "The expedition fights on its own — strikes whatever bars the way." },
  { id: "auto-descend", name: "Sure Footing", cost: 8_000, currency: "essence", replaces: "descend", order: 30,
    clause: "(if (= (number self floor-hp) 0) (quote descend))",
    blurb: "When a floor is cleared, press on without waiting for you." },
  { id: "auto-retreat", name: "Self-Preservation", cost: 30_000, currency: "essence", replaces: "retreat", order: 10,
    clause: "(if (< (number self hp) (* (number self max-hp) 0.3)) (quote retreat))",
    blurb: "Pull back to the surface to mend before the dark takes you." },
  { id: "auto-buy", name: "Quartermaster", cost: 4, currency: "echoes", replaces: "buy", order: 40, requires: "rekindle",
    clause: "",
    blurb: "A quartermaster reinvests essence into the cheapest worthwhile delver." },
  { id: "auto-rekindle", name: "Eternal Return", cost: 12, currency: "echoes", replaces: "ascend", order: 5, requires: "rekindle",
    clause: "(if (> (number self stuck) (number self patience)) (quote rekindle))",
    blurb: "When the descent stalls past your patience, rekindle on your own." },
];

const AUTO_BY_ID: ReadonlyMap<string, AutomationDef> = new Map(AUTOMATIONS.map((a) => [a.id, a]));
export const automationDef = (id: string): AutomationDef | undefined => AUTO_BY_ID.get(id);

/** Whether every rung is owned — the moment the manual UI has nothing left and Delve remains. */
export function fullyAutonomous(state: GameState): boolean {
  return AUTOMATIONS.every((a) => state.automations.has(a.id));
}

/**
 * Compose the decision program. With a `custom` source (the player edited their orders in the
 * strategy editor) that source IS the program. Otherwise the owned tiers' clauses are folded,
 * by priority, into `(or clause… 'wait)` — the first clause whose condition holds decides the
 * tick's action; `'wait` means do nothing this tick.
 */
export function composeStrategy(automations: ReadonlySet<string>, custom?: string): string {
  const trimmed = custom?.trim();
  if (trimmed !== undefined && trimmed !== "") return trimmed;
  const clauses = AUTOMATIONS
    .filter((a) => automations.has(a.id) && a.clause !== "")
    .sort((x, y) => x.order - y.order)
    .map((a) => a.clause);
  if (clauses.length === 0) return "(quote wait)";
  return `(or\n  ${clauses.join("\n  ")}\n  (quote wait))`;
}

// ── prestige: rekindle ───────────────────────────────────────────────────────────

/** Whether the flame may be rekindled now. */
export function canRekindle(state: GameState): boolean {
  return state.maxDepth >= REKINDLE_MIN_DEPTH;
}

/**
 * The echoes a rekindle would grant: a diminishing-returns function of the run's deepest
 * reach, times any echo multiplier (Crow's Eyes). `P = ⌊(maxDepth/8)^1.4 · echoMult⌋`.
 */
export function rekindleReward(state: GameState): number {
  if (!canRekindle(state)) return 0;
  const raw = Math.pow(state.maxDepth / 8, 1.4) * echoMultiplier(state);
  return Math.max(1, Math.floor(raw));
}

/** Which upgrade ids survive a rekindle (the echo-bought, meta upgrades persist). */
export function persistentUpgrades(upgrades: ReadonlySet<string>): Set<string> {
  // Run upgrades (essence-bought) reset; meta upgrades (echo-bought) persist.
  // Cheap to encode here without importing the registry: echo upgrades are namespaced by id.
  const META = new Set(["coyote-charm", "crow-eyes"]);
  return new Set([...upgrades].filter((id) => META.has(id)));
}

/**
 * Rekindle: collapse the run into echoes. Pure — returns the post-prestige state. Run state
 * (essence, generators, depth, maxDepth, run upgrades) resets; echoes (+reward), automations,
 * meta upgrades, fame, and prestige count persist.
 */
export function rekindle(state: GameState): GameState {
  const reward = rekindleReward(state);
  return {
    ...state,
    essence: 0,
    gens: {},
    combat: {},
    depth: 0,
    maxDepth: 0,
    hp: state.maxHp,
    echoes: state.echoes + reward,
    prestigeCount: state.prestigeCount + 1,
    upgrades: persistentUpgrades(state.upgrades),
    // fameDepth, lifetimeEssence, automations carry through unchanged via the spread.
  };
}
