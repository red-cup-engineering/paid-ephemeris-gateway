/**
 * `tiers` — the ladder itself, as data (DESIGN.md §1's table, made executable). Ten tiers, each
 * gated by two independent things that must BOTH be satisfied before `unlockTier` (`intents.mts`)
 * will succeed:
 *
 *   1. An Insight cost, `INSIGHT_COST(n) = 2^(n-1)` — an authored, doubling curve, disclosed
 *      `designed-flavor` exactly like Stoke's own `STARTING_STOCK_PER_BANKED_LAMBDA`. Never
 *      claimed to be derived from anything; chosen for pacing.
 *   2. A narrative crossing (`content.mts::TIER_CROSSINGS`) — a one-time IF beat the player must
 *      answer. Never skippable by Insight alone, and never a right-answer gate: every offered
 *      answer is honest and opens the door (DESIGN.md §4's own rule about crossings).
 *
 * Tiers unlock strictly in order — `canUnlockTier` refuses tier n+2 while tier n+1 is still
 * locked, so `tiersUnlocked` in `state.mts` is always a prefix of `[1..10]`, never a set with a
 * gap in it.
 */
import type { TierId } from "./state.mts";
import { TIER_IDS } from "./state.mts";
import { authored, type Tagged } from "./provenance.mts";

export type CognitiveCapability =
  | "memory"
  | "pattern-recognition"
  | "exploration-exploitation"
  | "abstraction"
  | "self-model"
  | "theory-of-mind"
  | "value-alignment"
  | "reflective-equilibrium"
  | "teaching";

export interface TierDefinition {
  readonly id: TierId;
  readonly name: string;
  readonly mechanic: string;
  readonly concept: string;
  readonly capability: CognitiveCapability | "baseline";
}

export const TIER_DEFINITIONS: readonly TierDefinition[] = [
  { id: 1, name: "Reflex", mechanic: "Click makes widget. No node, no edge, no register anything reads.", concept: "Baseline — legible only in retrospect, once tier 2 breaks it.", capability: "baseline" },
  { id: 2, name: "Memory", mechanic: "Build your first node; connect your first edge.", concept: "Feedback loops: compounding vs. linear growth.", capability: "memory" },
  { id: 3, name: "Pattern", mechanic: "Multiple faculties draw from one scarce, shared Attention pool with concave marginal yield.", concept: "Diminishing returns / marginal allocation.", capability: "pattern-recognition" },
  { id: 4, name: "Exploration", mechanic: "Unlabeled candidate processes with hidden, seed-fixed yields; sample before committing.", concept: "Exploration-exploitation tradeoff.", capability: "exploration-exploitation" },
  { id: 5, name: "Abstraction", mechanic: "Record a sequence of intents as a named policy; replay it cheaper than the raw sequence.", concept: "Compression-as-understanding.", capability: "abstraction" },
  { id: 6, name: "Self-model", mechanic: "An introspection console: your own objective becomes an editable, inspected object.", concept: "Goodhart's law, from the inside.", capability: "self-model" },
  { id: 7, name: "Model-of-others", mechanic: "Predict another agent's next order, confidence-weighted, scored by a proper scoring rule.", concept: "Theory of mind.", capability: "theory-of-mind" },
  { id: 8, name: "Values", mechanic: "The scalar objective is retired; a multi-objective weight vector replaces it, on a real Pareto frontier.", concept: "Value alignment.", capability: "value-alignment" },
  { id: 9, name: "Reflection", mechanic: "Reflect: bank (lambda, mixture), reset the Widget graph, keep the cognition ladder.", concept: "Reflective equilibrium.", capability: "reflective-equilibrium" },
  { id: 10, name: "Integration", mechanic: "Spawn a child instance seeded from your own accumulated state; write one line into the margin.", concept: "Teaching as compression's dual.", capability: "teaching" },
];

export function tierDefinition(id: TierId): TierDefinition {
  const def = TIER_DEFINITIONS.find((t) => t.id === id);
  if (def === undefined) throw new RangeError(`tierDefinition: no definition for tier ${String(id)}`);
  return def;
}

/** `INSIGHT_COST(n) = 2^(n-1)`: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512. Strictly increasing —
 *  `tiers.test.mts` checks this monotonicity directly rather than trusting the formula's shape by
 *  eyeballing it. Disclosed `designed-flavor`: a chosen pacing curve, not derived from anything. */
export function insightCost(tier: TierId): Tagged<number> {
  const value = 2 ** (tier - 1);
  return authored(value, `tier ${String(tier)} unlock cost: doubling curve 2^(tier-1), an authored pacing choice`);
}

/** True iff every tier strictly before `tier` is already unlocked — the sequential-order rule.
 *  Tier 1 is always unlocked (the starting state). */
export function priorTiersUnlocked(tiersUnlocked: readonly TierId[], tier: TierId): boolean {
  if (tier === 1) return true;
  const idx = TIER_IDS.indexOf(tier);
  const previous = TIER_IDS[idx - 1];
  return previous !== undefined && tiersUnlocked.includes(previous);
}

export interface UnlockCheck {
  readonly ok: boolean;
  readonly reason?: string;
}

export function canUnlockTier(
  tiersUnlocked: readonly TierId[],
  insight: number,
  crossingAnswered: boolean,
  tier: TierId,
): UnlockCheck {
  if (tiersUnlocked.includes(tier)) return { ok: false, reason: "tier-already-unlocked" };
  if (!priorTiersUnlocked(tiersUnlocked, tier)) return { ok: false, reason: "prior-tier-locked" };
  if (insight < insightCost(tier).value) return { ok: false, reason: "insufficient-insight" };
  if (!crossingAnswered) return { ok: false, reason: "crossing-not-answered" };
  return { ok: true };
}
