/**
 * Propositions of classical linear logic — the formulas of the CLL fragment of
 * $\mathbf{CGS}$.
 *
 * The corpus pins the connectives of classical linear logic (Girard 1987) as the
 * proof-theoretic name of the $*$-autonomous structure of concurrent games with
 * symmetry: "the typed subtheory lattice is the linear logic fragment lattice"
 * (predication-typed-subtheory-lattice-is-linear-logic-fragment-lattice.md). A
 * proposition is therefore the syntactic name of a behaviour (the bi-orthogonal
 * closure of a design-set), and CLL's connectives are the operations on those
 * behaviours.
 *
 * Linear negation $(-)^\perp$ is NOT a stored connective. It is the structural
 * De Morgan involution `dualProp`, which bottoms out at atoms by reusing
 * `@emsenn/game-algebra` `dual` on the atom's `Polarity`. This realizes the
 * corpus claim that "the duality $(-)^\perp$ is involutive at every object" of
 * $\mathbf{CGS}_{\mathrm{CLL}}$ and that linear negation extends Player/Opponent
 * duality: an atom's dual swaps Proponent and Opponent, exactly the meme-apex
 * gauge negation witnessed by game-algebra `dualityIsNegation`.
 *
 * Units are nullary connectives (empty `operands`). Binary connectives carry two
 * operands, the exponentials carry one. Smart constructors fix arity so the
 * indexed reads in `dualProp`/`connectivesOf` are construction-justified under
 * `noUncheckedIndexedAccess`.
 */
import { type Polarity, dual } from "../../index.mjs";

/**
 * The connective tags of classical linear logic.
 *
 * Multiplicatives: `tensor` (⊗), `par` (⅋), units `one` (1), `bottom` (⊥).
 * Additives: `with` (&), `plus` (⊕), units `top` (⊤), `zero` (0).
 * Exponentials: `ofCourse` (!), `whyNot` (?).
 * Shifts (Andreoli/polarized): `up` (↑, negative/asynchronous delay) and `down`
 * (↓, positive/synchronous delay) — the polarity-change operators that move
 * between focusing phases, with the duality $(\uparrow P)^\perp = \downarrow(P^\perp)$.
 * `atom` is the nullary leaf carrying a game-algebra polarity.
 */
export type Connective =
  | "atom"
  | "tensor"
  | "par"
  | "with"
  | "plus"
  | "one"
  | "bottom"
  | "top"
  | "zero"
  | "ofCourse"
  | "whyNot"
  | "up"
  | "down";

export const connectives = (): readonly Connective[] =>
  Object.freeze([
    "atom",
    "tensor",
    "par",
    "with",
    "plus",
    "one",
    "bottom",
    "top",
    "zero",
    "ofCourse",
    "whyNot",
    "up",
    "down",
  ] as const satisfies readonly Connective[]);

/**
 * A proposition of CLL: a frozen recursive carrier. `connective` is the head;
 * `operands` are the sub-propositions (empty for units, one for exponentials,
 * two for binary connectives). For `atom`, `polarity` carries the Player/Opponent
 * polarity of the literal and `operands` is empty.
 */
export interface Proposition {
  readonly kind: "game.logic.prop";
  readonly connective: Connective;
  readonly operands: readonly Proposition[];
  readonly polarity?: Polarity;
  readonly label?: string;
}

const prop = (
  connective: Connective,
  operands: readonly Proposition[],
  extra?: { readonly polarity?: Polarity; readonly label?: string },
): Proposition =>
  Object.freeze({
    kind: "game.logic.prop" as const,
    connective,
    operands: Object.freeze([...operands]),
    ...(extra?.polarity !== undefined ? { polarity: extra.polarity } : {}),
    ...(extra?.label !== undefined ? { label: extra.label } : {}),
  });

/** An atomic proposition (literal), carrying a game-algebra polarity and a name. */
export function atom(label: string, p: Polarity): Proposition {
  return prop("atom", [], { polarity: p, label });
}

/** Multiplicative conjunction $A \otimes B$ — "send $A$, continue $B$". */
export const tensor = (left: Proposition, right: Proposition): Proposition => prop("tensor", [left, right]);
/** Multiplicative disjunction $A \parr B$ — De Morgan dual of $\otimes$. */
export const par = (left: Proposition, right: Proposition): Proposition => prop("par", [left, right]);
/** Additive conjunction $A \mathbin{\&} B$ — Player's choice. */
export const withProp = (left: Proposition, right: Proposition): Proposition => prop("with", [left, right]);
/** Additive disjunction $A \oplus B$ — Opponent's choice. */
export const plus = (left: Proposition, right: Proposition): Proposition => prop("plus", [left, right]);

/** Multiplicative unit $1$ (unit of $\otimes$). */
export const one = (): Proposition => prop("one", []);
/** Multiplicative unit $\bot$ (unit of $\parr$). */
export const bottom = (): Proposition => prop("bottom", []);
/** Additive unit $\top$ (unit of $\mathbin{\&}$). */
export const top = (): Proposition => prop("top", []);
/** Additive unit $0$ (unit of $\oplus$). */
export const zero = (): Proposition => prop("zero", []);

/** Exponential $!A$ ("of course") — the replicable-resource / server modality. */
export const ofCourse = (operand: Proposition): Proposition => prop("ofCourse", [operand]);
/** Exponential $?A$ ("why not") — the client modality, De Morgan dual of $!$. */
export const whyNot = (operand: Proposition): Proposition => prop("whyNot", [operand]);

/** Up-shift $\uparrow A$ — the negative (asynchronous) polarity shift / delay; dual of $\downarrow$. */
export const up = (operand: Proposition): Proposition => prop("up", [operand]);
/** Down-shift $\downarrow A$ — the positive (synchronous) polarity shift / delay; dual of $\uparrow$. */
export const down = (operand: Proposition): Proposition => prop("down", [operand]);

/**
 * Linear implication $A \multimap B$, defined (classically) as $A^\perp \parr B$.
 * Provided as a derived constructor: $\multimap$ is not primitive in CLL.
 */
export const lolli = (left: Proposition, right: Proposition): Proposition => par(dualProp(left), right);

/** The De Morgan dual of each connective (the head-level table for $(-)^\perp$). */
export function dualConnective(connective: Connective): Connective {
  switch (connective) {
    case "atom":
      return "atom";
    case "tensor":
      return "par";
    case "par":
      return "tensor";
    case "with":
      return "plus";
    case "plus":
      return "with";
    case "one":
      return "bottom";
    case "bottom":
      return "one";
    case "top":
      return "zero";
    case "zero":
      return "top";
    case "ofCourse":
      return "whyNot";
    case "whyNot":
      return "ofCourse";
    case "up":
      return "down";
    case "down":
      return "up";
  }
}

/**
 * Linear negation $(-)^\perp$ as the structural De Morgan involution.
 *
 * $(A \otimes B)^\perp = A^\perp \parr B^\perp$, $1^\perp = \bot$,
 * $(A \mathbin{\&} B)^\perp = A^\perp \oplus B^\perp$, $\top^\perp = 0$,
 * $(!A)^\perp = ?(A^\perp)$, and an atom's dual reuses game-algebra `dual` on
 * its polarity (Proponent ⟷ Opponent). `dualProp(dualProp(p))` is structurally
 * `p`, witnessing involutivity at every object.
 */
export function dualProp(p: Proposition): Proposition {
  if (p.connective === "atom") {
    const polarity = p.polarity;
    if (polarity === undefined) return prop("atom", [], p.label !== undefined ? { label: p.label } : {});
    return prop("atom", [], p.label !== undefined ? { polarity: dual(polarity), label: p.label } : { polarity: dual(polarity) });
  }
  return prop(dualConnective(p.connective), p.operands.map(dualProp));
}

/** The set of distinct connectives occurring in a proposition (its signature). */
export function connectivesOf(p: Proposition): readonly Connective[] {
  const seen: Connective[] = [];
  const walk = (q: Proposition): void => {
    if (!seen.includes(q.connective)) seen.push(q.connective);
    for (const operand of q.operands) walk(operand);
  };
  walk(p);
  return Object.freeze(seen);
}

/** Structural equality of propositions (atoms compare by label and polarity name). */
export function samePropositions(left: Proposition, right: Proposition): boolean {
  if (left.connective !== right.connective) return false;
  if (left.connective === "atom") {
    const leftPolarity = left.polarity?.name;
    const rightPolarity = right.polarity?.name;
    return left.label === right.label && leftPolarity === rightPolarity;
  }
  if (left.operands.length !== right.operands.length) return false;
  return left.operands.every((operand, index) => samePropositions(operand, right.operands[index]!));
}

export function isConnective(value: unknown): value is Connective {
  return typeof value === "string" && connectives().includes(value as Connective);
}

export function isProposition(value: unknown): value is Proposition {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Proposition>;
  return candidate.kind === "game.logic.prop" && isConnective(candidate.connective) && Array.isArray(candidate.operands);
}
