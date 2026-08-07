/**
 * Polarity — Player/Opponent duality, the $(-)^\perp$ of concurrent game systems,
 * realized as a Belnap class of the meme-algebra bilattice charge.
 *
 * The theory-of-computing claim (CGS is the theory of computing) makes
 * Player/Opponent duality the dualizing operation $(-)^\perp$ of the
 * $*$-autonomous category $\mathbf{CGS}$.  The ludics journal pins the
 * correspondence to the charge exactly:
 *
 *   - positive polarity (Proponent / Player commits "told true")  ↔ $t = (1,0)$ ↔ charge `potential`
 *   - negative polarity (Opponent     commits "told false")       ↔ $f = (0,1)$ ↔ charge `active`
 *
 * So a polarity IS a charge value, and the dual $(-)^\perp$ that swaps Player
 * and Opponent IS the meme-algebra gauge `negate`: it swaps the truth/falsity
 * coordinates, carrying `potential` to `active` and back.  We do not reinvent
 * duality; we borrow the apex's negation.
 */
import {
  type ChargeValue,
  chargeValue,
  negateValue,
  sameChargeValue,
} from "@emsenn/relating";

export type PolarityName = "positive" | "negative";

export interface Polarity {
  readonly kind: "game.polarity";
  readonly name: PolarityName;
}

const POSITIVE: Polarity = Object.freeze({ kind: "game.polarity" as const, name: "positive" as const });
const NEGATIVE: Polarity = Object.freeze({ kind: "game.polarity" as const, name: "negative" as const });

export const polarityNames = (): readonly PolarityName[] =>
  Object.freeze(["positive", "negative"] as const satisfies readonly PolarityName[]);

export function polarity(name: PolarityName): Polarity {
  return name === "positive" ? POSITIVE : NEGATIVE;
}

export const positive = (): Polarity => POSITIVE;
export const negative = (): Polarity => NEGATIVE;

export const polarityName = (p: Polarity): PolarityName => p.name;

/** Player/Opponent duality $(-)^\perp$: swaps Proponent and Opponent. */
export function dual(p: Polarity): Polarity {
  return p.name === "positive" ? NEGATIVE : POSITIVE;
}

export const samePolarity = (left: Polarity, right: Polarity): boolean => left.name === right.name;

/**
 * The Belnap charge of a polarity — the meme-apex shadow of the game object.
 * positive ↦ potential = (told-true), negative ↦ active = (told-false).
 */
export function polarityCharge(p: Polarity): ChargeValue {
  return chargeValue(p.name === "positive" ? "potential" : "active");
}

/**
 * Recover the polarity committed by a charge value, where one is committed.
 * `potential` (t) is positive, `active` (f) is negative; the give-up value
 * `stable` ($\top$) and the no-action value `absurd` ($\bot$) commit no polarity.
 */
export function chargePolarity(value: ChargeValue): Polarity | null {
  if (sameChargeValue(value, chargeValue("potential"))) return POSITIVE;
  if (sameChargeValue(value, chargeValue("active"))) return NEGATIVE;
  return null;
}

export function isPolarityName(value: unknown): value is PolarityName {
  return value === "positive" || value === "negative";
}

export function isPolarity(value: unknown): value is Polarity {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Polarity>;
  return candidate.kind === "game.polarity" && isPolarityName(candidate.name);
}

export function asPolarity(value: unknown): Polarity {
  if (isPolarity(value)) return value;
  if (isPolarityName(value)) return polarity(value);
  throw new TypeError(`not a game polarity: ${JSON.stringify(value)} (expected one of ${polarityNames().join(", ")})`);
}

/**
 * Witness that $(-)^\perp$ on polarity coincides with `negate` on the charge:
 * `polarityCharge(dual(p))` equals `negateValue(polarityCharge(p))` for every p.
 * The dualizing operation of the game is the gauge negation of the apex.
 */
export interface DualityIsNegationWitness {
  readonly kind: "game.polarity.dualityIsNegation:witness";
  readonly polarity: Polarity;
  readonly dualCharge: ChargeValue;
  readonly negatedCharge: ChargeValue;
}

export interface DualityIsNegationObstruction {
  readonly kind: "game.polarity.dualityIsNegation-obstruction";
  readonly polarity: Polarity;
  readonly dualCharge: ChargeValue;
  readonly negatedCharge: ChargeValue;
}

export type DualityIsNegationJudgment = DualityIsNegationWitness | DualityIsNegationObstruction;

export function dualityIsNegation(p: Polarity): DualityIsNegationJudgment {
  const dualCharge = polarityCharge(dual(p));
  const negatedCharge = negateValue(polarityCharge(p));
  return sameChargeValue(dualCharge, negatedCharge)
    ? Object.freeze({ kind: "game.polarity.dualityIsNegation:witness" as const, polarity: p, dualCharge, negatedCharge })
    : Object.freeze({ kind: "game.polarity.dualityIsNegation-obstruction" as const, polarity: p, dualCharge, negatedCharge });
}
