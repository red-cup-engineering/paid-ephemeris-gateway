/**
 * content-topology — content as a meme-topology carrier.
 *
 * "Content" carries its established sense from communication and media
 * studies, not a house coinage. The carrier shape is Lasswell's model of
 * communication: who (communicator) says what (message) in which channel
 * (channel) to whom (audience) with what effect (effect). Each position is
 * an evidence-bearing coordinate, never a bare string. The editorial gate
 * is gatekeeping theory's object (White, Shoemaker): production passes
 * through gates whose outcomes are charges with evidence, never booleans.
 * The demand/attention side (agenda-setting) lives in `./demand.mjs`; the
 * interpretive-frame coordinate (Entman: selection + salience) is the
 * frame term below; the read direction (Krippendorff's content analysis:
 * replicable, valid inference from texts to the contexts of their use)
 * lives in `./content-section.mjs`.
 *
 * This library models knowledge ABOUT content. A ContentObject's
 * coordinates admit onto the meme floor as utterances; settlement is
 * `induceContentTopology` and readings come back as sections and charges.
 */
import {
  mark,
  utterance,
  fixedPointReadingsOfUtterances,
  settleUtterances,
  type UtteranceCarrier,
  type MemeTopologyFixedPointReadings,
  type SettlementFiltration,
} from "@emsenn/relating";

export type { UtteranceCarrier };

// ---------- term constructors (the name is a morphism) ----------

/** Namespaced mark for a content object: "content.object.<id>". */
export function contentTerm(id: string): string {
  return `content.object.${id}`;
}

/** Namespaced mark for a communicator (Lasswell: who): "content.communicator.<id>". */
export function communicatorTerm(id: string): string {
  return `content.communicator.${id}`;
}

/** Namespaced mark for a message (Lasswell: says what): "content.message.<id>". */
export function messageTerm(id: string): string {
  return `content.message.${id}`;
}

/** Namespaced mark for a channel (Lasswell: in which channel): "content.channel.<id>". */
export function channelTerm(id: string): string {
  return `content.channel.${id}`;
}

/** Namespaced mark for an audience (Lasswell: to whom): "content.audience.<id>". */
export function audienceTerm(id: string): string {
  return `content.audience.${id}`;
}

/** Namespaced mark for an effect (Lasswell: with what effect): "content.effect.<id>". */
export function effectTerm(id: string): string {
  return `content.effect.${id}`;
}

/** Namespaced mark for an interpretive frame (Entman): "content.frame.<id>". */
export function frameTerm(id: string): string {
  return `content.frame.${id}`;
}

/** Namespaced mark for an editorial gate (gatekeeping theory): "content.gate.<name>". */
export function gateTerm(name: string): string {
  return `content.gate.${name}`;
}

// ---------- predicate terms (the Lasswell positions as relations) ----------

/**
 * The communicated-by predicate term: "content.communicated-by", relating a
 * content object to its communicator coordinate (Lasswell: who).
 */
export function communicatedByPredicate(): string { return "content.communicated-by"; }
/**
 * The says predicate term: "content.says", relating a content object to its
 * message coordinate (Lasswell: says what).
 */
export function saysPredicate(): string { return "content.says"; }
/**
 * The in-channel predicate term: "content.in-channel", relating a content
 * object to its channel coordinate (Lasswell: in which channel).
 */
export function inChannelPredicate(): string { return "content.in-channel"; }
/**
 * The addressed-to predicate term: "content.addressed-to", relating a content
 * object to its audience coordinate (Lasswell: to whom).
 */
export function addressedToPredicate(): string { return "content.addressed-to"; }
/**
 * The effected predicate term: "content.effected", relating a content object to
 * a witnessed effect coordinate (Lasswell: with what effect).
 */
export function effectedPredicate(): string { return "content.effected"; }
/**
 * The framed-as predicate term: "content.framed-as", relating a content object
 * to an interpretive frame coordinate (Entman).
 */
export function framedAsPredicate(): string { return "content.framed-as"; }
/**
 * The clears-gate predicate term: "content.clears-gate", claiming that a
 * content object cleared an editorial gate (gatekeeping theory).
 */
export function clearsGatePredicate(): string { return "content.clears-gate"; }
/** The contrary of clears-gate. Rejection is its own claim of this
 *  predicate, never a polarity against clears-gate. */
export function rejectedByGatePredicate(): string { return "content.rejected-by-gate"; }

// ---------- Lasswell coordinates as carrier types ----------

/**
 * The five Lasswell coordinate positions: "communicator", "message", "channel",
 * "audience", and "effect".
 */
export type LasswellPosition = "communicator" | "message" | "channel" | "audience" | "effect";

/**
 * The "who" coordinate: a namespaced communicator term carrying the evidence
 * that grounds the attribution.
 */
export interface CommunicatorCoordinate {
  readonly kind: "content.coordinate.communicator";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

/**
 * The "says what" coordinate: a namespaced message term carrying the evidence
 * (message material - surfaces, citations).
 */
export interface MessageCoordinate {
  readonly kind: "content.coordinate.message";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

/**
 * The "in which channel" coordinate: a namespaced channel term carrying its
 * evidence.
 */
export interface ChannelCoordinate {
  readonly kind: "content.coordinate.channel";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

/**
 * The "to whom" coordinate: a namespaced audience term carrying its evidence.
 */
export interface AudienceCoordinate {
  readonly kind: "content.coordinate.audience";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

/**
 * The "with what effect" coordinate: a namespaced effect term carrying the
 * witnessing observation that grounds the effect.
 */
export interface EffectCoordinate {
  readonly kind: "content.coordinate.effect";
  readonly term: string;
  readonly evidence: readonly unknown[];
}

/**
 * The union of the five Lasswell coordinate carriers: communicator, message,
 * channel, audience, or effect.
 */
export type LasswellCoordinate =
  | CommunicatorCoordinate
  | MessageCoordinate
  | ChannelCoordinate
  | AudienceCoordinate
  | EffectCoordinate;

const frozenEvidence = (evidence: readonly unknown[]): readonly unknown[] =>
  Object.freeze([...evidence]);

/** The "who" coordinate. Evidence is the provenance of the attribution. */
export function communicator(id: string, evidence: readonly unknown[] = []): CommunicatorCoordinate {
  return Object.freeze({ kind: "content.coordinate.communicator" as const, term: communicatorTerm(id), evidence: frozenEvidence(evidence) });
}

/** The "says what" coordinate. Evidence is the message material (surfaces, citations). */
export function message(id: string, evidence: readonly unknown[] = []): MessageCoordinate {
  return Object.freeze({ kind: "content.coordinate.message" as const, term: messageTerm(id), evidence: frozenEvidence(evidence) });
}

/** The "in which channel" coordinate. */
export function channel(id: string, evidence: readonly unknown[] = []): ChannelCoordinate {
  return Object.freeze({ kind: "content.coordinate.channel" as const, term: channelTerm(id), evidence: frozenEvidence(evidence) });
}

/** The "to whom" coordinate. */
export function audience(id: string, evidence: readonly unknown[] = []): AudienceCoordinate {
  return Object.freeze({ kind: "content.coordinate.audience" as const, term: audienceTerm(id), evidence: frozenEvidence(evidence) });
}

/** The "with what effect" coordinate. Effects are WITNESSED, never presumed:
 *  evidence should carry the observation that grounds the effect. */
export function effect(id: string, evidence: readonly unknown[] = []): EffectCoordinate {
  return Object.freeze({ kind: "content.coordinate.effect" as const, term: effectTerm(id), evidence: frozenEvidence(evidence) });
}

// ---------- the ContentObject carrier ----------

/**
 * The content carrier: a content object's term, its occupied production-side
 * Lasswell coordinates (communicator, message, channel, audience), the
 * accumulating trace of witnessed effects, the floor admissions for every
 * occupied position, and the optional raw prose body.
 */
export interface ContentObject {
  readonly kind: "content.object";
  readonly term: string;
  readonly communicator?: CommunicatorCoordinate;
  readonly message?: MessageCoordinate;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  /** Witnessed effects accumulate; the position is a trace, not a slot. */
  readonly effects: readonly EffectCoordinate[];
  /** Floor admissions for every occupied position. The coordinates beside
   *  them carry the evidence — provenance is this carrier's structure, not
   *  the floor's. */
  readonly utterances: readonly UtteranceCarrier[];
  /** The raw prose body — what the coordinates are about. Does not settle
   *  onto the meme floor; it is the material the coordinates describe. */
  readonly body?: string;
}

/**
 * The production-side input for building a ContentObject: an id plus the
 * optional Lasswell coordinates (communicator, message, channel, audience) and
 * optional prose body. Effects are witnessed after publication and are not
 * supplied here.
 */
export interface ContentObjectInput {
  readonly id: string;
  readonly communicator?: CommunicatorCoordinate;
  readonly message?: MessageCoordinate;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
  readonly body?: string;
}

const POSITION_PREDICATES: Readonly<Record<LasswellPosition, () => string>> = Object.freeze({
  communicator: communicatedByPredicate,
  message: saysPredicate,
  channel: inChannelPredicate,
  audience: addressedToPredicate,
  effect: effectedPredicate,
});

/**
 * Content's admitted token mark: a content-owned projection of a relation
 * between a content object term and one coordinate/gate/frame term. The meme
 * topology keeps this mark opaque; content readers may project it because this
 * package owns the payload shape.
 */
export interface ContentCellMark {
  readonly kind: "content.cell";
  readonly subject: string;
  readonly object: string;
}

export const contentCellMark = (subject: string, object: string): ContentCellMark =>
  Object.freeze({ kind: "content.cell" as const, subject, object });

const coordinateUtterance = (
  subject: string,
  position: LasswellPosition,
  coordinate: LasswellCoordinate,
): UtteranceCarrier =>
  utterance(mark(contentCellMark(subject, coordinate.term)), mark(POSITION_PREDICATES[position]()));

/** Build a ContentObject from its production-side Lasswell coordinates.
 *  Every occupied coordinate is admitted as a relational utterance; the
 *  coordinate itself rides beside it carrying the evidence. */
export function contentObject(input: ContentObjectInput): ContentObject {
  const term = contentTerm(input.id);
  const utterances: UtteranceCarrier[] = [];
  if (input.communicator !== undefined) utterances.push(coordinateUtterance(term, "communicator", input.communicator));
  if (input.message !== undefined) utterances.push(coordinateUtterance(term, "message", input.message));
  if (input.channel !== undefined) utterances.push(coordinateUtterance(term, "channel", input.channel));
  if (input.audience !== undefined) utterances.push(coordinateUtterance(term, "audience", input.audience));
  return Object.freeze({
    kind: "content.object" as const,
    term,
    ...(input.communicator !== undefined ? { communicator: input.communicator } : {}),
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.audience !== undefined ? { audience: input.audience } : {}),
    effects: Object.freeze([] as EffectCoordinate[]),
    utterances: Object.freeze(utterances),
    ...(input.body !== undefined ? { body: input.body } : {}),
  });
}

/** Append a witnessed effect to a ContentObject. Time only accumulates:
 *  the original carrier is untouched; a new carrier extends the trace. */
export function withEffect(content: ContentObject, effectCoordinate: EffectCoordinate): ContentObject {
  return Object.freeze({
    ...content,
    effects: Object.freeze([...content.effects, effectCoordinate]),
    utterances: Object.freeze([
      ...content.utterances,
      coordinateUtterance(content.term, "effect", effectCoordinate),
    ]),
  });
}

// ---------- frame and gate utterances ----------

/** Claim that content is framed as a given interpretive frame (Entman). */
export function frameUtterance(contentId: string, frameId: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), frameTerm(frameId))), mark(framedAsPredicate()));
}

/** Claim that content clears an editorial gate. The cell's charge carries
 *  the admitting witness; the gate's working evidence (editor reports, …)
 *  is the caller's structure to keep beside the utterance. */
export function gateClearedUtterance(contentId: string, gateName: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), gateTerm(gateName))), mark(clearsGatePredicate()));
}

/** Claim that an editorial gate rejected the content. Rejection is its own
 *  claim of the contrary predicate (rejected-by-gate) — never a polarity
 *  against clears-gate. A gate that has claimed both ways shows two live
 *  contrary cells, read side by side by `gateVerdict`. */
export function gateRejectedUtterance(contentId: string, gateName: string): UtteranceCarrier {
  return utterance(mark(contentCellMark(contentTerm(contentId), gateTerm(gateName))), mark(rejectedByGatePredicate()));
}

// ---------- carrier settlement on the meme floor ----------

/** A carrier for settled content utterances and their fixed-point readings. */
export interface ContentTopologyCarrier {
  readonly kind: "content.topology.carrier";
  readonly utterances: readonly UtteranceCarrier[];
  readonly settlement: SettlementFiltration;
  readonly fixedPointReadings: MemeTopologyFixedPointReadings;
  readonly _contentTopologyBrand: never;
}

/** Settle content utterances (one or many ContentObjects' worth) into a
 *  ContentTopologyCarrier on the meme floor. */
export function induceContentTopology(utterances: readonly UtteranceCarrier[]): ContentTopologyCarrier {
  const log = Object.freeze([...utterances]);
  return Object.freeze({
    kind: "content.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  }) as ContentTopologyCarrier;
}

/** Apply a delta of new utterances; evidence is monotone. */
export function extendContentTopology(
  carrier: ContentTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): ContentTopologyCarrier {
  return induceContentTopology([...carrier.utterances, ...delta]);
}

// ---------- the Lasswell completeness judgment ----------

/**
 * The affirmative Lasswell judgment: the content object together with the
 * positions it occupies.
 */
export interface LasswellWitness {
  readonly kind: "content.lasswell:witness";
  readonly content: ContentObject;
  readonly positions: readonly LasswellPosition[];
}

/**
 * The negative Lasswell judgment: the content object together with the
 * positions it leaves missing.
 */
export interface LasswellObstruction {
  readonly kind: "content.lasswell-obstruction";
  readonly content: ContentObject;
  readonly missing: readonly LasswellPosition[];
}

/**
 * The result of a Lasswell completeness judgment: either a LasswellWitness or a
 * LasswellObstruction.
 */
export type LasswellJudgment = LasswellWitness | LasswellObstruction;

const PRODUCTION_POSITIONS: readonly LasswellPosition[] =
  Object.freeze(["communicator", "message", "channel", "audience"]);

const occupied = (content: ContentObject, position: LasswellPosition): boolean =>
  position === "effect" ? content.effects.length > 0 : content[position] !== undefined;

/** Judge whether a ContentObject occupies the asked Lasswell positions.
 *  Defaults to the four production positions — effect is witnessed after
 *  publication, not presumed at production. Returns a witness naming the
 *  occupied positions or an obstruction naming the missing ones. */
export function lasswellJudgment(
  content: ContentObject,
  positions: readonly LasswellPosition[] = PRODUCTION_POSITIONS,
): LasswellJudgment {
  const missing = positions.filter((position) => !occupied(content, position));
  if (missing.length > 0) {
    return Object.freeze({
      kind: "content.lasswell-obstruction" as const,
      content,
      missing: Object.freeze(missing),
    });
  }
  return Object.freeze({
    kind: "content.lasswell:witness" as const,
    content,
    positions: Object.freeze([...positions]),
  });
}
