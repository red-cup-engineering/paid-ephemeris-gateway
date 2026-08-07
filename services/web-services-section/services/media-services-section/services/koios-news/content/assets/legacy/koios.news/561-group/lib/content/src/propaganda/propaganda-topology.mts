/**
 * propaganda-topology — propaganda as a content carrier with a declared
 * telos and a witnessed effect trace.
 *
 * "Propaganda" carries Jowett & O'Donnell's standard definition: the
 * deliberate, systematic attempt to shape perceptions to achieve a
 * response that furthers the desired intent of the propagandist. The
 * carrier is exactly that definition made structural:
 *
 *   PropagandaObject = content (a ContentObject on the meme floor)
 *                    + telos   (the intended response — DECLARED, first-class,
 *                               auditable; an undeclared telos is a malformed
 *                               shape, not a quieter kind of propaganda)
 *                    + effects (an append-only trace of WITNESSED responses;
 *                               time only accumulates, the trace never shrinks)
 *
 * Whether the witnessed effects further the telos is a judgment in
 * `./furtherance.mjs` — a charge with two-sided evidence, never a boolean.
 */
import { mark, utterance, type UtteranceCarrier } from "@emsenn/relating";
import {
  contentCellMark,
  contentTerm,
  type AudienceCoordinate,
  type ContentObject,
  type DemandChargeCarrier,
} from "../topology/index.mjs";

export type { ContentObject, AudienceCoordinate, DemandChargeCarrier, UtteranceCarrier };

// ---------- terms and predicates ----------

/** Namespaced mark for a telos: "propaganda.telos.<id>". */
export function telosTerm(id: string): string {
  return `propaganda.telos.${id}`;
}

/**
 * The meme-floor predicate mark for a telos declaration:
 * "propaganda.declares-telos", relating content to the telos it declares.
 */
export function declaresTelosPredicate(): string { return "propaganda.declares-telos"; }
/**
 * The meme-floor predicate mark for furtherance: "propaganda.furthers",
 * relating witnessed effects to the telos they further.
 */
export function furthersPredicate(): string { return "propaganda.furthers"; }

// ---------- the declared telos ----------

/**
 * A declared telos: the intended response a propagandist seeks, carrying its
 * id, named intent, a signed demand charge target over term space, an optional
 * audience coordinate, and the required declarant who declared it.
 */
export interface TelosCarrier {
  readonly kind: "propaganda.telos";
  readonly id: string;
  /** The desired response, named ("attention", "subscription", "assent"). */
  readonly intent: string;
  /** The target as a signed demand charge over audience/effect term space:
   *  which terms the propagandist intends to move, and in which direction. */
  readonly target: DemandChargeCarrier;
  readonly audience?: AudienceCoordinate;
  /** Who declared this telos. Required: a telos is declared, never hidden. */
  readonly declaredBy: unknown;
}

/**
 * The arguments for declareTelos: id, named intent, signed demand charge
 * target, optional audience coordinate, and the required declarant.
 */
export interface TelosInput {
  readonly id: string;
  readonly intent: string;
  readonly target: DemandChargeCarrier;
  readonly audience?: AudienceCoordinate;
  readonly declaredBy: unknown;
}

/** Declare a telos. An undeclared declarant is a malformed shape: the
 *  declaration is what makes the intent auditable rather than hidden. */
export function declareTelos(input: TelosInput): TelosCarrier {
  if (input.declaredBy === undefined || input.declaredBy === null) {
    throw new TypeError("declareTelos: a telos must be declared by someone — declaredBy is required");
  }
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("declareTelos: id must be a non-empty string");
  if (typeof input.intent !== "string" || input.intent.length === 0) throw new TypeError("declareTelos: intent must be a non-empty string");
  return Object.freeze({
    kind: "propaganda.telos" as const,
    id: input.id,
    intent: input.intent,
    target: input.target,
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    declaredBy: input.declaredBy,
  });
}

/** Put the declaration on the meme floor: "content declares-telos telos".
 *  The declarant and intent travel on the TelosCarrier itself — provenance
 *  is this package's structure, never kernel structure. The telos is
 *  auditable wherever the content's other utterances are. */
export function telosDeclarationUtterance(contentId: string, telos: TelosCarrier): UtteranceCarrier {
  return utterance(
    mark(contentCellMark(contentTerm(contentId), telosTerm(telos.id))),
    mark(declaresTelosPredicate()),
  );
}

// ---------- witnessed effects ----------

/**
 * A single witnessed response in the effect trace: the term the response landed
 * on, its exact signed bigint magnitude, the ordinal stage that sequences it,
 * and the evidence that observed it.
 */
export interface EffectWitness {
  readonly kind: "propaganda.effect:witness";
  /** The term (keyword, effect state) the response landed on. */
  readonly term: string;
  /** Exact signed magnitude of the witnessed response (e.g. views). */
  readonly magnitude: bigint;
  /** Ordinal position in the effect trace — sequencing is never wall-clock. */
  readonly stage: bigint;
  /** What observed this response (analytics record, log line, survey). */
  readonly evidence: readonly unknown[];
}

/**
 * The arguments for effectWitness: the term, the signed bigint magnitude, the
 * bigint stage ordinal, and optional evidence.
 */
export interface EffectWitnessInput {
  readonly term: string;
  readonly magnitude: bigint;
  readonly stage: bigint;
  readonly evidence?: readonly unknown[];
}

/**
 * Construct a frozen EffectWitness from its input, requiring magnitude and
 * stage to be bigints so carrier math stays exact, and freezing a copy of the
 * evidence list.
 */
export function effectWitness(input: EffectWitnessInput): EffectWitness {
  if (typeof input.magnitude !== "bigint") throw new TypeError("effectWitness: magnitude must be a bigint — carrier math is exact");
  if (typeof input.stage !== "bigint") throw new TypeError("effectWitness: stage must be a bigint ordinal");
  return Object.freeze({
    kind: "propaganda.effect:witness" as const,
    term: input.term,
    magnitude: input.magnitude,
    stage: input.stage,
    evidence: Object.freeze([...(input.evidence ?? [])]),
  });
}

// ---------- the propaganda object ----------

/**
 * Propaganda as a carrier: a content object bound to its declared telos plus an
 * append-only trace of witnessed effects.
 */
export interface PropagandaObjectCarrier {
  readonly kind: "propaganda.object";
  readonly content: ContentObject;
  readonly telos: TelosCarrier;
  /** Append-only trace of witnessed responses. */
  readonly effects: readonly EffectWitness[];
}

/** Bind content to a declared telos. The effect trace starts empty: at
 *  birth, nothing has been witnessed and furtherance reads absurd. */
export function propagandaObject(content: ContentObject, telos: TelosCarrier): PropagandaObjectCarrier {
  return Object.freeze({
    kind: "propaganda.object" as const,
    content,
    telos,
    effects: Object.freeze([] as EffectWitness[]),
  });
}

/**
 * The arguments for witnessEffect: the term, the signed bigint magnitude, and
 * optional evidence; the stage ordinal is assigned from the existing trace
 * length.
 */
export interface WitnessEffectInput {
  readonly term: string;
  readonly magnitude: bigint;
  readonly evidence?: readonly unknown[];
}

/** Append a witnessed effect at the next stage ordinal. The original
 *  carrier survives untouched; the trace only ever extends. */
export function witnessEffect(object: PropagandaObjectCarrier, input: WitnessEffectInput): PropagandaObjectCarrier {
  const witness = effectWitness({
    term: input.term,
    magnitude: input.magnitude,
    stage: BigInt(object.effects.length),
    ...(input.evidence !== undefined ? { evidence: input.evidence } : {}),
  });
  return Object.freeze({
    ...object,
    effects: Object.freeze([...object.effects, witness]),
  });
}
