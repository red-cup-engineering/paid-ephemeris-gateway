/**
 * bateson — Gregory Bateson's DOUBLE BIND and SCHISMOGENESIS, the marginal cybernetic-anthropology
 * lens that turns out to be the PARENT of structures already in the package (frontier register §1).
 *
 * A DOUBLE BIND (Bateson 1956) is not a mere contradiction. It is contradictory injunctions issued at
 * DIFFERENT LOGICAL LEVELS over the same matter, from which the subject cannot escape and on which it
 * cannot metacommunicate. In governance terms: a `require` at one Hart/Ostrom level and a `forbid` at
 * another (a CROSS-LEVEL ⊤, distinct from a same-level inconsistency the collective could simply hold
 * open) combined with a foreclosed exit. The savior–slave subject is the authority-fiber special case;
 * the double bind is the general form across any fiber.
 *
 * SCHISMOGENESIS is Bateson's runaway differentiation: symmetrical (each side escalates the SAME move —
 * mutual one-upmanship → polarization, the Friedkin–Johnsen spread growing without bound) or
 * complementary (one side's dominance and the other's submission each amplify the other → concentration
 * growing, coagulation). Unchecked, both diverge to rupture; a regulating check halts them.
 *
 * Pure readings over the Hart/Ostrom levels (`deciding.mts`) and scalar trajectories of spread /
 * concentration (read off `opinion.mts` / `coagulationGuard`); re-derives nothing.
 */
import type { GovernanceLevel } from "./deciding.mjs";

/** A leveled injunction on an agent: a demand to `require` or `forbid` an action over a scope, issued at
 *  a particular governance level (operational / collective-choice / constitutional). */
export interface Injunction {
  readonly agent: string;
  readonly scope: string;
  readonly level: GovernanceLevel;
  readonly polarity: "require" | "forbid";
}

/** The double-bind reading for an agent over a scope. */
export interface DoubleBind {
  readonly kind: "socializing.double-bind";
  readonly agent: string;
  readonly scope: string;
  /** the distinct levels at which injunctions over the scope were issued. */
  readonly levels: readonly GovernanceLevel[];
  /** a CROSS-LEVEL contradiction: required at one level and forbidden at a DIFFERENT level (not a
   *  same-level inconsistency, which the collective could simply hold as ⊤). */
  readonly crossLevel: boolean;
  /** the agent can escape — refuse, leave, or metacommunicate (the exit is open). */
  readonly escapable: boolean;
  /** the DOUBLE BIND: a cross-level contradiction the agent cannot escape. The general form of which the
   *  savior–slave subject is the authority-fiber instance. */
  readonly bound: boolean;
}

/**
 * doubleBind — detect a Batesonian double bind on an agent over a scope: a cross-level contradiction
 * (required at one Hart/Ostrom level, forbidden at another) that the agent cannot escape (`escapable`
 * false — no admissible refusal/exit/metacommunication). A same-level contradiction is not a bind; it is
 * an honest ⊤ the collective may hold open. The bind is exactly cross-level ⊤ ∧ ¬escapable.
 */
export function doubleBind(
  injunctions: readonly Injunction[],
  agent: string,
  scope: string,
  escapable: boolean,
): DoubleBind {
  const relevant = injunctions.filter((injunction) => injunction.agent === agent && injunction.scope === scope);
  const requiredAt = new Set<GovernanceLevel>(relevant.filter((i) => i.polarity === "require").map((i) => i.level));
  const forbiddenAt = new Set<GovernanceLevel>(relevant.filter((i) => i.polarity === "forbid").map((i) => i.level));
  let crossLevel = false;
  for (const r of requiredAt) for (const f of forbiddenAt) if (r !== f) crossLevel = true;
  return Object.freeze({
    kind: "socializing.double-bind" as const,
    agent,
    scope,
    levels: Object.freeze([...new Set(relevant.map((i) => i.level))]),
    crossLevel,
    escapable,
    bound: crossLevel && !escapable,
  });
}

/** One sample of a differentiation trajectory: the opinion spread and the power concentration at a stage. */
export interface DifferentiationSample {
  /** the max−min opinion spread (from opinion dynamics) — the symmetrical/polarization axis. */
  readonly spread: number;
  /** the power concentration (from the coagulation guard) — the complementary/dominance axis. */
  readonly concentration: number;
}

/** The schismogenesis reading over a differentiation trajectory. */
export interface Schismogenesis {
  readonly kind: "socializing.schismogenesis";
  /** the dominant pattern: `symmetrical` (spread escalating — polarization), `complementary`
   *  (concentration escalating — dominance/submission), or `none`. */
  readonly pattern: "symmetrical" | "complementary" | "none";
  readonly spreadRise: number;
  readonly concentrationRise: number;
  /** RUNAWAY: the escalating axis rose monotonically across the whole trajectory — no regulating check
   *  halted the differentiation, the Batesonian path to rupture. */
  readonly runaway: boolean;
}

function monotoneNondecreasing(series: readonly number[]): boolean {
  for (let i = 1; i < series.length; i += 1) if (series[i]! < series[i - 1]! - 1e-12) return false;
  return true;
}

/**
 * schismogenesis — classify a differentiation trajectory as symmetrical (mutual escalation → growing
 * spread / polarization) or complementary (dominance/submission → growing concentration / coagulation),
 * and flag it RUNAWAY when the escalating axis rose monotonically with no regulating check — the
 * unchecked path to schism.
 */
export function schismogenesis(trajectory: readonly DifferentiationSample[]): Schismogenesis {
  if (trajectory.length < 2) {
    return Object.freeze({ kind: "socializing.schismogenesis" as const, pattern: "none", spreadRise: 0, concentrationRise: 0, runaway: false });
  }
  const first = trajectory[0]!;
  const last = trajectory[trajectory.length - 1]!;
  const spreadRise = last.spread - first.spread;
  const concentrationRise = last.concentration - first.concentration;
  const pattern: Schismogenesis["pattern"] = spreadRise <= 0 && concentrationRise <= 0
    ? "none"
    : spreadRise >= concentrationRise ? "symmetrical" : "complementary";
  const axis = pattern === "symmetrical" ? trajectory.map((s) => s.spread) : trajectory.map((s) => s.concentration);
  const rise = pattern === "symmetrical" ? spreadRise : concentrationRise;
  return Object.freeze({
    kind: "socializing.schismogenesis" as const,
    pattern,
    spreadRise,
    concentrationRise,
    runaway: pattern !== "none" && rise > 0 && monotoneNondecreasing(axis),
  });
}
