/**
 * articulating/utterance — the base object, base carrier, and base morphism.
 *
 * `Mark` is the opaque atom: an immutable carrier wrapping one present value.
 * Core code never inspects a Mark's payload as ordinary data — only a codec
 * boundary may. A `Token` (left hand) and a `Claim` (right hand) each carry a
 * Mark; an `Utterance = (Token, Claim)` is the base admission carrier; and
 * `articulate` opens the aperiodic articulation category at its potential cell.
 * Every public morphism of relating normalizes back through `Mark → Utterance →
 * articulate`; this module is where that base lives.
 */

/** A mark: an immutable carrier wrapping a single present value. The opaque atom. */
export class Mark {
  readonly kind = "utterance.mark" as const;
  readonly value: unknown;

  constructor(value: unknown) {
    if (value === undefined) throw new TypeError("Mark: value must be present");
    this.value = value;
    Object.freeze(this);
  }
}

/** A token: the immutable left-hand utterance carrier holding one mark. */
export class Token {
  readonly kind = "utterance.token" as const;
  readonly hand = "left" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** A claim: the immutable right-hand utterance carrier holding one mark. */
export class Claim {
  readonly kind = "utterance.claim" as const;
  readonly hand = "right" as const;
  readonly mark: Mark;

  constructor(mark: Mark) {
    this.mark = mark;
    Object.freeze(this);
  }
}

/** An utterance: the base admission carrier pairing a token with a claim. */
export interface UtteranceCarrier {
  readonly kind: "utterance.carrier";
  readonly token: Token;
  readonly claim: Claim;
}

/** The token-side slot of an aperiodic articulation cell. */
export type TokenArticulationSlot = readonly [] | readonly [Token];

/** The claim-side slot of an aperiodic articulation cell. */
export type ClaimArticulationSlot = readonly [] | readonly [Claim];

/** The pairing term of an aperiodic articulation cell. */
export type AperiodicArticulationPairing = readonly [TokenArticulationSlot, ClaimArticulationSlot];

/** An aperiodic articulation cell: a carrier utterance plus its two slots. */
export type AperiodicArticulationCell = readonly [UtteranceCarrier, AperiodicArticulationPairing];

/** The potential aperiodic articulation cell: both slots empty (the initial object). */
export type PotentialAperiodicArticulationCell = readonly [UtteranceCarrier, readonly [readonly [], readonly []]];

/** The articulation cell `articulate` opens, carrying the potential aperiodic cell. */
export interface ArticulationCell {
  readonly kind: "utterance.articulation.cell";
  readonly potentialAperiodicArticulationCell: PotentialAperiodicArticulationCell;
}

/** A witness that two marks coincide. */
export interface MarkCoincidenceWitness<Carrier> {
  readonly kind: "utterance.coincidence:witness";
  readonly left: Carrier;
  readonly right: Carrier;
}

/** An obstruction to two marks coinciding. */
export interface MarkCoincidenceObstruction<Carrier> {
  readonly kind: "utterance.coincidence-obstruction";
  readonly left: Carrier;
  readonly right: Carrier;
}

/** The result of judging two token/claim carriers coincident. */
export type TokenIdentityJudgment = MarkCoincidenceWitness<Token> | MarkCoincidenceObstruction<Token>;
/** The result of judging two claim carriers coincident. */
export type ClaimIdentityJudgment = MarkCoincidenceWitness<Claim> | MarkCoincidenceObstruction<Claim>;

/** Constructs a Mark wrapping the given value. */
export function mark(value: unknown): Mark {
  return new Mark(value);
}

/** Constructs a Token from the given mark. */
export function token(markCarrier: Mark): Token {
  return new Token(markCarrier);
}

/** Constructs a Claim from the given mark. */
export function claim(markCarrier: Mark): Claim {
  return new Claim(markCarrier);
}

/** Constructs an utterance carrier from two marks: left becomes a token, right a claim. */
export function utterance(left: Mark, right: Mark): UtteranceCarrier {
  return Object.freeze({ kind: "utterance.carrier" as const, token: token(left), claim: claim(right) });
}

/** Whether two mark payloads coincide: identical primitives, or structurally
 *  equal plain JSON. This is the only place core code reads a Mark payload, and
 *  it reads it only to judge coincidence — never to branch on its content.
 *
 *  Structural (value) coincidence, not reference identity: this package is
 *  boundary-first, so carriers are routinely reconstructed from JSON with no
 *  shared references. Coincidence must survive a transport round-trip; reference
 *  identity would not. (This is the one deliberate divergence from the prior
 *  reference-identity carrier coincidence.) */
export function coincides(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((item, index) => coincides(item, right[index]));
  }
  const leftKeys = Object.keys(left as Record<string, unknown>).sort();
  const rightKeys = Object.keys(right as Record<string, unknown>).sort();
  if (leftKeys.length !== rightKeys.length || !leftKeys.every((key, index) => key === rightKeys[index])) return false;
  return leftKeys.every((key) => coincides((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

/** Judges whether two tokens coincide: a witness when their marks coincide, else an obstruction. */
export function tokenIdentity(left: Token, right: Token): TokenIdentityJudgment {
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right });
}

/** Judges whether two claims coincide: a witness when their marks coincide, else an obstruction. */
export function claimIdentity(left: Claim, right: Claim): ClaimIdentityJudgment {
  return coincides(left.mark.value, right.mark.value)
    ? Object.freeze({ kind: "utterance.coincidence:witness" as const, left, right })
    : Object.freeze({ kind: "utterance.coincidence-obstruction" as const, left, right });
}

/**
 * Articulates an utterance carrier: opens the aperiodic articulation category at
 * its potential cell. The token and claim are fixed by the carrier; neither slot
 * is filled at this initial object. This is the base morphism.
 */
export function articulate(carrier: UtteranceCarrier): ArticulationCell {
  const pairing = Object.freeze([Object.freeze([]), Object.freeze([])]) as readonly [readonly [], readonly []];
  return Object.freeze({
    kind: "utterance.articulation.cell" as const,
    potentialAperiodicArticulationCell: Object.freeze([carrier, pairing]) as PotentialAperiodicArticulationCell,
  });
}

/** Type guard: the aperiodic articulation shape with a potential cell whose slots are empty. */
export function isArticulationCell(value: object): value is ArticulationCell {
  const kind = "kind" in value ? value.kind : undefined;
  const cell = "potentialAperiodicArticulationCell" in value ? value.potentialAperiodicArticulationCell : undefined;
  return kind === "utterance.articulation.cell"
    && Array.isArray(cell)
    && cell.length === 2
    && typeof cell[0] === "object"
    && cell[0] !== null
    && "kind" in cell[0]
    && cell[0].kind === "utterance.carrier"
    && Array.isArray(cell[1])
    && cell[1].length === 2
    && Array.isArray(cell[1][0])
    && cell[1][0].length === 0
    && Array.isArray(cell[1][1])
    && cell[1][1].length === 0;
}
