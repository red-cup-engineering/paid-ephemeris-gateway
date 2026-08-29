/**
 * `strategy` — run a player's automation as a FizzOS relational-Lisp decision program.
 *
 * The autonomy ladder (`progression.mts`) composes the owned rungs into a Lisp program; the
 * endgame strategy editor lets the player rewrite that program by hand. Either way this module
 * is how the tick *consults* it: read the source, evaluate it against the player's world fiber,
 * and take the program's value — a single action symbol — as the decision for this tick.
 *
 * Two properties make running arbitrary player code safe, both inherited from the engine:
 *   1. **Bounded** — the Lisp evaluator carries a hard step budget (`MAX_STEPS`), so no program
 *      a player writes can hang the sole-writer tick.
 *   2. **Effect-free** — we evaluate against the (immutable) world and throw the threaded result
 *      away, taking ONLY the returned action symbol; even a program that calls `set`/`move`
 *      cannot change the authoritative world here. The scene then applies the decided action
 *      through its own trusted, validated handlers. So a custom strategy can *decide*, never
 *      *cheat*.
 */
import { readLisp, runLisp } from "@red-cup-engineering/fizzos/lisp";
import { createWorld } from "@red-cup-engineering/fizzos/world";

type SExpr = null | boolean | number | string | readonly SExpr[];
type World = ReturnType<typeof createWorld>;

/** The only actions a strategy may decide — anything else collapses to a safe `wait`. */
export const STRATEGY_ACTIONS = ["attack", "descend", "retreat", "rekindle", "buy", "wait"] as const;
export type StrategyAction = (typeof STRATEGY_ACTIONS)[number];

const ACTIONS = new Set<string>(STRATEGY_ACTIONS);

/**
 * A minimal `Content` for the Lisp context. The strategy clauses only ever read numeric cells
 * (`num self <cell>`) and do arithmetic/logic — they never touch rooms/ships — so an empty
 * content surface is sufficient, and keeps the decision sandbox from depending on world prose.
 */
export interface StrategyDecision {
  readonly action: StrategyAction;
  readonly log: readonly string[];
}

function symName(v: SExpr): string {
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && !Array.isArray(v) && "sym" in v) return (v as { sym: string }).sym;
  return "wait";
}

/** Coerce any program value to a whitelisted action; unknown/empty → `wait`. */
export function normalizeAction(value: SExpr): StrategyAction {
  const name = symName(value).trim().toLowerCase();
  return (ACTIONS.has(name) ? name : "wait") as StrategyAction;
}

/**
 * Decide this tick's action for `self` by evaluating `program` against `world`. The world is
 * read-only here (mutations are discarded); only the whitelisted action symbol escapes. A
 * parse/eval error or step-budget exhaustion is non-fatal — it simply yields `wait`.
 */
export function decideAction(program: string, world: World, self: string): StrategyDecision {
  try {
    const result = runLisp(readLisp(program), { world, self }, { fuel: 1_000 });
    return { action: normalizeAction(result.value as SExpr), log: result.effects.map((effect) => effect.kind) };
  } catch {
    return { action: "wait", log: [] };
  }
}

export interface StrategyValidation {
  readonly ok: boolean;
  readonly error?: string;
  /** The action the program decides against a fresh, empty world (for editor preview). */
  readonly preview?: StrategyAction;
}

/**
 * Validate a player-authored strategy for the editor: it must parse and evaluate without
 * throwing. We can't import the live `world` here, so validation runs against the smallest
 * possible world (an empty fiber); the preview action is informational.
 */
export function validateStrategy(program: string, emptyWorld: World, self = "preview"): StrategyValidation {
  try {
    if (program.trim() === "") return { ok: false, error: "empty program" };
    const result = runLisp(readLisp(program), { world: emptyWorld, self }, { fuel: 1_000 });
    return { ok: true, preview: normalizeAction(result.value as SExpr) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
