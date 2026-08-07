/**
 * Derivation provenance — the finite-restriction record beneath every CGS
 * declaration the computer makes.
 *
 * SPOTCOMP's CGS specification (`spotcomp/.../cgs/specification.md` §1) fixes the
 * derivation direction
 *
 *   $$\text{aperiodic articulating} \to \text{transfinite predicating} \to
 *     \text{Scott-continuous positing} \to \text{finite settling}$$
 *
 * and states that "CGS declarations at finite record boundaries are therefore
 * witnesses of a downstream restriction, not the source of the game-semantic
 * object. A finite event table can present an arena only when the upstream stage
 * and regime obligations remain available." So every arena the computer observes
 * and every move it runs carries this provenance: the four upstream stages it
 * restricts from, the settled events that became polarized arena events, and the
 * settled cells that committed no polarity (`absurd`/`stable`) and are therefore
 * kept as audit evidence rather than play (spec §3, "rejected admission when the
 * rejection is used as conflict or audit evidence").
 */

/** The four upstream derivation stages, in order, that a finite CGS object restricts from. */
export type DerivationStage = "articulating" | "predicating" | "positing" | "settling";

export const derivationStages = (): readonly DerivationStage[] =>
  Object.freeze(["articulating", "predicating", "positing", "settling"] as const);

/**
 * The provenance of a finite CGS observation: the upstream stages it restricts
 * from, the settled events that became polarized arena events, and the audited
 * cells (settled but polarity-uncommitted) retained as evidence.
 */
export interface DerivationProvenance {
  readonly kind: "computing.computer.provenance";
  readonly stages: readonly DerivationStage[];
  /** Settled events that committed a polarity and became arena events. */
  readonly observedEvents: readonly string[];
  /** Settled cells whose charge committed no polarity (`absurd`/`stable`): audit evidence, not play. */
  readonly auditedCells: readonly string[];
}

export function derivationProvenance(
  observedEvents: readonly string[],
  auditedCells: readonly string[],
): DerivationProvenance {
  return Object.freeze({
    kind: "computing.computer.provenance" as const,
    stages: derivationStages(),
    observedEvents: Object.freeze([...observedEvents]),
    auditedCells: Object.freeze([...auditedCells]),
  });
}

export function isDerivationProvenance(value: unknown): value is DerivationProvenance {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DerivationProvenance>;
  return candidate.kind === "computing.computer.provenance";
}
