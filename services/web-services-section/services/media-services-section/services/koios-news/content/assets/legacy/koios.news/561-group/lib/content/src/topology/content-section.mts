/**
 * content-section — readings of a settled ContentTopologyCarrier.
 *
 * The read direction is content analysis in Krippendorff's sense:
 * replicable, valid inference from the settled text back to the contexts
 * of its use. Every read is a charge with evidence — absence reads
 * `absurd`, contradiction reads `stable` (held, never thrown).
 */
import {
  sectionOf,
  bottom,
  joinKnowledge,
  type SectionCarrier,
  type SectionEntry,
  type ChargeCarrier,
} from "@emsenn/relating";
import {
  contentTerm, communicatorTerm, messageTerm, channelTerm, audienceTerm, effectTerm, frameTerm, gateTerm,
  communicatedByPredicate, saysPredicate, inChannelPredicate, addressedToPredicate,
  effectedPredicate, framedAsPredicate, clearsGatePredicate, rejectedByGatePredicate,
  type ContentTopologyCarrier, type LasswellPosition,
} from "./content-topology.mjs";

export type { SectionCarrier, SectionEntry, ChargeCarrier };

/** Knowledge-least section of a settled content topology. */
export function contentKnowledgeSection(carrier: ContentTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.knowledgeLeast);
}

/** Truth-least section of a settled content topology. */
export function contentTruthSection(carrier: ContentTopologyCarrier): SectionCarrier {
  return sectionOf(carrier.fixedPointReadings.truthLeast);
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const markMatchesContentCell = (value: unknown, subject: string, object: string): boolean =>
  isRecord(value)
  && (value.kind === undefined || value.kind === "content.cell")
  && value.subject === subject
  && value.object === object;

const predicateMark = (entry: SectionEntry): unknown => entry.cell.predicate.mark.value;

const entryMatchesContentCell = (
  entry: SectionEntry,
  subject: string,
  predicate: string,
  object: string,
): boolean =>
  predicateMark(entry) === predicate
  && markMatchesContentCell(entry.cell.subject.mark.value, subject, object)
  && markMatchesContentCell(entry.cell.object.mark.value, subject, object);

const contentCellCharge = (
  section: SectionCarrier,
  subject: string,
  predicate: string,
  object: string,
): ChargeCarrier =>
  section.entries
    .filter((entry) => entryMatchesContentCell(entry, subject, predicate, object))
    .reduce((acc, entry) => joinKnowledge(acc, entry.charge), bottom);

const entriesForContent = (section: SectionCarrier, subject: string): readonly SectionEntry[] =>
  Object.freeze(section.entries.filter((entry) => {
    const value = entry.cell.subject.mark.value;
    return isRecord(value)
      && (value.kind === undefined || value.kind === "content.cell")
      && value.subject === subject;
  }));

// ---------- single-cell charge reads (one per Lasswell position) ----------

/** Charge at "content communicated-by communicator". */
export function communicatorCharge(section: SectionCarrier, contentId: string, communicatorId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), communicatedByPredicate(), communicatorTerm(communicatorId));
}

/** Charge at "content says message". */
export function messageCharge(section: SectionCarrier, contentId: string, messageId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), saysPredicate(), messageTerm(messageId));
}

/** Charge at "content in-channel channel". */
export function channelCharge(section: SectionCarrier, contentId: string, channelId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), inChannelPredicate(), channelTerm(channelId));
}

/** Charge at "content addressed-to audience". */
export function audienceCharge(section: SectionCarrier, contentId: string, audienceId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), addressedToPredicate(), audienceTerm(audienceId));
}

/** Charge at "content effected effect" — the witnessed-effect read. */
export function effectCharge(section: SectionCarrier, contentId: string, effectId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), effectedPredicate(), effectTerm(effectId));
}

/** Charge at "content framed-as frame". */
export function frameCharge(section: SectionCarrier, contentId: string, frameId: string): ChargeCarrier {
  return contentCellCharge(section, contentTerm(contentId), framedAsPredicate(), frameTerm(frameId));
}

// ---------- the editorial gate verdict (gatekeeping theory's object) ----------

/**
 * The editorial gate's two-cell verdict on one content object: gatekeeping
 * theory's object as paired charges. `cleared` is the charge at "content
 * clears-gate gate" and `rejected` is the charge at "content rejected-by-gate
 * gate" - contrary cells held side by side, where both `potential` means the
 * gate has claimed both ways and both `absurd` means it has not spoken.
 */
export interface GateVerdict {
  readonly kind: "content.gate.verdict";
  readonly content: string;
  readonly gate: string;
  /** Charge at "content clears-gate gate": `potential` the gate cleared it,
   *  `absurd` the gate has not claimed clearance. */
  readonly cleared: ChargeCarrier;
  /** Charge at "content rejected-by-gate gate" — the contrary claim's own
   *  cell, never a polarity against clears-gate. Both charges `potential`
   *  means the gate has claimed both ways: two live contrary cells, held
   *  side by side, never an error. Both `absurd`: the gate has not spoken. */
  readonly rejected: ChargeCarrier;
}

/**
 * Reads both gate cells for a content object from the settled section and
 * returns a frozen GateVerdict pairing the clears-gate charge with the
 * rejected-by-gate charge.
 */
export function gateVerdict(section: SectionCarrier, contentId: string, gateName: string): GateVerdict {
  return Object.freeze({
    kind: "content.gate.verdict" as const,
    content: contentTerm(contentId),
    gate: gateTerm(gateName),
    cleared: contentCellCharge(section, contentTerm(contentId), clearsGatePredicate(), gateTerm(gateName)),
    rejected: contentCellCharge(section, contentTerm(contentId), rejectedByGatePredicate(), gateTerm(gateName)),
  });
}

// ---------- content analysis (the read direction) ----------

/**
 * The reading of one Lasswell position for a content object: `position` names
 * the coordinate and `entries` holds every settled cell placing this content at
 * that position, each with its charge.
 */
export interface PositionReading {
  readonly kind: "content.analysis.position";
  readonly position: LasswellPosition;
  /** Every settled cell placing this content at this position, with charges. */
  readonly entries: readonly SectionEntry[];
}

/**
 * The full content analysis of one content object: `content` is the analyzed
 * term and `readings` holds one PositionReading per Lasswell position, the
 * inferred coordinates of the content read back from the settled section.
 */
export interface ContentAnalysisCarrier {
  readonly kind: "content.analysis";
  readonly content: string;
  readonly readings: readonly PositionReading[];
}

const POSITION_ORDER: readonly LasswellPosition[] =
  Object.freeze(["communicator", "message", "channel", "audience", "effect"]);

const PREDICATE_OF: Readonly<Record<LasswellPosition, () => string>> = Object.freeze({
  communicator: communicatedByPredicate,
  message: saysPredicate,
  channel: inChannelPredicate,
  audience: addressedToPredicate,
  effect: effectedPredicate,
});

/** Infer the Lasswell coordinates of a content object from the settled
 *  section. Replicable by construction: same section, same analysis. */
export function contentAnalysis(section: SectionCarrier, contentId: string): ContentAnalysisCarrier {
  const subjectEntries = entriesForContent(section, contentTerm(contentId));
  const readings = POSITION_ORDER.map((position) => Object.freeze({
    kind: "content.analysis.position" as const,
    position,
    entries: Object.freeze(subjectEntries.filter((entry) => predicateMark(entry) === PREDICATE_OF[position]())),
  }));
  return Object.freeze({
    kind: "content.analysis" as const,
    content: contentTerm(contentId),
    readings: Object.freeze(readings),
  });
}

/** All settled cells about one content object. */
export function contentEntries(section: SectionCarrier, contentId: string): readonly SectionEntry[] {
  return entriesForContent(section, contentTerm(contentId));
}
