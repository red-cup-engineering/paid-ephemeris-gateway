/**
 * legitimacy - recognized authority priced as coordination currency.
 *
 * Legitimacy is not mere power. It requires a basis of authority, common knowledge of
 * the claim, accountability for powers, and an absence of symbolic violence. This bridge
 * composes Weber's authority bases, Bourdieu's misrecognition, and the Hohfeldian
 * accountability rule into one priced receipt.
 */
import {
  action,
  jsonResource,
  type Action,
  type ChargeValueName,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import { capitalConcentration, symbolicViolence, type CapitalHolder, type SymbolicViolence } from "./bourdieu.mjs";
import { coordinationCurrency, type CoordinationCurrency, type CoordinationCurrencyCellInput } from "./currency.mjs";
import { routinize, type AuthorityBasis } from "./deciding.mjs";
import { commonKnowledge, type CommonKnowledge } from "./epistemics.mjs";
import type { Governance, JuralRelation } from "./govern.mjs";

export interface LegitimacyInput {
  readonly name?: string;
  readonly relations?: readonly JuralRelation[];
  readonly governance?: Governance;
  readonly claimant: string;
  readonly scope: string;
  readonly basis?: AuthorityBasis;
  readonly routinizeToward?: "traditional" | "rational-legal";
  readonly holders?: readonly CapitalHolder[];
  readonly commonKnowledgeValues?: readonly ChargeValueName[];
  readonly reliableChannel?: boolean;
}

export interface Legitimacy {
  readonly kind: "socializing.legitimacy";
  readonly name: string;
  readonly claimant: string;
  readonly scope: string;
  readonly basis: AuthorityBasis;
  readonly routinizedBasis: AuthorityBasis;
  readonly commonKnowledge: CommonKnowledge;
  readonly symbolicViolence: SymbolicViolence;
  readonly symbolicTopHolder: string;
  readonly symbolicTopShare: number;
  readonly accountabilityGap: number;
  readonly charismaticInstability: boolean;
  readonly symbolicMonopoly: boolean;
  readonly legitimate: boolean;
  readonly legitimacyCrisis: boolean;
  readonly currency: CoordinationCurrency;
  readonly theory: JsonRecord;
}

const THEORY: JsonRecord = Object.freeze({
  weber: "authority becomes legitimate through traditional, charismatic, or rational-legal recognition",
  routinization: "charisma carries an instability cost until it settles into a durable basis",
  bourdieu: "misrecognized domination is symbolic violence, not legitimacy",
  marxist: "legitimacy resting on concentrated symbolic capital is a command relation with a price",
  autonomist: "accountable authority must remain refusible; otherwise legitimacy becomes capture",
});

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function relationsOf(input: LegitimacyInput): readonly JuralRelation[] {
  if (input.relations !== undefined) return input.relations;
  if (input.governance !== undefined) return input.governance.relations;
  return Object.freeze([]);
}

function claimantAccountabilityGap(relations: readonly JuralRelation[], claimant: string, governance?: Governance): number {
  if (governance !== undefined) {
    return relations.filter((relation) =>
      relation.kind === "power"
      && relation.active === claimant
      && (relation.standing === "potential" || relation.standing === "stable"))
      .filter(() => !relations.some((relation) =>
        relation.kind === "duty"
        && relation.active === claimant
        && (relation.standing === "potential" || relation.standing === "stable"))).length;
  }
  const accountable = relations.some((relation) =>
    relation.kind === "duty"
    && relation.active === claimant
    && (relation.standing === "potential" || relation.standing === "stable"));
  return accountable ? 0 : relations.filter((relation) =>
    relation.kind === "power"
    && relation.active === claimant
    && (relation.standing === "potential" || relation.standing === "stable")).length;
}

function authoritySymbolicViolence(relations: readonly JuralRelation[], claimant: string, scope: string): SymbolicViolence {
  const candidates = new Set<string>();
  for (const relation of relations) {
    if (relation.scope !== scope) continue;
    if (relation.kind === "power" && relation.active === claimant) candidates.add(relation.passive);
    if (relation.kind === "duty" && relation.passive === claimant) candidates.add(relation.active);
  }
  for (const agent of candidates) {
    const violence = symbolicViolence(relations, agent, scope);
    if (violence.symbolicViolence) return violence;
  }
  return symbolicViolence(relations, claimant, scope);
}

function legitimacyCells(input: {
  readonly name: string;
  readonly commonKnowledge: CommonKnowledge;
  readonly symbolicViolence: SymbolicViolence;
  readonly accountabilityGap: number;
  readonly charismaticInstability: boolean;
  readonly symbolicMonopoly: boolean;
}): readonly CoordinationCurrencyCellInput[] {
  return Object.freeze([
    Object.freeze({
      id: `legitimate:${input.name}:common-knowledge`,
      source: "legitimate",
      spreadH1: input.commonKnowledge.attained ? 0 : 1,
      noArbitrage: input.commonKnowledge.attained,
      coherentConsensus: input.commonKnowledge.attained,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:symbolic-violence`,
      source: "legitimate",
      spreadH1: input.symbolicViolence.symbolicViolence ? 1 : 0,
      noArbitrage: !input.symbolicViolence.symbolicViolence,
      coherentConsensus: !input.symbolicViolence.symbolicViolence,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:accountability-gap`,
      source: "legitimate",
      spreadH1: input.accountabilityGap,
      noArbitrage: input.accountabilityGap === 0,
      coherentConsensus: input.accountabilityGap === 0,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:charismatic-instability`,
      source: "legitimate",
      spreadH1: input.charismaticInstability ? 1 : 0,
      noArbitrage: !input.charismaticInstability,
      coherentConsensus: !input.charismaticInstability,
    }),
    Object.freeze({
      id: `legitimate:${input.name}:symbolic-monopoly`,
      source: "legitimate",
      spreadH1: input.symbolicMonopoly ? 1 : 0,
      noArbitrage: !input.symbolicMonopoly,
      coherentConsensus: !input.symbolicMonopoly,
    }),
  ]);
}

export function legitimate(input: LegitimacyInput): Legitimacy {
  const name = input.name ?? "legitimacy";
  const relations = relationsOf(input);
  const basis = input.basis ?? "rational-legal";
  const routinizedBasis = routinize(basis, input.routinizeToward ?? "rational-legal");
  const values = input.commonKnowledgeValues ?? relations
    .filter((relation) => relation.scope === input.scope)
    .map((relation) => relation.standing);
  const ck = commonKnowledge(values, input.reliableChannel ?? true);
  const violence = authoritySymbolicViolence(relations, input.claimant, input.scope);
  const symbolic = input.holders === undefined || input.holders.length === 0
    ? null
    : capitalConcentration(input.holders, "symbolic");
  const symbolicTopHolder = symbolic?.topHolder ?? "";
  const symbolicTopShare = symbolic?.topShare ?? 0;
  const symbolicMonopoly = symbolicTopHolder === input.claimant && symbolicTopShare > 0.5;
  const accountabilityGap = claimantAccountabilityGap(relations, input.claimant, input.governance);
  const charismaticInstability = basis === "charismatic";
  const currency = coordinationCurrency(legitimacyCells({
    name,
    commonKnowledge: ck,
    symbolicViolence: violence,
    accountabilityGap,
    charismaticInstability,
    symbolicMonopoly,
  }));
  const legitimateValue = ck.attained && !violence.symbolicViolence && accountabilityGap === 0 && !charismaticInstability && !symbolicMonopoly;
  return Object.freeze({
    kind: "socializing.legitimacy" as const,
    name,
    claimant: input.claimant,
    scope: input.scope,
    basis,
    routinizedBasis,
    commonKnowledge: ck,
    symbolicViolence: violence,
    symbolicTopHolder,
    symbolicTopShare,
    accountabilityGap,
    charismaticInstability,
    symbolicMonopoly,
    legitimate: legitimateValue,
    legitimacyCrisis: !legitimateValue,
    currency,
    theory: THEORY,
  });
}

function chargeValues(value: unknown, label: string): readonly ChargeValueName[] {
  if (!Array.isArray(value)) throw new TypeError(`legitimate: expected ${label} as ChargeValueName[]`);
  return Object.freeze(value as readonly ChargeValueName[]);
}

function admitLegitimacyInput(value: JsonValue): LegitimacyInput {
  if (!isRecord(value) || typeof value.claimant !== "string" || typeof value.scope !== "string") {
    throw new TypeError("legitimate: expected { claimant, scope, relations?, governance?, basis?, holders? }");
  }
  const input: {
    name?: string;
    relations?: readonly JuralRelation[];
    governance?: Governance;
    claimant: string;
    scope: string;
    basis?: AuthorityBasis;
    routinizeToward?: "traditional" | "rational-legal";
    holders?: readonly CapitalHolder[];
    commonKnowledgeValues?: readonly ChargeValueName[];
    reliableChannel?: boolean;
  } = {
    claimant: value.claimant,
    scope: value.scope,
  };
  if (typeof value.name === "string") input.name = value.name;
  if (Array.isArray(value.relations)) input.relations = value.relations as unknown as readonly JuralRelation[];
  if (isRecord(value.governance) && Array.isArray(value.governance.relations)) input.governance = value.governance as unknown as Governance;
  if (typeof value.basis === "string") input.basis = value.basis as AuthorityBasis;
  if (value.routinizeToward === "traditional" || value.routinizeToward === "rational-legal") input.routinizeToward = value.routinizeToward;
  if (Array.isArray(value.holders)) input.holders = value.holders as unknown as readonly CapitalHolder[];
  if (value.commonKnowledgeValues !== undefined) input.commonKnowledgeValues = chargeValues(value.commonKnowledgeValues, "commonKnowledgeValues");
  if (typeof value.reliableChannel === "boolean") input.reliableChannel = value.reliableChannel;
  return Object.freeze(input);
}

const LEGITIMACY_SCHEMA: JsonRecord = Object.freeze({
  title: "Legitimacy",
  type: "object",
  description:
    "Legitimacy of authority priced through coordination-currency: common knowledge, symbolic violence, accountability, charismatic instability, and symbolic monopoly.",
});

export const legitimateAction: Action = action({
  verb: "legitimate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read whether authority is legitimate and price the unresolved legitimacy crisis.",
  description:
    "Composes Weber routinization, commonKnowledge, Bourdieu symbolic violence/capital concentration, and Hohfeldian accountability. Failed recognition, misrecognized domination, unaccountable power, charismatic instability, and symbolic monopoly emit h1-coordination-credit cells.",
  domainSchema: Object.freeze({ type: "object" }),
  codomainSchema: LEGITIMACY_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(legitimate(admitLegitimacyInput(jsonResource(input, "legitimate input"))) as unknown as JsonValue, "legitimacy"),
});

export const legitimacyActions: readonly Action[] = Object.freeze([
  legitimateAction,
]);
