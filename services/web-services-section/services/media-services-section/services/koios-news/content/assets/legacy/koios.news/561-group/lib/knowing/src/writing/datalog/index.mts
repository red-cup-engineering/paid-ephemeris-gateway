/**
 * writing/datalog — knowing's reflective query surface over EAVT witnesses.
 *
 * EAVT rows are the extensional relation. Rules do not author another store; they
 * settle derived query facts to the least fixed point over the existing witness
 * ledger rows.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";
import {
  canonical,
  eavtRecord,
  type EAVT,
  type EAVTRecord,
  type JsonValue,
} from "@emsenn/relating/writing";

export const EAVT_RELATION = "eavt";

const jsonTermSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "integer" },
    { type: "boolean" },
    { type: "null" },
    { type: "array" },
    { type: "object" },
  ],
} as const;

export const datalogVariableSchema = {
  $id: "knowing/writing/datalog/variable",
  title: "DatalogVariable",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.variable" },
    name: { type: "string", minLength: 1 },
  },
} as const;
export const datalogVariableCarrier = carrierFrom(datalogVariableSchema);
export type DatalogVariable = FromSchema<typeof datalogVariableSchema>;

const datalogTermSchema = {
  anyOf: [datalogVariableSchema, jsonTermSchema],
} as const;

export const datalogAtomSchema = {
  $id: "knowing/writing/datalog/atom",
  title: "DatalogAtom",
  type: "object",
  required: ["predicate", "terms"],
  additionalProperties: false,
  properties: {
    predicate: { type: "string", minLength: 1 },
    terms: { type: "array", items: datalogTermSchema },
  },
} as const;
export const datalogAtomCarrier = carrierFrom(datalogAtomSchema);
type DatalogAtomCarrier = FromSchema<typeof datalogAtomSchema>;
export type DatalogTerm = DatalogVariable | JsonValue;
export type DatalogAtom = Omit<DatalogAtomCarrier, "terms"> & {
  readonly terms: readonly DatalogTerm[];
};

export const datalogRuleSchema = {
  $id: "knowing/writing/datalog/rule",
  title: "DatalogRule",
  type: "object",
  required: ["head", "body"],
  additionalProperties: false,
  properties: {
    head: datalogAtomSchema,
    body: { type: "array", items: datalogAtomSchema },
  },
} as const;
export const datalogRuleCarrier = carrierFrom(datalogRuleSchema);
type DatalogRuleCarrier = FromSchema<typeof datalogRuleSchema>;
export type DatalogRule = Omit<DatalogRuleCarrier, "head" | "body"> & {
  readonly head: DatalogAtom;
  readonly body: readonly DatalogAtom[];
};

export const datalogQuerySchema = {
  $id: "knowing/writing/datalog/query",
  title: "DatalogQuery",
  type: "object",
  required: ["kind", "rules", "find"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.query" },
    rules: { type: "array", items: datalogRuleSchema },
    find: datalogAtomSchema,
  },
} as const;
export const datalogQueryCarrier = carrierFrom(datalogQuerySchema);
type DatalogQueryCarrier = FromSchema<typeof datalogQuerySchema>;
export type DatalogQuery = Omit<DatalogQueryCarrier, "rules" | "find"> & {
  readonly rules: readonly DatalogRule[];
  readonly find: DatalogAtom;
};

export const datalogRelationSchema = {
  $id: "knowing/writing/datalog/relation",
  title: "DatalogRelation",
  type: "object",
  required: ["predicate", "tuples"],
  additionalProperties: false,
  properties: {
    predicate: { type: "string", minLength: 1 },
    tuples: {
      type: "array",
      items: { type: "array", items: jsonTermSchema },
    },
  },
} as const;
export const datalogRelationCarrier = carrierFrom(datalogRelationSchema);
export type DatalogTuple = readonly JsonValue[];
export type DatalogRelation = Omit<FromSchema<typeof datalogRelationSchema>, "tuples"> & {
  readonly tuples: readonly DatalogTuple[];
};

export const datalogEvaluationSchema = {
  $id: "knowing/writing/datalog/evaluation",
  title: "DatalogEvaluation",
  type: "object",
  required: ["kind", "settled", "iterations", "relations", "answer"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.evaluation" },
    settled: { const: true },
    iterations: { type: "integer", minimum: 0 },
    relations: { type: "array", items: datalogRelationSchema },
    answer: datalogRelationSchema,
  },
} as const;
export const datalogEvaluationCarrier = carrierFrom(datalogEvaluationSchema);
type DatalogEvaluationCarrier = FromSchema<typeof datalogEvaluationSchema>;
export type DatalogEvaluation = Omit<DatalogEvaluationCarrier, "relations" | "answer"> & {
  readonly relations: readonly DatalogRelation[];
  readonly answer: DatalogRelation;
};

type FactSet = Map<string, DatalogTuple>;
type RelationSet = Map<string, FactSet>;
type Binding = ReadonlyMap<string, JsonValue>;

export function variable(name: string): DatalogVariable {
  return datalogVariableCarrier.assert({ kind: "knowing.datalog.variable", name });
}

export function isVariable(term: DatalogTerm): term is DatalogVariable {
  return typeof term === "object"
    && term !== null
    && !Array.isArray(term)
    && (term as { readonly kind?: unknown }).kind === "knowing.datalog.variable"
    && typeof (term as { readonly name?: unknown }).name === "string";
}

export function evaluateDatalog(rows: readonly (EAVT | EAVTRecord)[], query: DatalogQuery): DatalogEvaluation {
  datalogQueryCarrier.assert(query);
  validateRangeRestricted(query.rules);

  const relations = new Map<string, FactSet>();
  const delta = new Map<string, FactSet>();
  for (const row of rows.map(eavtRecord)) {
    addFact(relations, EAVT_RELATION, [row.e, row.a, row.v, row.t]);
    addFact(delta, EAVT_RELATION, [row.e, row.a, row.v, row.t]);
  }

  let iterations = 0;
  let frontier = delta;
  while (countFacts(frontier) > 0) {
    const next = new Map<string, FactSet>();
    for (const rule of query.rules) {
      deriveRule(rule, relations, frontier, next);
    }
    if (countFacts(next) === 0) break;
    iterations += 1;
    frontier = next;
  }

  const answer = relationOf(query.find.predicate, matchAtom(query.find, relations).map((binding) => tupleOf(query.find, binding)));
  const evaluation: DatalogEvaluation = Object.freeze({
    kind: "knowing.datalog.evaluation",
    settled: true,
    iterations,
    relations: relationList(relations),
    answer,
  });
  return datalogEvaluationCarrier.assert(evaluation) as DatalogEvaluation;
}

function deriveRule(rule: DatalogRule, relations: RelationSet, delta: RelationSet, next: RelationSet): void {
  if (rule.body.length === 0) {
    addDerived(rule, new Map(), relations, next);
    return;
  }

  for (let deltaIndex = 0; deltaIndex < rule.body.length; deltaIndex += 1) {
    const predicate = rule.body[deltaIndex]?.predicate;
    if (predicate === undefined || !(delta.get(predicate)?.size)) continue;
    for (const binding of matchBody(rule.body, relations, delta, deltaIndex)) {
      addDerived(rule, binding, relations, next);
    }
  }
}

function addDerived(rule: DatalogRule, binding: Binding, relations: RelationSet, next: RelationSet): void {
  const tuple = tupleOf(rule.head, binding);
  if (addFact(relations, rule.head.predicate, tuple)) addFact(next, rule.head.predicate, tuple);
}

function matchBody(body: readonly DatalogAtom[], relations: RelationSet, delta: RelationSet, deltaIndex: number): Binding[] {
  let bindings: Binding[] = [new Map()];
  for (const [index, atom] of body.entries()) {
    const relationMap = index === deltaIndex ? delta : relations;
    const facts = relationMap.get(atom.predicate) ?? new Map();
    const next: Binding[] = [];
    for (const binding of bindings) {
      for (const tuple of facts.values()) {
        const unified = unify(atom, tuple, binding);
        if (unified) next.push(unified);
      }
    }
    bindings = next;
    if (bindings.length === 0) break;
  }
  return bindings;
}

function matchAtom(atom: DatalogAtom, relations: RelationSet): Binding[] {
  const facts = relations.get(atom.predicate) ?? new Map();
  const bindings: Binding[] = [];
  for (const tuple of facts.values()) {
    const unified = unify(atom, tuple, new Map());
    if (unified) bindings.push(unified);
  }
  return bindings;
}

function unify(atom: DatalogAtom, tuple: DatalogTuple, binding: Binding): Binding | undefined {
  if (atom.terms.length !== tuple.length) return undefined;
  const next = new Map(binding);
  for (const [index, term] of atom.terms.entries()) {
    const value = tuple[index];
    if (value === undefined) return undefined;
    if (isVariable(term)) {
      const bound = next.get(term.name);
      if (bound === undefined) next.set(term.name, value);
      else if (canonical(bound) !== canonical(value)) return undefined;
    } else if (canonical(term) !== canonical(value)) {
      return undefined;
    }
  }
  return next;
}

function tupleOf(atom: DatalogAtom, binding: Binding): DatalogTuple {
  return Object.freeze(atom.terms.map((term) => {
    if (!isVariable(term)) return term;
    const value = binding.get(term.name);
    if (value === undefined) throw new TypeError(`datalog: unbound variable ${term.name} in ${atom.predicate}`);
    return value;
  }));
}

function addFact(relations: RelationSet, predicate: string, tuple: DatalogTuple): boolean {
  const facts = relations.get(predicate) ?? new Map<string, DatalogTuple>();
  const key = canonical(tuple as JsonValue);
  if (facts.has(key)) return false;
  facts.set(key, Object.freeze([...tuple]));
  relations.set(predicate, facts);
  return true;
}

function relationList(relations: RelationSet): DatalogRelation[] {
  return [...relations.entries()]
    .map(([predicate, facts]) => relationOf(predicate, [...facts.values()]))
    .sort((left, right) => left.predicate.localeCompare(right.predicate));
}

function relationOf(predicate: string, tuples: readonly DatalogTuple[]): DatalogRelation {
  return Object.freeze({
    predicate,
    tuples: Object.freeze([...tuples].sort(compareTuple).map((tuple) => Object.freeze([...tuple]))),
  });
}

function compareTuple(left: DatalogTuple, right: DatalogTuple): number {
  return canonical(left as JsonValue).localeCompare(canonical(right as JsonValue));
}

function countFacts(relations: RelationSet): number {
  let count = 0;
  for (const facts of relations.values()) count += facts.size;
  return count;
}

function validateRangeRestricted(rules: readonly DatalogRule[]): void {
  for (const rule of rules) {
    const bound = new Set<string>();
    for (const atom of rule.body) {
      for (const term of atom.terms) if (isVariable(term)) bound.add(term.name);
    }
    for (const term of rule.head.terms) {
      if (isVariable(term) && !bound.has(term.name)) {
        throw new TypeError(`datalog: head variable ${term.name} is not bound in the rule body`);
      }
    }
  }
}
