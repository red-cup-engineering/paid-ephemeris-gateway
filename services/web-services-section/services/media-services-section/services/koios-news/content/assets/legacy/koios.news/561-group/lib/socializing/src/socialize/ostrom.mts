/**
 * ostrom — socializing's OSTROM capabilities: the Institutional Analysis and Development (IAD)
 * rule-grid, the eight design principles for enduring commons governance, graduated sanctions, and
 * polycentric nesting. Elinor Ostrom's empirical findings on how communities self-govern shared
 * resources WITHOUT a kyriarchist sovereign — the most directly applicable mode for organizing a
 * commons of agentic labor (a shared pool of work an agent swarm draws on and replenishes).
 *
 * Grounded in content/_archive .../what-is-the-theory-of-governance.md (the Ostrom-IAD 7×3 grid and
 * the eight design principles; polycentric governance survey). These consume relating's COMPLEX
 * MATH rather than re-deriving it:
 *   - graduated sanctions are a monotone DESCENT in the bilattice TRUTH ORDER ≤_t (relating's
 *     `meetTruthValue`): each violation lowers the offender's standing toward f (removal), the
 *     escalation Ostrom's principle 5 prescribes over a binary punish/not.
 *   - polycentricity is read through the graph LAPLACIAN (socializing's `spectralConsensus`:
 *     Matrix-Tree spanning-tree robustness + H⁰ cluster count) and the network-sheaf H¹
 *     (`sheafCharges`): nested enterprises cohere when the centers glue (H¹=0) yet stay plural
 *     and redundantly connected (robust).
 */
import {
  charge,
  chargeValue,
  meetTruthValue,
  type ChargeCarrier,
  type ChargeValueName,
} from "@emsenn/relating";

import { sheafCharges, spectralConsensus, type ObserverEdge } from "./consensus.mjs";
import type { JuralRelation } from "./govern.mjs";
import { GOVERNANCE_LEVELS, type GovernanceLevel } from "./deciding.mjs";

// ── IAD rule grid (the 7 rule-types × 3 levels) ──

/** Ostrom's seven types of rules-in-use that structure any action situation (IAD framework). */
export const OSTROM_RULE_TYPES = Object.freeze([
  "boundary",     // who participates
  "position",     // what positions exist
  "choice",       // what actions a position may take
  "aggregation",  // how individual choices become collective outcomes
  "information",  // what is available to whom (monitoring)
  "payoff",       // what costs/benefits attach to outcomes
  "scope",        // what outcomes are in the situation
] as const);
export type OstromRuleType = typeof OSTROM_RULE_TYPES[number];

/** One rule-in-use, located in the IAD grid: its type (one of seven) and the level it operates at
 *  (operational / collective-choice / constitutional — each rule-type is modifiable at each level). */
export interface IADRule {
  readonly ruleType: OstromRuleType;
  readonly level: GovernanceLevel;
}

/** The IAD rule grid — the Z/7 × Z/3 graded census of a governance's rules-in-use (the governance
 *  file's "M_G is graded by rule-type as well as by level"). Reads which of the 21 (type, level)
 *  cells are populated and the marginal counts. */
export interface IADGrid {
  readonly kind: "socializing.iad-grid";
  /** count of rules at each `${ruleType}:${level}` cell (only non-empty cells listed). */
  readonly cells: Readonly<Record<string, number>>;
  /** distinct populated cells of the 21-cell grid. */
  readonly populated: number;
  /** marginal count per rule-type. */
  readonly byType: Readonly<Record<OstromRuleType, number>>;
  /** marginal count per level. */
  readonly byLevel: Readonly<Record<GovernanceLevel, number>>;
}

/** Census a governance's rules-in-use into the IAD grid. */
export function iadGrid(rules: readonly IADRule[]): IADGrid {
  const cells: Record<string, number> = {};
  const byType = Object.fromEntries(OSTROM_RULE_TYPES.map((t) => [t, 0])) as Record<OstromRuleType, number>;
  const byLevel = Object.fromEntries(GOVERNANCE_LEVELS.map((l) => [l, 0])) as Record<GovernanceLevel, number>;
  for (const rule of rules) {
    const key = `${rule.ruleType}:${rule.level}`;
    cells[key] = (cells[key] ?? 0) + 1;
    byType[rule.ruleType] += 1;
    byLevel[rule.level] += 1;
  }
  return Object.freeze({
    kind: "socializing.iad-grid" as const,
    cells: Object.freeze(cells),
    populated: Object.keys(cells).length,
    byType: Object.freeze(byType),
    byLevel: Object.freeze(byLevel),
  });
}

// ── Graduated sanctions (Ostrom principle 5) as a truth-order descent ──

/** The escalated result of applying a graduated sanction ladder for a number of violations. */
export interface Sanction {
  readonly kind: "socializing.sanction";
  /** how far up the ladder the offender has climbed (0 = no sanction). */
  readonly rung: number;
  /** the rung's prescribed action (`none` at rung 0). */
  readonly label: string;
  /** the offender's standing after the ≤_t descent: `potential` (good standing), `absurd`
   *  (diminished — an intermediate graduated rung), `active` (f — removed at the top rung). */
  readonly standing: ChargeValueName;
  /** the standing reached f (the top of the ladder) — the offender is removed. */
  readonly removed: boolean;
}

/**
 * graduatedSanction — Ostrom's principle 5 (graduated, not binary, sanctions): escalate a sanction
 * across a ladder as violations accumulate. Realized as a monotone DESCENT in the bilattice TRUTH
 * ORDER ≤_t via relating's `meetTruthValue`: each violation meets the offender's standing with a
 * penalty, lowering it from `potential` (good standing) through `absurd` (a diminished intermediate
 * rung) to `active` (f — removal) at the top of the ladder. Escalation is graduated because the
 * descent is monotone and bounded, never jumping straight from good standing to removal.
 */
export function graduatedSanction(ladder: readonly string[], violations: number): Sanction {
  const rung = Math.max(0, Math.min(violations, ladder.length));
  let standing: ChargeValueName = "potential";
  for (let step = 1; step <= rung; step += 1) {
    // the final rung removes (descend to f); earlier rungs diminish (descend to ⊥) — a graduated,
    // monotone ≤_t descent rather than a binary jump.
    const penalty: ChargeValueName = step >= ladder.length ? "active" : "absurd";
    standing = meetTruthValue(chargeValue(standing), chargeValue(penalty)).name;
  }
  return Object.freeze({
    kind: "socializing.sanction" as const,
    rung,
    label: rung === 0 ? "none" : ladder[rung - 1]!,
    standing,
    removed: standing === "active",
  });
}

// ── Polycentricity / nested enterprises (Ostrom principle 8) via the graph Laplacian + sheaf H¹ ──

/** The polycentric coherence of a set of decision centers — Ostrom's nested enterprises. */
export interface Polycentricity {
  readonly kind: "socializing.polycentricity";
  /** the number of decision centers (sub-governances) over the shared cells. */
  readonly centers: number;
  /** POLYCENTRIC — more than one center (not a single monocentric sovereign). */
  readonly polycentric: boolean;
  /** spectral H⁰ — independent agreement clusters among the centers (Laplacian zero-eigenvalue
   *  multiplicity). One cluster ⟺ the centers cohere into a single nested system. */
  readonly clusters: number;
  /** Matrix-Tree spanning-tree redundancy — the nested arrangement is RESILIENT (overlapping
   *  jurisdictions provide redundant agreement paths; a lost link does not fragment it). */
  readonly robust: boolean;
  /** network-sheaf H¹ — the disagreement obstruction among the centers; 0 ⟺ they glue. */
  readonly obstruction: number;
  /** the centers COHERE: plural (polycentric), connect into ONE agreement cluster (spectral H⁰=1),
   *  AND glue with no disagreement obstruction (sheaf H¹=0) — the enduring nested-enterprise
   *  condition (many overlapping centers, one coherent commons). */
  readonly coheres: boolean;
}

/**
 * polycentricCoherence — read whether a set of decision centers forms an enduring POLYCENTRIC,
 * NESTED system (Ostrom's principle 8 + polycentric governance). Consumes relating's graph math
 * through socializing's `spectralConsensus` (the substrate-graph Laplacian: H⁰ cluster count and the
 * Matrix-Tree spanning-tree robustness) and `sheafCharges` (the H¹ disagreement obstruction). A
 * healthy polycentric commons is plural (>1 center), coheres (H¹=0), and is robust (redundant
 * overlap) — distinct from a fragile single thread or a fragmented set of non-gluing centers.
 */
export function polycentricCoherence(
  centerCharges: readonly ChargeCarrier[],
  edges?: readonly ObserverEdge[],
): Polycentricity {
  const spectral = spectralConsensus(centerCharges, edges);
  const sheaf = sheafCharges(centerCharges, edges);
  return Object.freeze({
    kind: "socializing.polycentricity" as const,
    centers: centerCharges.length,
    polycentric: centerCharges.length > 1,
    clusters: spectral.clusters,
    robust: spectral.robust,
    obstruction: sheaf.obstruction,
    coheres: centerCharges.length > 1 && spectral.clusters === 1 && sheaf.obstruction === 0,
  });
}

/** Build the decision-center charges from a list of per-center alignment standings — a convenience
 *  for `polycentricCoherence` when the centers are described by their FOUR alignment value. */
export function centerCharges(alignments: readonly ChargeValueName[]): readonly ChargeCarrier[] {
  return Object.freeze(alignments.map((value) => charge(chargeValue(value))));
}

// ── The eight design principles for enduring commons governance ──

/** A description of a commons governance, sufficient to evaluate Ostrom's eight design principles. */
export interface CommonsInstitution {
  /** the IAD-typed rules-in-use. */
  readonly rules: readonly IADRule[];
  /** the jural relations binding members (for monitoring detection). */
  readonly relations: readonly JuralRelation[];
  /** the graduated-sanction ladder (depth > 1 satisfies principle 5). */
  readonly sanctionLadder: readonly string[];
  /** the polycentric arrangement of nested centers (principle 8). */
  readonly polycentricity: Polycentricity;
  /** a low-cost local conflict-resolution mechanism exists (principle 6). */
  readonly conflictResolution: boolean;
  /** external authorities recognize the members' right to organize (principle 7). */
  readonly externallyRecognized: boolean;
}

/** The eight-principle diagnostic of an enduring commons institution. */
export interface OstromDiagnostic {
  readonly kind: "socializing.ostrom-diagnostic";
  /** P1 — clearly defined boundaries (who is in, what the resource is): a boundary rule exists. */
  readonly clearBoundaries: boolean;
  /** P2 — congruence between rules and local conditions: payoff AND scope rules both present. */
  readonly congruence: boolean;
  /** P3 — collective-choice arrangements: those affected can modify the rules (a collective-choice-level rule). */
  readonly collectiveChoice: boolean;
  /** P4 — monitoring: monitors (accountable to the members) watch conditions and behavior. */
  readonly monitoring: boolean;
  /** P5 — graduated sanctions: escalating, not binary (a ladder of depth > 1). */
  readonly graduatedSanctions: boolean;
  /** P6 — conflict-resolution mechanisms: rapid, low-cost local arbitration. */
  readonly conflictResolution: boolean;
  /** P7 — minimal recognition of the right to organize: external authority does not deny it. */
  readonly rightToOrganize: boolean;
  /** P8 — nested enterprises: governance organized in multiple polycentric, cohering layers. */
  readonly nestedEnterprises: boolean;
  /** how many of the eight principles hold. */
  readonly satisfied: number;
  /** all eight hold — the empirical profile of an enduring (robust) commons institution. */
  readonly enduring: boolean;
}

/**
 * ostromDiagnostic — score a commons governance against Ostrom's eight design principles for
 * long-enduring common-pool-resource institutions. Each principle is a STRUCTURAL predicate over the
 * institution's IAD grid, jural relations, sanction ladder, and polycentric coherence — so the
 * diagnostic composes the other Ostrom capabilities (the grid, graduatedSanction's ladder,
 * polycentricCoherence's spectral+sheaf reading) rather than asking for opinions. An institution
 * satisfying all eight is the empirically-attested profile of a commons that endures without a
 * kyriarchist sovereign — the target for a self-governing swarm of agentic labor.
 */
export function ostromDiagnostic(institution: CommonsInstitution): OstromDiagnostic {
  const grid = iadGrid(institution.rules);
  const monitoring = grid.byType.information > 0
    || institution.relations.some((relation) =>
      (relation.kind === "duty" || relation.kind === "power")
      && relation.standing !== "active"
      && relation.scope.includes("monitor"));

  const principles = {
    clearBoundaries: grid.byType.boundary > 0,
    congruence: grid.byType.payoff > 0 && grid.byType.scope > 0,
    collectiveChoice: grid.byLevel["collective-choice"] > 0,
    monitoring,
    graduatedSanctions: institution.sanctionLadder.length > 1,
    conflictResolution: institution.conflictResolution,
    rightToOrganize: institution.externallyRecognized,
    nestedEnterprises: institution.polycentricity.polycentric && institution.polycentricity.coheres,
  } as const;

  const satisfied = Object.values(principles).filter(Boolean).length;
  return Object.freeze({
    kind: "socializing.ostrom-diagnostic" as const,
    ...principles,
    satisfied,
    enduring: satisfied === 8,
  });
}
