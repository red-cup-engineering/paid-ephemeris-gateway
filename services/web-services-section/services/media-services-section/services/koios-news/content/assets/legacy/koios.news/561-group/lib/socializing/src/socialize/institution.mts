/**
 * institution - bridges that turn social forms into priced coordination work.
 *
 * institutionalize reads when practices have hardened into a durable institution
 * without becoming a self-referential racket; recognition reads whether domination is
 * misrecognized as legitimacy or contested into visibility. Both emit
 * coordination-currency cells, so the sociological verdict and the priced obligation
 * are one receipt.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import { capitalConcentration, symbolicViolence, type CapitalHolder, type SymbolicViolence } from "./bourdieu.mjs";
import { commonKnowledge, type CommonKnowledge } from "./epistemics.mjs";
import type { JuralRelation } from "./govern.mjs";
import { racketIndex, vitalityReading, type RacketIndex, type VitalityReading } from "./integrity.mjs";
import { ostromDiagnostic, type CommonsInstitution, type OstromDiagnostic } from "./ostrom.mjs";
import { coordinationCurrency, type CoordinationCurrency, type CoordinationCurrencyCellInput } from "./currency.mjs";
import type { GovernanceLevel } from "./deciding.mjs";
import type { Regime } from "./regime.mjs";

export interface InstitutionalizationInput {
  readonly name?: string;
  readonly institution: CommonsInstitution;
  readonly actLevels?: readonly GovernanceLevel[];
  readonly regime?: Regime;
  readonly concentration?: number;
  readonly exitOpen?: boolean;
}

export interface Institutionalization {
  readonly kind: "socializing.institutionalization";
  readonly name: string;
  readonly diagnostic: OstromDiagnostic;
  readonly racket: RacketIndex;
  readonly vitality: VitalityReading;
  readonly institutionalized: boolean;
  readonly enduring: boolean;
  readonly currency: CoordinationCurrency;
}

export interface RecognitionInput {
  readonly relations: readonly JuralRelation[];
  readonly agent: string;
  readonly scope: string;
  readonly holders?: readonly CapitalHolder[];
  readonly commonKnowledgeValues?: readonly ("potential" | "active" | "stable" | "absurd")[];
  readonly reliableChannel?: boolean;
}

export interface Recognition {
  readonly kind: "socializing.recognition";
  readonly agent: string;
  readonly scope: string;
  readonly symbolicViolence: SymbolicViolence;
  readonly commonKnowledge: CommonKnowledge;
  readonly symbolicTopHolder: string;
  readonly symbolicTopShare: number;
  readonly recognized: boolean;
  readonly misrecognized: boolean;
  readonly contested: boolean;
  readonly currency: CoordinationCurrency;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function concentrationFromRelations(relations: readonly JuralRelation[]): number {
  const observers = new Set<string>();
  const dominionOf = new Map<string, Set<string>>();
  for (const relation of relations) {
    observers.add(relation.active);
    observers.add(relation.passive);
    if (relation.kind !== "power" || relation.standing === "active" || relation.standing === "absurd") continue;
    const reach = dominionOf.get(relation.active) ?? new Set<string>();
    reach.add(relation.passive);
    dominionOf.set(relation.active, reach);
  }
  const dominion = Math.max(0, ...[...dominionOf.values()].map((reach) => reach.size));
  return observers.size > 1 ? dominion / (observers.size - 1) : 0;
}

function institutionCells(
  name: string,
  diagnostic: OstromDiagnostic,
  racket: RacketIndex,
  vitality: VitalityReading,
): readonly CoordinationCurrencyCellInput[] {
  const missing = 8 - diagnostic.satisfied;
  return Object.freeze([
    Object.freeze({
      id: `institution:${name}:ostrom-gap`,
      source: "institutionalize",
      spreadH1: missing,
      noArbitrage: missing === 0,
      coherentConsensus: missing === 0,
    }),
    Object.freeze({
      id: `institution:${name}:polycentricity`,
      source: "institutionalize",
      spreadH1: diagnostic.nestedEnterprises ? 0 : 1,
      noArbitrage: diagnostic.nestedEnterprises,
      coherentConsensus: diagnostic.nestedEnterprises,
    }),
    Object.freeze({
      id: `institution:${name}:racket`,
      source: "institutionalize",
      spreadH1: racket.racket ? 1 : 0,
      noArbitrage: !racket.racket,
      coherentConsensus: !racket.racket,
    }),
    Object.freeze({
      id: `institution:${name}:vitality`,
      source: "institutionalize",
      spreadH1: vitality.verdict === "calcified" ? 1 : 0,
      noArbitrage: vitality.verdict !== "calcified",
      coherentConsensus: vitality.verdict !== "calcified",
    }),
  ]);
}

export function institutionalize(input: InstitutionalizationInput): Institutionalization {
  const name = input.name ?? "institution";
  const diagnostic = ostromDiagnostic(input.institution);
  const racket = racketIndex(input.actLevels ?? []);
  const concentration = input.concentration ?? concentrationFromRelations(input.institution.relations);
  const vitality = vitalityReading(input.regime ?? "strict", concentration, input.exitOpen ?? true);
  const currency = coordinationCurrency(institutionCells(name, diagnostic, racket, vitality));
  const institutionalized = diagnostic.satisfied >= 6 && !racket.racket;
  const enduring = diagnostic.enduring && vitality.verdict === "alive" && !racket.racket;
  return Object.freeze({
    kind: "socializing.institutionalization" as const,
    name,
    diagnostic,
    racket,
    vitality,
    institutionalized,
    enduring,
    currency,
  });
}

function recognitionCells(input: RecognitionInput, violence: SymbolicViolence, ck: CommonKnowledge, symbolicTopHolder: string, symbolicTopShare: number): readonly CoordinationCurrencyCellInput[] {
  const monopoly = symbolicTopShare > 0.5 && symbolicTopHolder !== "" && symbolicTopHolder !== input.agent;
  return Object.freeze([
    Object.freeze({
      id: `recognition:${input.agent}:${input.scope}:symbolic-violence`,
      source: "recognition",
      spreadH1: violence.symbolicViolence ? 1 : 0,
      noArbitrage: !violence.symbolicViolence,
      coherentConsensus: !violence.symbolicViolence,
    }),
    Object.freeze({
      id: `recognition:${input.agent}:${input.scope}:common-knowledge`,
      source: "recognition",
      spreadH1: ck.attained ? 0 : 1,
      noArbitrage: ck.attained,
      coherentConsensus: ck.attained,
    }),
    Object.freeze({
      id: `recognition:${input.agent}:${input.scope}:symbolic-capital`,
      source: "recognition",
      spreadH1: monopoly ? 1 : 0,
      noArbitrage: !monopoly,
      coherentConsensus: !monopoly,
    }),
  ]);
}

export function recognition(input: RecognitionInput): Recognition {
  const violence = symbolicViolence(input.relations, input.agent, input.scope);
  const values = input.commonKnowledgeValues ?? input.relations
    .filter((relation) => relation.scope === input.scope)
    .map((relation) => relation.standing);
  const ck = commonKnowledge(values, input.reliableChannel ?? true);
  const symbolic = input.holders === undefined || input.holders.length === 0
    ? null
    : capitalConcentration(input.holders, "symbolic");
  const symbolicTopHolder = symbolic?.topHolder ?? "";
  const symbolicTopShare = symbolic?.topShare ?? 0;
  const currency = coordinationCurrency(recognitionCells(input, violence, ck, symbolicTopHolder, symbolicTopShare));
  const recognized = ck.attained && !violence.symbolicViolence && symbolicTopShare <= 0.5;
  const misrecognized = violence.symbolicViolence;
  return Object.freeze({
    kind: "socializing.recognition" as const,
    agent: input.agent,
    scope: input.scope,
    symbolicViolence: violence,
    commonKnowledge: ck,
    symbolicTopHolder,
    symbolicTopShare,
    recognized,
    misrecognized,
    contested: currency.contested > 0,
    currency,
  });
}

function admitInstitutionalizationInput(value: JsonValue): InstitutionalizationInput {
  if (!isRecord(value) || !isRecord(value.institution)) {
    throw new TypeError("institutionalize: expected { institution, actLevels?, regime?, concentration?, exitOpen? }");
  }
  const input: {
    name?: string;
    institution: CommonsInstitution;
    actLevels?: readonly GovernanceLevel[];
    regime?: Regime;
    concentration?: number;
    exitOpen?: boolean;
  } = {
    institution: value.institution as unknown as CommonsInstitution,
  };
  if (typeof value.name === "string") input.name = value.name;
  if (Array.isArray(value.actLevels)) input.actLevels = value.actLevels as readonly GovernanceLevel[];
  if (typeof value.regime === "string") input.regime = value.regime as Regime;
  if (typeof value.concentration === "number") input.concentration = value.concentration;
  if (typeof value.exitOpen === "boolean") input.exitOpen = value.exitOpen;
  return Object.freeze(input);
}

function admitRecognitionInput(value: JsonValue): RecognitionInput {
  if (!isRecord(value) || !Array.isArray(value.relations) || typeof value.agent !== "string" || typeof value.scope !== "string") {
    throw new TypeError("recognition: expected { relations, agent, scope, holders?, commonKnowledgeValues?, reliableChannel? }");
  }
  const input: {
    relations: readonly JuralRelation[];
    agent: string;
    scope: string;
    holders?: readonly CapitalHolder[];
    commonKnowledgeValues?: readonly ("potential" | "active" | "stable" | "absurd")[];
    reliableChannel?: boolean;
  } = {
    relations: value.relations as unknown as readonly JuralRelation[],
    agent: value.agent,
    scope: value.scope,
  };
  if (Array.isArray(value.holders)) input.holders = value.holders as unknown as readonly CapitalHolder[];
  if (Array.isArray(value.commonKnowledgeValues)) input.commonKnowledgeValues = value.commonKnowledgeValues as readonly ("potential" | "active" | "stable" | "absurd")[];
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  return Object.freeze(input);
}

const INSTITUTION_SCHEMA: JsonRecord = Object.freeze({
  title: "Institutionalization",
  type: "object",
  description: "Ostrom institutional durability plus racket/vitality readings, priced through coordination-currency.",
});

const RECOGNITION_SCHEMA: JsonRecord = Object.freeze({
  title: "Recognition",
  type: "object",
  description: "Recognition/misrecognition over a jural scope, priced through coordination-currency.",
});

export const institutionalizeAction: Action = action({
  verb: "institutionalize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read whether practices have hardened into a durable institution and price the unresolved coordination work.",
  description:
    "Composes Ostrom diagnostics, racket index, and vitality. Missing design principles, racket self-reference, and calcification emit h1-coordination-credit cells.",
  domainSchema: Object.freeze({ type: "object" }),
  codomainSchema: INSTITUTION_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(institutionalize(admitInstitutionalizationInput(jsonResource(input, "institutionalize input"))) as unknown as JsonValue, "institutionalization"),
});

export const recognitionAction: Action = action({
  verb: "recognition",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read recognition and misrecognition, then price symbolic-violence and common-knowledge deficits.",
  description:
    "Composes Bourdieu symbolic violence, common knowledge, and symbolic-capital concentration. Misrecognized domination, failed common knowledge, and symbolic-capital monopoly emit h1-coordination-credit cells.",
  domainSchema: Object.freeze({ type: "object" }),
  codomainSchema: RECOGNITION_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(recognition(admitRecognitionInput(jsonResource(input, "recognition input"))) as unknown as JsonValue, "recognition"),
});

export const institutionActions: readonly Action[] = Object.freeze([
  institutionalizeAction,
  recognitionAction,
]);
