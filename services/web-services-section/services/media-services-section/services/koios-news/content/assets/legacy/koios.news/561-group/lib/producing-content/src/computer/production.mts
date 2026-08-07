/**
 * production — the content domain's compute layer over the carriers of
 * @emsenn/content-topology.
 *
 * Two morphisms:
 *
 * - `meetDemandWithSupply` — demand meets supply in the lattice sense: an
 *   assignment is created only over the demanded terms that the supplied
 *   intake actually supports. Every demanded term receives a judgment —
 *   a support witness carrying its supplying items and evidence, or an
 *   obstruction (invariant A1: judgments are carriers, never booleans).
 *
 * - `runProductionCycle` — the draft → judge → revise cycle. The ask and
 *   the gates enter as VALUES; the result is a witness-or-obstruction
 *   carrier whose rounds are an append-only trace ordered by stage
 *   ordinals, never by wall-clock.
 */

import type { AudienceCoordinate, ChannelCoordinate } from "@emsenn/content/topology";
import { demandRanking, type DemandChargeCarrier } from "@emsenn/content/topology/demand";
import {
  assignment,
  draft,
  reviseDraft,
  currentSurfaces,
  type AssignmentCarrier,
  type DraftCarrier,
} from "@emsenn/content/topology/production";


// ---------- demand meets supply ----------

/**
 * A support reading: the evidence (possibly none) that one supplied item
 * gives for one demanded term. Empty evidence means no support — absence
 * is data, not a throw.
 */
export type SupportReading<Item> = (term: string, item: Item) => readonly unknown[];

export interface TermSupportWitness<Item> {
  readonly kind: "content.assignment.support:witness";
  readonly term: string;
  /** The folded demand at this term (exact, from the charge). */
  readonly value: bigint;
  /** The supplied items that support the term. */
  readonly supply: readonly Item[];
  /** The evidence those items gave, in supply order. */
  readonly evidence: readonly unknown[];
}

export interface TermSupportObstruction {
  readonly kind: "content.assignment.support-obstruction";
  readonly term: string;
  readonly value: bigint;
}

export type TermSupportJudgment<Item> = TermSupportWitness<Item> | TermSupportObstruction;

export interface DemandSupplyMeet<Item> {
  readonly kind: "content.assignment.meet";
  /** The assignment over exactly the supported demanded terms. */
  readonly assignment: AssignmentCarrier;
  /** One judgment per positively demanded term, in ranked order. */
  readonly judgments: readonly TermSupportJudgment<Item>[];
}

export interface MeetOptions<Item> {
  readonly id: string;
  readonly brief: string;
  readonly support: SupportReading<Item>;
  readonly channel?: ChannelCoordinate;
  readonly audience?: AudienceCoordinate;
}

/**
 * Assign demand only where intake support exists. The subjects of the
 * resulting assignment are the positively demanded terms with at least one
 * supporting item, in ranked demand order; the full demand charge rides
 * along as the assignment's warrant. Unsupported demand is returned as
 * obstruction judgments, never silently dropped.
 */
export function meetDemandWithSupply<Item>(
  demand: DemandChargeCarrier,
  supply: readonly Item[],
  options: MeetOptions<Item>,
): DemandSupplyMeet<Item> {
  const ranked = demandRanking(demand).filter((rank) => rank.value > 0n);
  const judgments = ranked.map((rank): TermSupportJudgment<Item> => {
    const supporting: Item[] = [];
    const evidence: unknown[] = [];
    for (const item of supply) {
      const itemEvidence = options.support(rank.term, item);
      if (itemEvidence.length === 0) continue;
      supporting.push(item);
      evidence.push(...itemEvidence);
    }
    if (supporting.length === 0) {
      return Object.freeze({
        kind: "content.assignment.support-obstruction" as const,
        term: rank.term,
        value: rank.value,
      });
    }
    return Object.freeze({
      kind: "content.assignment.support:witness" as const,
      term: rank.term,
      value: rank.value,
      supply: Object.freeze(supporting),
      evidence: Object.freeze(evidence),
    });
  });
  const subjects = judgments
    .filter((judgment) => judgment.kind === "content.assignment.support:witness")
    .map((judgment) => judgment.term);
  return Object.freeze({
    kind: "content.assignment.meet" as const,
    assignment: assignment({
      id: options.id,
      brief: options.brief,
      subjects,
      ...(options.channel !== undefined ? { channel: options.channel } : {}),
      ...(options.audience !== undefined ? { audience: options.audience } : {}),
      demand,
    }),
    judgments: Object.freeze(judgments),
  });
}

/**
 * The default support reading for article intake: the fields of the
 * article (title, summary, categories) in which the term occurs,
 * case-insensitively. Empty result means the article gives no support.
 */
export function articleSupport(term: string, article: { title: string; summary?: string; categories?: readonly string[] }): readonly string[] {
  const needle = term.toLowerCase();
  const evidence: string[] = [];
  if (article.title.toLowerCase().includes(needle)) evidence.push(`title: ${article.title}`);
  if (article.summary && article.summary.toLowerCase().includes(needle)) evidence.push(`summary: ${article.summary}`);
  for (const category of article.categories ?? []) {
    if (category.toLowerCase().includes(needle)) evidence.push(`category: ${category}`);
  }
  return Object.freeze(evidence);
}

// ---------- the draft → judge → revise cycle ----------

export type Ask = (prompt: string) => Promise<string> | string;

export interface GateWitness {
  readonly kind: "content.production.gate:witness";
  readonly gate: string;
  readonly evidence: readonly unknown[];
}

export interface GateObstruction {
  readonly kind: "content.production.gate-obstruction";
  readonly gate: string;
  /** What the gate found wanting — material for the revise prompt. */
  readonly obstructions: readonly string[];
}

export type GateJudgment = GateWitness | GateObstruction;

export function gateWitness(gate: string, evidence: readonly unknown[] = []): GateWitness {
  return Object.freeze({ kind: "content.production.gate:witness" as const, gate, evidence: Object.freeze([...evidence]) });
}

export function gateObstruction(gate: string, obstructions: readonly string[]): GateObstruction {
  return Object.freeze({ kind: "content.production.gate-obstruction" as const, gate, obstructions: Object.freeze([...obstructions]) });
}

/** A gate as a value: a named judge over the draft in production. */
export interface ProductionGate {
  readonly name: string;
  readonly judge: (draftCarrier: DraftCarrier) => GateJudgment | Promise<GateJudgment>;
}

/** One round of the cycle: the draft as judged, at its stage ordinal. */
export interface CycleRound {
  readonly kind: "content.production.round";
  /** Stage ordinal: position in the cycle's trace, never wall-clock. */
  readonly stage: bigint;
  readonly draft: DraftCarrier;
  readonly judgments: readonly GateJudgment[];
}

export interface CycleWitness {
  readonly kind: "content.production.cycle:witness";
  readonly draft: DraftCarrier;
  /** Append-only trace of every round, including the clearing one. */
  readonly rounds: readonly CycleRound[];
}

export interface CycleObstruction {
  readonly kind: "content.production.cycle-obstruction";
  readonly draft: DraftCarrier;
  readonly rounds: readonly CycleRound[];
  /** The gate obstructions still standing after the final round. */
  readonly obstructions: readonly GateObstruction[];
}

export type CycleJudgment = CycleWitness | CycleObstruction;

export interface CycleOptions {
  readonly draftId: string;
  /** Which surface of the message the cycle produces. Default "body". */
  readonly surface?: string;
  /** How many revise rounds may follow the first draft. Default 2n. */
  readonly revisions?: bigint;
  readonly draftPrompt?: (assignmentCarrier: AssignmentCarrier) => string;
  readonly revisePrompt?: (
    assignmentCarrier: AssignmentCarrier,
    draftCarrier: DraftCarrier,
    obstructions: readonly GateObstruction[],
  ) => string;
}

// ---------- strategy readings ----------

/**
 * A production move is an arena-specific operation recorded in the common
 * producing-content game vocabulary. News production, research-library
 * composition, and other producers keep their own payload shapes; the shared
 * carrier records the move name, whether it was executed, and the local result.
 */
export interface ProductionMove {
  readonly kind: "content.production.move";
  readonly name: string;
  readonly executed: boolean;
  readonly payload?: unknown;
  readonly result?: unknown;
}

/**
 * A production strategy reading is the shared envelope for "same game,
 * different arena/strategy" content work. The arena and strategy are named
 * plain values at this layer; richer sites may also carry real gaming/computing
 * carriers in `evidence`.
 */
export interface ProductionStrategyReading {
  readonly kind: "content.production.strategy-reading";
  readonly arena: string;
  readonly strategy: string;
  readonly assignment: unknown;
  readonly moves: readonly ProductionMove[];
  readonly gates: readonly GateJudgment[];
  readonly nextMoves: readonly ProductionMove[];
  readonly evidence?: unknown;
}

export function productionMove(input: Readonly<{
  name: string;
  executed?: boolean;
  payload?: unknown;
  result?: unknown;
}>): ProductionMove {
  return Object.freeze({
    kind: "content.production.move" as const,
    name: input.name,
    executed: input.executed ?? false,
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    ...(input.result === undefined ? {} : { result: input.result }),
  });
}

export function productionStrategyReading(input: Readonly<{
  arena: string;
  strategy: string;
  assignment: unknown;
  moves: readonly ProductionMove[];
  gates: readonly GateJudgment[];
  nextMoves?: readonly ProductionMove[];
  evidence?: unknown;
}>): ProductionStrategyReading {
  return Object.freeze({
    kind: "content.production.strategy-reading" as const,
    arena: input.arena,
    strategy: input.strategy,
    assignment: input.assignment,
    moves: Object.freeze([...input.moves]),
    gates: Object.freeze([...input.gates]),
    nextMoves: Object.freeze([...(input.nextMoves ?? [])]),
    ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
  });
}

function defaultDraftPrompt(assignmentCarrier: AssignmentCarrier): string {
  return `${assignmentCarrier.brief}\n\nSubjects to cover: ${assignmentCarrier.subjects.join(", ")}.\n\nWrite the text.`;
}

function defaultRevisePrompt(
  assignmentCarrier: AssignmentCarrier,
  draftCarrier: DraftCarrier,
  obstructions: readonly GateObstruction[],
): string {
  const current = currentSurfaces(draftCarrier).map((surface) => `${surface.name}:\n${surface.text}`).join("\n\n");
  const found = obstructions.flatMap((entry) => entry.obstructions.map((reason) => `- ${entry.gate}: ${reason}`)).join("\n");
  return `${assignmentCarrier.brief}\n\nCurrent draft:\n\n${current}\n\nThe following must be repaired:\n${found}\n\nWrite the revised text.`;
}

/**
 * Run the draft → judge → revise cycle for one assignment. The first round
 * drafts from the assignment; each later round revises against the
 * standing gate obstructions, up to `revisions` times. Returns a
 * CycleWitness when every gate witnesses the draft, or a CycleObstruction
 * carrying the rounds trace and the obstructions still standing —
 * exhaustion is a result, not an error.
 */
export async function runProductionCycle(
  ask: Ask,
  gates: readonly ProductionGate[],
  assignmentCarrier: AssignmentCarrier,
  options: CycleOptions,
): Promise<CycleJudgment> {
  const surfaceName = options.surface ?? "body";
  const revisions = options.revisions ?? 2n;
  const draftPrompt = options.draftPrompt ?? defaultDraftPrompt;
  const revisePrompt = options.revisePrompt ?? defaultRevisePrompt;

  let draftCarrier = reviseDraft(
    draft({ id: options.draftId, assignment: assignmentCarrier.id }),
    surfaceName,
    String(await ask(draftPrompt(assignmentCarrier))),
  );

  const rounds: CycleRound[] = [];
  for (let stage = 0n; ; stage += 1n) {
    const judgments: GateJudgment[] = [];
    for (const gate of gates) judgments.push(await gate.judge(draftCarrier));
    rounds.push(Object.freeze({
      kind: "content.production.round" as const,
      stage,
      draft: draftCarrier,
      judgments: Object.freeze(judgments),
    }));
    const obstructions = judgments.filter((judgment) => judgment.kind === "content.production.gate-obstruction");
    if (obstructions.length === 0) {
      return Object.freeze({
        kind: "content.production.cycle:witness" as const,
        draft: draftCarrier,
        rounds: Object.freeze([...rounds]),
      });
    }
    if (stage >= revisions) {
      return Object.freeze({
        kind: "content.production.cycle-obstruction" as const,
        draft: draftCarrier,
        rounds: Object.freeze([...rounds]),
        obstructions: Object.freeze(obstructions),
      });
    }
    draftCarrier = reviseDraft(
      draftCarrier,
      surfaceName,
      String(await ask(revisePrompt(assignmentCarrier, draftCarrier, obstructions))),
    );
  }
}
