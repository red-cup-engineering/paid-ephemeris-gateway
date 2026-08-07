import {
  articulate as articulateUtterance,
  mark,
  utterance,
  type ArticulationCell,
  type Mark,
  type UtteranceCarrier,
} from "@emsenn/relating-experimental";

/**
 * A communicating carrier is not text. It is an admitted utterance from the
 * relating substrate, plus the first articulation opened from that utterance.
 */
export interface CommunicatingCarrier {
  readonly kind: "communicating.carrier";
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
}

/** A decoded boundary document before admission into Marks. */
export type CommunicationBoundaryDocument = string;

/** A boundary claim carried by the root morphism. */
export type CommunicationClaim = CommunicationBoundaryDocument | Mark | undefined;

/** A boundary token carried by the root morphism. */
export type CommunicationToken = CommunicationBoundaryDocument | Mark;

export const isMark = (input: CommunicationToken | CommunicationClaim): input is Mark =>
  typeof input === "object" && input !== null && input.kind === "utterance.mark";

export const communicationMark = (input: CommunicationToken): Mark =>
  isMark(input) ? input : mark({ boundary: "communicating.document", text: input });

const communicationClaimMark = (input: CommunicationClaim): Mark =>
  input === undefined
    ? mark({ boundary: "communicating.claim", claim: "uttered" })
    : isMark(input)
      ? input
      : mark({ boundary: "communicating.claim", claim: input });

/**
 * Admit communicating boundary values as a relating utterance.
 *
 * Domain: token Mark/string x optional claim Mark/string.
 * Codomain: communicating carrier.
 * Normalization: boundary document -> Mark -> Utterance -> relating articulate.
 */
export function admitCommunication(
  tokenInput: CommunicationToken,
  claimInput?: CommunicationClaim,
): CommunicatingCarrier {
  const carrier = utterance(communicationMark(tokenInput), communicationClaimMark(claimInput));
  return carrierOfUtterance(carrier);
}

/**
 * Lift an already admitted relating utterance into the communicating category.
 *
 * Domain: UtteranceCarrier.
 * Codomain: communicating carrier.
 * Law: the returned articulation is exactly relating's articulation of the
 * given utterance; no span, parse, charge, or reading is accepted as primitive.
 */
export function carrierOfUtterance(carrier: UtteranceCarrier): CommunicatingCarrier {
  return Object.freeze({
    kind: "communicating.carrier" as const,
    utterance: carrier,
    articulation: articulateUtterance(carrier),
  });
}

export function communicationDocument(carrier: CommunicatingCarrier): CommunicationBoundaryDocument | null {
  const value = carrier.utterance.token.mark.value;
  if (
    typeof value === "object"
    && value !== null
    && "boundary" in value
    && value.boundary === "communicating.document"
    && "text" in value
    && typeof value.text === "string"
  ) {
    return value.text;
  }
  return null;
}
