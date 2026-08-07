/**
 * boundary-work - classification, translation, and policing priced as coordination cost.
 *
 * Boundary-work is the labor of saying who counts, who does not, and which crossings
 * are possible. The reading combines socializing's observer-category translations with
 * Hohfeldian jural relations: a boundary can be legible, porous, exclusionary, contested,
 * or policed. The anarchist/autonomist pressure is to keep exodus/refusal visible as a
 * priced relation rather than naturalizing the border.
 */
import {
  action,
  jsonResource,
  type Action,
  type JsonRecord,
  type JsonValue,
} from "@emsenn/relating";

import { coordinationCurrency, type CoordinationCurrency, type CoordinationCurrencyCellInput } from "./currency.mjs";
import type { Field } from "./field.mjs";
import type { JuralRelation } from "./govern.mjs";

export interface BoundaryWorkInput {
  readonly name?: string;
  readonly field?: Field;
  readonly relations?: readonly JuralRelation[];
  readonly insiders: readonly string[];
  readonly outsiders: readonly string[];
  readonly criterion?: string;
  readonly subalternAgents?: readonly string[];
}

export interface BoundaryWork {
  readonly kind: "socializing.boundary-work";
  readonly name: string;
  readonly criterion: string;
  readonly insiders: readonly string[];
  readonly outsiders: readonly string[];
  readonly ambiguousAgents: readonly string[];
  readonly crossBoundaryTranslations: number;
  readonly missingCrossBoundaryTranslations: number;
  readonly policingRelations: number;
  readonly contestedBoundaryRelations: number;
  readonly subalternExcluded: number;
  readonly legible: boolean;
  readonly porous: boolean;
  readonly exclusionary: boolean;
  readonly currency: CoordinationCurrency;
  readonly theory: JsonRecord;
}

const THEORY: JsonRecord = Object.freeze({
  gieryn: "boundary-work is the labor of demarcating a legitimate inside from an outside",
  barth: "boundaries persist through regulated crossings, not through cultural essence",
  douglas: "pollution and purity name classification pressure at the boundary",
  exodus: "refusal and flight are boundary-making capacities, not merely failures to belong",
  noBorders: "policed exclusion is priced as coordination debt rather than treated as natural order",
});

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)].sort());

function fieldAgents(field?: Field): readonly string[] {
  if (field === undefined) return Object.freeze([]);
  return Object.freeze(field.members.map((member, index) => {
    const identity = member.agent.identity;
    if (typeof identity === "string" && identity !== "") return identity;
    const name = member.agent.name;
    if (typeof name === "string" && name !== "") return name;
    return `observer:${index}`;
  }));
}

function relationAgents(relations: readonly JuralRelation[]): readonly string[] {
  return Object.freeze([...new Set(relations.flatMap((relation) => [relation.active, relation.passive]))]);
}

function crossesBoundary(relation: JuralRelation, insiders: ReadonlySet<string>, outsiders: ReadonlySet<string>): boolean {
  return (insiders.has(relation.active) && outsiders.has(relation.passive))
    || (outsiders.has(relation.active) && insiders.has(relation.passive));
}

function policingKind(kind: JuralRelation["kind"]): boolean {
  return kind === "power" || kind === "liability" || kind === "no-right" || kind === "disability";
}

function crossTranslations(field: Field | undefined, insiders: ReadonlySet<string>, outsiders: ReadonlySet<string>, names: readonly string[]): number {
  if (field === undefined) return 0;
  let count = 0;
  for (const translation of field.base.translations) {
    const source = names[translation.source];
    const target = names[translation.target];
    if (source === undefined || target === undefined) continue;
    if ((insiders.has(source) && outsiders.has(target)) || (outsiders.has(source) && insiders.has(target))) count += 1;
  }
  return count;
}

function boundaryCells(input: {
  readonly name: string;
  readonly ambiguous: number;
  readonly missingCrossings: number;
  readonly contested: number;
  readonly policing: number;
  readonly subalternExcluded: number;
}): readonly CoordinationCurrencyCellInput[] {
  return Object.freeze([
    Object.freeze({
      id: `boundary-work:${input.name}:classification-gap`,
      source: "boundary-work",
      spreadH1: input.ambiguous,
      noArbitrage: input.ambiguous === 0,
      coherentConsensus: input.ambiguous === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:translation-gap`,
      source: "boundary-work",
      spreadH1: input.missingCrossings,
      noArbitrage: input.missingCrossings === 0,
      coherentConsensus: input.missingCrossings === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:contested-boundary`,
      source: "boundary-work",
      spreadH1: input.contested,
      noArbitrage: input.contested === 0,
      coherentConsensus: input.contested === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:policing`,
      source: "boundary-work",
      spreadH1: input.policing,
      noArbitrage: input.policing === 0,
      coherentConsensus: input.policing === 0,
    }),
    Object.freeze({
      id: `boundary-work:${input.name}:subaltern-exclusion`,
      source: "boundary-work",
      spreadH1: input.subalternExcluded,
      noArbitrage: input.subalternExcluded === 0,
      coherentConsensus: input.subalternExcluded === 0,
    }),
  ]);
}

export function boundaryWork(input: BoundaryWorkInput): BoundaryWork {
  const name = input.name ?? "boundary";
  const criterion = input.criterion ?? "";
  const insiders = uniqueSorted(input.insiders);
  const outsiders = uniqueSorted(input.outsiders);
  const inside = new Set(insiders);
  const outside = new Set(outsiders);
  const relations = input.relations ?? Object.freeze([]);
  const agents = uniqueSorted([...fieldAgents(input.field), ...relationAgents(relations)]);
  const ambiguousAgents = Object.freeze(agents.filter((agent) => !inside.has(agent) && !outside.has(agent)));
  const names = fieldAgents(input.field);
  const crossBoundaryTranslations = crossTranslations(input.field, inside, outside, names);
  const possibleCrossings = input.field === undefined ? 0 : 2 * insiders.length * outsiders.length;
  const missingCrossBoundaryTranslations = Math.max(0, possibleCrossings - crossBoundaryTranslations);
  const boundaryRelations = relations.filter((relation) => crossesBoundary(relation, inside, outside));
  const contestedBoundaryRelations = boundaryRelations.filter((relation) => relation.standing === "stable").length;
  const policingRelations = boundaryRelations.filter((relation) =>
    policingKind(relation.kind) && (relation.standing === "potential" || relation.standing === "stable")).length;
  const subaltern = new Set(input.subalternAgents ?? []);
  const subalternExcluded = outsiders.filter((agent) => subaltern.has(agent)).length;
  const currency = coordinationCurrency(boundaryCells({
    name,
    ambiguous: ambiguousAgents.length,
    missingCrossings: missingCrossBoundaryTranslations,
    contested: contestedBoundaryRelations,
    policing: policingRelations,
    subalternExcluded,
  }));
  return Object.freeze({
    kind: "socializing.boundary-work" as const,
    name,
    criterion,
    insiders,
    outsiders,
    ambiguousAgents,
    crossBoundaryTranslations,
    missingCrossBoundaryTranslations,
    policingRelations,
    contestedBoundaryRelations,
    subalternExcluded,
    legible: ambiguousAgents.length === 0 && criterion !== "",
    porous: crossBoundaryTranslations > 0 && missingCrossBoundaryTranslations === 0,
    exclusionary: policingRelations > 0 || subalternExcluded > 0,
    currency,
    theory: THEORY,
  });
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`boundary-work: expected ${label} as string[]`);
  }
  return Object.freeze([...value]);
}

function admitBoundaryWorkInput(value: JsonValue): BoundaryWorkInput {
  if (!isRecord(value)) throw new TypeError("boundary-work: expected an object input");
  const input: {
    name?: string;
    field?: Field;
    relations?: readonly JuralRelation[];
    insiders: readonly string[];
    outsiders: readonly string[];
    criterion?: string;
    subalternAgents?: readonly string[];
  } = {
    insiders: stringArray(value.insiders, "insiders"),
    outsiders: stringArray(value.outsiders, "outsiders"),
  };
  if (typeof value.name === "string") input.name = value.name;
  if (isRecord(value.field) && Array.isArray(value.field.members)) input.field = value.field as unknown as Field;
  if (Array.isArray(value.relations)) input.relations = value.relations as unknown as readonly JuralRelation[];
  if (typeof value.criterion === "string") input.criterion = value.criterion;
  if (value.subalternAgents !== undefined) input.subalternAgents = stringArray(value.subalternAgents, "subalternAgents");
  return Object.freeze(input);
}

const BOUNDARY_WORK_SCHEMA: JsonRecord = Object.freeze({
  title: "BoundaryWork",
  type: "object",
  description:
    "Boundary legibility, porosity, policing, contested classification, and subaltern exclusion priced through coordination-currency.",
});

export const boundaryWorkAction: Action = action({
  verb: "boundary-work",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read boundary formation and price classification, crossing, policing, and exclusion costs.",
  description:
    "Composes social-field translations and Hohfeldian boundary relations. Ambiguous classification, missing crossings, contested boundary cells, policing relations, and subaltern exclusion emit h1-coordination-credit cells.",
  domainSchema: Object.freeze({ type: "object" }),
  codomainSchema: BOUNDARY_WORK_SCHEMA,
  run: (input: unknown): JsonValue =>
    jsonResource(boundaryWork(admitBoundaryWorkInput(jsonResource(input, "boundary-work input"))) as unknown as JsonValue, "boundary-work"),
});

export const boundaryWorkActions: readonly Action[] = Object.freeze([
  boundaryWorkAction,
]);
