/**
 * production — the content farm's generic production carriers.
 *
 * An Assignment is a demand-created instruction to produce: it carries
 * the demand charge that called it into being, so "why was this made?"
 * is always answerable from the carrier itself. A Draft is a message in
 * production with its surfaces (headline, body, …); revision APPENDS a
 * surface at the next stage ordinal — earlier surfaces survive as the
 * draft's trace, and the current text is a reading, not the state.
 */
import { message, type AudienceCoordinate, type ChannelCoordinate, type MessageCoordinate } from "./content-topology.mjs";
import { demandRanking, type DemandChargeCarrier } from "./demand.mjs";

// ---------- assignment ----------

/**
 * A demand-created instruction to produce content: carries the brief and
 * subjects to cover, optional channel and audience coordinates, and the demand
 * charge that called it into being as its warrant.
 */
export interface AssignmentCarrier {
  readonly kind: "content.assignment";
  readonly id: string;
  /** The instruction to the producer, in prose. */
  readonly brief: string;
  /** The terms (topics, keywords) the produced content is to cover. */
  readonly subjects: readonly string[];
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  /** The demand charge that created this assignment — its warrant. */
  readonly demand: DemandChargeCarrier;
}

/**
 * The fields required to construct an assignment carrier: id, brief, subjects,
 * the originating demand charge, and optional channel and audience coordinates.
 */
export interface AssignmentInput {
  readonly id: string;
  readonly brief: string;
  readonly subjects: readonly string[];
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  readonly demand: DemandChargeCarrier;
}

/**
 * Construct a frozen assignment carrier from an input: copies and freezes the
 * subjects, includes channel and audience only when present, and throws if id
 * is not a non-empty string.
 */
export function assignment(input: AssignmentInput): AssignmentCarrier {
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("assignment: id must be a non-empty string");
  return Object.freeze({
    kind: "content.assignment" as const,
    id: input.id,
    brief: input.brief,
    subjects: Object.freeze([...input.subjects]),
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    demand: input.demand,
  });
}

/**
 * The fields supplied when deriving an assignment from a demand charge: id,
 * brief, and optional channel and audience coordinates - subjects are taken
 * from the charge rather than given here.
 */
export interface AssignmentFromDemandInput {
  readonly id: string;
  readonly brief: string;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
}

/** Derive an assignment from a demand charge: the subjects are exactly the
 *  positively demanded terms, in ranked order. The charge rides along as
 *  the assignment's warrant. */
export function assignmentFromDemand(demand: DemandChargeCarrier, input: AssignmentFromDemandInput): AssignmentCarrier {
  const subjects = demandRanking(demand)
    .filter((rank) => rank.value > 0n)
    .map((rank) => rank.term);
  return assignment({ ...input, subjects, demand });
}

// ---------- draft ----------

/**
 * One named surface of a draft (headline, body, dek, ...) at a given stage
 * ordinal: pairs the surface name and its text with its position in the draft's
 * revision trace.
 */
export interface DraftSurface {
  readonly kind: "content.draft.surface";
  /** Which surface of the message this is: "headline", "body", "dek", … */
  readonly name: string;
  readonly text: string;
  /** Stage ordinal: position in the draft's revision trace, never wall-clock. */
  readonly stage: bigint;
}

/**
 * A message in production: carries its id, the id of the assignment it answers,
 * and an append-only trace of surface revisions over which the current text is
 * a reading.
 */
export interface DraftCarrier {
  readonly kind: "content.draft";
  readonly id: string;
  /** The assignment this draft answers. */
  readonly assignment: string;
  /** Append-only revision trace. The current text is a reading over this. */
  readonly surfaces: readonly DraftSurface[];
}

/**
 * The fields required to construct a draft carrier: its id and the id of the
 * assignment it answers.
 */
export interface DraftInput {
  readonly id: string;
  readonly assignment: string;
}

/**
 * Construct a frozen draft carrier with an empty surfaces trace from an input;
 * throws if id is not a non-empty string.
 */
export function draft(input: DraftInput): DraftCarrier {
  if (typeof input.id !== "string" || input.id.length === 0) throw new TypeError("draft: id must be a non-empty string");
  return Object.freeze({
    kind: "content.draft" as const,
    id: input.id,
    assignment: input.assignment,
    surfaces: Object.freeze([] as DraftSurface[]),
  });
}

/** Append a surface revision at the next stage ordinal. The earlier text
 *  survives in the trace; nothing is overwritten. */
export function reviseDraft(draftCarrier: DraftCarrier, name: string, text: string): DraftCarrier {
  const surface: DraftSurface = Object.freeze({
    kind: "content.draft.surface" as const,
    name,
    text,
    stage: BigInt(draftCarrier.surfaces.length),
  });
  return Object.freeze({
    ...draftCarrier,
    surfaces: Object.freeze([...draftCarrier.surfaces, surface]),
  });
}

/** Reading: the latest surface per name. The trace is the truth; this is
 *  the rendering-edge value. */
export function currentSurfaces(draftCarrier: DraftCarrier): readonly DraftSurface[] {
  const latest = new Map<string, DraftSurface>();
  for (const surface of draftCarrier.surfaces) latest.set(surface.name, surface);
  return Object.freeze([...latest.values()]);
}

/** Project a draft into the Lasswell message coordinate: the message term
 *  is the draft's, and the evidence is its current surfaces. */
export function messageFromDraft(draftCarrier: DraftCarrier): MessageCoordinate {
  return message(draftCarrier.id, currentSurfaces(draftCarrier));
}
