/**
 * Polarity and focusing — Andreoli's classification of the CLL connectives.
 *
 * Focused proof search (Andreoli 1992, "Logic programming with focusing proofs in
 * linear logic") splits the connectives into POSITIVE (synchronous: $\otimes$, $1$,
 * $\oplus$, $0$, $!$) and NEGATIVE (asynchronous: $\parr$, $\bot$, $\mathbin{\&}$,
 * $\top$, $?$). In the CGS reading this polarity IS the Player/Opponent polarity
 * of game-algebra: positive connectives are those at which Player must act
 * (commit a move), negative connectives are those at which Opponent acts. We
 * REUSE the game-algebra `Polarity` carrier rather than minting a new enum — the
 * focusing polarity of a connective is a `positive()`/`negative()` of the same
 * apex shadow that polarizes events.
 *
 * The De Morgan duality of `dualProp` and the Andreoli polarity cohere: each
 * connective's dual has the opposite focusing polarity, so
 * `polarityOfConnective(dualConnective c) = dual(polarityOfConnective c)`. This
 * is a free witness, mirroring `dualityIsNegation` in game-algebra's polarity
 * module: the dualizing operation $(-)^\perp$ is the gauge negation of focusing.
 */
import { type Polarity, dual, negative, positive, samePolarity } from "../../index.mjs";
import { type Connective, type Proposition, dualConnective } from "./proposition.mjs";

/**
 * The Andreoli focusing polarity of a connective. Positive (synchronous):
 * tensor, one, plus, zero, ofCourse. Negative (asynchronous): par, bottom, with,
 * top, whyNot. Atoms carry their own polarity, so the connective `"atom"` has no
 * determinate focusing polarity here — see `polarityOf` for the atom case.
 */
export function polarityOfConnective(connective: Connective): Polarity | null {
  switch (connective) {
    case "tensor":
    case "one":
    case "plus":
    case "zero":
    case "ofCourse":
      return positive();
    case "par":
    case "bottom":
    case "with":
    case "top":
    case "whyNot":
      return negative();
    case "down":
      // ↓ is the positive (synchronous) shift: it makes its operand positive.
      return positive();
    case "up":
      // ↑ is the negative (asynchronous) shift: it makes its operand negative.
      return negative();
    case "atom":
      return null;
  }
}

/**
 * The focusing polarity of a proposition: for a connective, its Andreoli
 * polarity; for an atom, the Player/Opponent polarity it carries (the literal's
 * own polarity, exactly the game-algebra atom polarity that `dualProp` flips).
 */
export function polarityOf(p: Proposition): Polarity | null {
  if (p.connective === "atom") return p.polarity ?? null;
  return polarityOfConnective(p.connective);
}

/**
 * Whether a proposition is focused at its head: its outermost polarity is
 * determinate. A connective head is always focused (its Andreoli polarity is
 * fixed); an atom is focused iff it carries a polarity.
 */
export function isFocused(p: Proposition): boolean {
  return polarityOf(p) !== null;
}

/** Convenience: the proposition's head polarity is positive (synchronous). */
export const isPositiveProposition = (p: Proposition): boolean => {
  const polarity = polarityOf(p);
  return polarity !== null && samePolarity(polarity, positive());
};

/** Convenience: the proposition's head polarity is negative (asynchronous). */
export const isNegativeProposition = (p: Proposition): boolean => {
  const polarity = polarityOf(p);
  return polarity !== null && samePolarity(polarity, negative());
};

export interface FocusingDualityWitness {
  readonly kind: "game.logic.focusingDuality:witness";
  readonly connective: Connective;
  readonly dualPolarity: Polarity;
  readonly negatedPolarity: Polarity;
}

export interface FocusingDualityObstruction {
  readonly kind: "game.logic.focusingDuality-obstruction";
  readonly connective: Connective;
  readonly dualPolarity: Polarity;
  readonly negatedPolarity: Polarity;
  readonly reason: string;
}

export type FocusingDualityJudgment = FocusingDualityWitness | FocusingDualityObstruction;

/**
 * Witness that focusing polarity is dualized by $(-)^\perp$ on connectives:
 * `polarityOfConnective(dualConnective c)` equals `dual(polarityOfConnective c)`.
 * The negative connective $\parr$ is the dual of the positive $\otimes$, and so
 * on through the table; atoms (whose polarity is carried, not fixed by the head)
 * yield an obstruction here.
 */
export function focusingDuality(connective: Connective): FocusingDualityJudgment {
  const polarity = polarityOfConnective(connective);
  const dualConnectivePolarity = polarityOfConnective(dualConnective(connective));
  if (polarity === null || dualConnectivePolarity === null) {
    return Object.freeze({
      kind: "game.logic.focusingDuality-obstruction" as const,
      connective,
      dualPolarity: positive(),
      negatedPolarity: positive(),
      reason: "atoms carry polarity rather than fixing it at the head; focusing duality is stated for the logical connectives",
    });
  }
  const negatedPolarity = dual(polarity);
  return samePolarity(dualConnectivePolarity, negatedPolarity)
    ? Object.freeze({
      kind: "game.logic.focusingDuality:witness" as const,
      connective,
      dualPolarity: dualConnectivePolarity,
      negatedPolarity,
    })
    : Object.freeze({
      kind: "game.logic.focusingDuality-obstruction" as const,
      connective,
      dualPolarity: dualConnectivePolarity,
      negatedPolarity,
      reason: `focusing polarity of dual connective ${dualConnective(connective)} disagrees with negation`,
    });
}
