/**
 * anomie - normlessness and strain priced as coordination currency.
 *
 * Durkheim's anomie is regulatory failure; Merton's strain is the mismatch between
 * valued goals and legitimate means. In this package both become computable gaps in a
 * jural/common-knowledge field: norms absent, norms contested, means missing, authority
 * unaccountable, or contradiction recuperated instead of organized.
 */
import {
  action,
  jsonResource,
  type Action,
  type ChargeValueName,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import { coordinationCurrency, type CoordinationCurrency, type CoordinationCurrencyCellInput } from "./currency.mjs";
import { commonKnowledge, type CommonKnowledge } from "./epistemics.mjs";
import type { Governance, JuralRelation } from "./govern.mjs";

export interface AnomieInput {
  readonly name?: string;
  readonly relations?: readonly JuralRelation[];
  readonly governance?: Governance;
  readonly commonKnowledgeValues?: readonly ChargeValueName[];
  readonly reliableChannel?: boolean;
  readonly goals?: readonly string[];
  readonly means?: readonly string[];
  readonly exitOpen?: boolean;
  readonly recuperated?: boolean;
}

export interface Anomie {
  readonly kind: "socializing.anomie";
  readonly name: string;
  readonly observers: number;
  readonly normClaims: number;
  readonly normlessness: boolean;
  readonly contestedNorms: number;
  readonly goalMeansGap: number;
  readonly accountabilityGap: number;
  readonly obstruction: number;
  readonly commonKnowledge: CommonKnowledge;
  readonly exitOpen: boolean;
  readonly recuperated: boolean;
  readonly verdict: "integrated" | "strained" | "anomic";
  readonly currency: CoordinationCurrency;
  readonly theory: JsonRecord;
}

const THEORY: JsonRecord = Object.freeze({
  durkheim: "anomie is a failure of normative regulation, not mere disagreement",
  merton: "strain prices the gap between valued goals and institutionally available means",
  operaismo: "when social cooperation is commanded but means are withheld, the social factory issues debt",
  antiPsychiatry: "recuperated contradiction appears as individual maladjustment while remaining a field cost",
  noArbitrage: "an integrated field has no residual H1 coordination issue across these norm cells",
});

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function relationsOf(input: AnomieInput): readonly JuralRelation[] {
  if (input.relations !== undefined) return input.relations;
  if (input.governance !== undefined) return input.governance.relations;
  return Object.freeze([]);
}

function observersOf(relations: readonly JuralRelation[], governance?: Governance): number {
  if (governance !== undefined) return governance.observers;
  return new Set(relations.flatMap((relation) => [relation.active, relation.passive])).size;
}

function anomieCells(input: {
  readonly name: string;
  readonly normless: boolean;
  readonly contestedNorms: number;
  readonly goalMeansGap: number;
  readonly accountabilityGap: number;
  readonly obstruction: number;
  readonly commonKnowledge: CommonKnowledge;
  readonly exitOpen: boolean;
  readonly recuperated: boolean;
}): readonly CoordinationCurrencyCellInput[] {
  return Object.freeze([
    Object.freeze({
      id: `anomie:${input.name}:normlessness`,
      source: "anomie",
      spreadH1: input.normless ? 1 : 0,
      noArbitrage: !input.normless,
      coherentConsensus: !input.normless,
    }),
    Object.freeze({
      id: `anomie:${input.name}:contested-norms`,
      source: "anomie",
      spreadH1: input.contestedNorms,
      noArbitrage: input.contestedNorms === 0,
      coherentConsensus: input.contestedNorms === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:goal-means-gap`,
      source: "anomie",
      spreadH1: input.goalMeansGap,
      noArbitrage: input.goalMeansGap === 0,
      coherentConsensus: input.goalMeansGap === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:accountability-gap`,
      source: "anomie",
      spreadH1: input.accountabilityGap,
      noArbitrage: input.accountabilityGap === 0,
      coherentConsensus: input.accountabilityGap === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:h1-obstruction`,
      source: "anomie",
      spreadH1: input.obstruction,
      noArbitrage: input.obstruction === 0,
      coherentConsensus: input.obstruction === 0,
    }),
    Object.freeze({
      id: `anomie:${input.name}:common-knowledge`,
      source: "anomie",
      spreadH1: input.commonKnowledge.attained ? 0 : 1,
      noArbitrage: input.commonKnowledge.attained,
      coherentConsensus: input.commonKnowledge.attained,
    }),
    Object.freeze({
      id: `anomie:${input.name}:closed-exit`,
      source: "anomie",
      spreadH1: input.exitOpen ? 0 : 1,
      noArbitrage: input.exitOpen,
      coherentConsensus: input.exitOpen,
    }),
    Object.freeze({
      id: `anomie:${input.name}:recuperation`,
      source: "anomie",
      spreadH1: input.recuperated ? 1 : 0,
      noArbitrage: !input.recuperated,
      coherentConsensus: !input.recuperated,
    }),
  ]);
}

export function anomie(input: AnomieInput): Anomie {
  const name = input.name ?? "anomie";
  const relations = relationsOf(input);
  const observers = observersOf(relations, input.governance);
  const normClaims = relations.filter((relation) => relation.standing === "potential" || relation.standing === "stable").length;
  const normlessness = observers > 0 && normClaims === 0;
  const contestedNorms = relations.filter((relation) => relation.standing === "stable").length;
  const goalMeansGap = Math.max(0, (input.goals?.length ?? 0) - (input.means?.length ?? 0));
  const accountabilityGap = input.governance?.accountabilityGap ?? 0;
  const obstruction = input.governance?.obstruction ?? 0;
  const values = input.commonKnowledgeValues ?? relations.map((relation) => relation.standing);
  const ck = commonKnowledge(values, input.reliableChannel ?? true);
  const exitOpen = input.exitOpen ?? true;
  const recuperated = input.recuperated ?? false;
  const currency = coordinationCurrency(anomieCells({
    name,
    normless: normlessness,
    contestedNorms,
    goalMeansGap,
    accountabilityGap,
    obstruction,
    commonKnowledge: ck,
    exitOpen,
    recuperated,
  }));
  const verdict: Anomie["verdict"] = currency.issued === 0
    ? "integrated"
    : goalMeansGap > 0 && !normlessness
      ? "strained"
      : "anomic";
  return Object.freeze({
    kind: "socializing.anomie" as const,
    name,
    observers,
    normClaims,
    normlessness,
    contestedNorms,
    goalMeansGap,
    accountabilityGap,
    obstruction,
    commonKnowledge: ck,
    exitOpen,
    recuperated,
    verdict,
    currency,
    theory: THEORY,
  });
}

function chargeValues(value: unknown, label: string): readonly ChargeValueName[] {
  if (!Array.isArray(value)) throw new TypeError(`anomie: expected ${label} as ChargeValueName[]`);
  return Object.freeze(value as readonly ChargeValueName[]);
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`anomie: expected ${label} as string[]`);
  }
  return Object.freeze([...value]);
}

function admitAnomieInput(value: JsonValue): AnomieInput {
  if (!isRecord(value)) throw new TypeError("anomie: expected an object input");
  const input: {
    name?: string;
    relations?: readonly JuralRelation[];
    governance?: Governance;
    commonKnowledgeValues?: readonly ChargeValueName[];
    reliableChannel?: boolean;
    goals?: readonly string[];
    means?: readonly string[];
    exitOpen?: boolean;
    recuperated?: boolean;
  } = {};
  if (typeof value.name === "string") input.name = value.name;
  if (Array.isArray(value.relations)) input.relations = value.relations as unknown as readonly JuralRelation[];
  if (isRecord(value.governance) && Array.isArray(value.governance.relations)) input.governance = value.governance as unknown as Governance;
  if (value.commonKnowledgeValues !== undefined) input.commonKnowledgeValues = chargeValues(value.commonKnowledgeValues, "commonKnowledgeValues");
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  if (value.goals !== undefined) input.goals = stringArray(value.goals, "goals");
  if (value.means !== undefined) input.means = stringArray(value.means, "means");
  if (typeof value.exitOpen === "boolean") input.exitOpen = value.exitOpen;
  if (typeof value.recuperated === "boolean") input.recuperated = value.recuperated;
  return Object.freeze(input);
}

const ANOMIE_SCHEMA: JsonRecord = Object.freeze({
  title: "Anomie",
  type: "object",
  description:
    "Normlessness and strain priced through coordination-currency: absent norms, contested norms, goal/means gaps, accountability gaps, H1 obstruction, common-knowledge failure, closed exit, and recuperation.",
});

export const anomieAction: Action = action({
  verb: "anomie",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read anomie/strain and price the field's unresolved normative coordination work.",
  description:
    "Composes jural relations, optional governance, commonKnowledge, and Merton-style goals/means. Normlessness, contested norms, withheld means, unaccountable power, H1 obstruction, failed common knowledge, closed exit, and recuperation emit h1-coordination-credit cells.",
  domainSchema: Object.freeze({ type: "object" }),
  codomainSchema: ANOMIE_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(anomie(admitAnomieInput(jsonResource(input, "anomie input"))) as unknown as JsonValue, "anomie"),
});

export const anomieActions: readonly Action[] = Object.freeze([
  anomieAction,
]);
