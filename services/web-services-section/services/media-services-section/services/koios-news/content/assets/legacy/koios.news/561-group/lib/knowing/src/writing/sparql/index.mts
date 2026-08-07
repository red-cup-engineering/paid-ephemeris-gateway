/**
 * writing/sparql — SPARQL/RDF as knowing's QUERY projection over RWIL.
 *
 * A Basic Graph Pattern is a conjunction of witnessed RDF-ish triples. RWIL
 * already stores those as EAVT witnesses, and knowing already evaluates
 * conjunction through Datalog. This module only maps the SPARQL query shapes
 * onto that evaluator; it does not introduce a parser or a second store.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";
import { readWitnessLog, type WitnessStore } from "@emsenn/relating/ledger";
import {
  canonical,
  eavtRecord,
  iriRef,
  turtleLiteral,
  type EAVT,
  type EAVTRecord,
  type JsonValue,
} from "@emsenn/relating/writing";

import {
  evaluateDatalog,
  variable as datalogVariable,
  type DatalogAtom,
  type DatalogEvaluation,
  type DatalogQuery,
  type DatalogTerm,
} from "../datalog/index.mjs";

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

const eavtRecordSchema = {
  type: "object",
  required: ["e", "a", "v", "t"],
  additionalProperties: false,
  properties: {
    e: jsonTermSchema,
    a: jsonTermSchema,
    v: jsonTermSchema,
    t: jsonTermSchema,
  },
} as const;

export const chronicleLedgerQuerySchema = {
  $id: "knowing/writing/sparql/chronicle-ledger-query",
  title: "ChronicleLedgerQuery",
  description:
    "A SPARQL BGP query over a hub chronicle ledger: the rows stay EAVT and the query lowers through knowing's Datalog evaluator.",
  type: "object",
  required: ["kind", "rows", "query"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.chronicle-ledger-query" },
    rows: { type: "array", items: eavtRecordSchema },
    query: { $ref: "knowing/writing/sparql/query" },
  },
} as const;
type ChronicleLedgerQueryCarrier = FromSchema<typeof chronicleLedgerQuerySchema>;
export type ChronicleLedgerQuery = Omit<ChronicleLedgerQueryCarrier, "rows" | "query"> & {
  readonly rows: readonly EAVTRecord[];
  readonly query: SparqlQuery;
};
export const chronicleLedgerQueryCarrier = carrierFrom(chronicleLedgerQuerySchema);

export const HUB_ASSIGNMENT_PREDICATE = "hub.assignment" as const;
export const HUB_SESSION_MASK_PREDICATE = "hub.session.mask" as const;

export const sparqlVariableSchema = {
  $id: "knowing/writing/sparql/variable",
  title: "SparqlVariable",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.variable" },
    name: { type: "string", minLength: 1 },
  },
} as const;
export const sparqlVariableCarrier = carrierFrom(sparqlVariableSchema);
export type SparqlVariable = FromSchema<typeof sparqlVariableSchema>;

const sparqlTermSchema = {
  anyOf: [sparqlVariableSchema, jsonTermSchema],
} as const;
export type SparqlTerm = SparqlVariable | JsonValue;

export const sparqlTriplePatternSchema = {
  $id: "knowing/writing/sparql/triple-pattern",
  title: "SparqlTriplePattern",
  type: "object",
  required: ["s", "p", "o"],
  additionalProperties: false,
  properties: {
    s: sparqlTermSchema,
    p: sparqlTermSchema,
    o: sparqlTermSchema,
  },
} as const;
export const sparqlTriplePatternCarrier = carrierFrom(sparqlTriplePatternSchema);
type SparqlTriplePatternCarrier = FromSchema<typeof sparqlTriplePatternSchema>;
export type SparqlTriplePattern = Omit<SparqlTriplePatternCarrier, "s" | "p" | "o"> & {
  readonly s: SparqlTerm;
  readonly p: SparqlTerm;
  readonly o: SparqlTerm;
};

export const sparqlQuerySchema = {
  $id: "knowing/writing/sparql/query",
  title: "SparqlQuery",
  type: "object",
  required: ["kind", "type", "where"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.query" },
    type: { enum: ["select", "ask", "construct"] },
    where: { type: "array", items: sparqlTriplePatternSchema },
    select: { type: "array", items: { type: "string", minLength: 1 } },
    construct: { type: "array", items: sparqlTriplePatternSchema },
  },
} as const;
export const sparqlQueryCarrier = carrierFrom(sparqlQuerySchema);
type SparqlQueryCarrier = FromSchema<typeof sparqlQuerySchema>;
export type SparqlQuery = Omit<SparqlQueryCarrier, "where" | "construct"> & {
  readonly where: readonly SparqlTriplePattern[];
  readonly construct?: readonly SparqlTriplePattern[];
};

const jsonObjectSchema = { type: "object" } as const;

export const sparqlResultSchema = {
  $id: "knowing/writing/sparql/result",
  title: "SparqlResult",
  type: "object",
  required: ["kind", "type", "variables", "bindings", "ask", "triples", "turtle", "datalog"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.result" },
    type: { enum: ["select", "ask", "construct"] },
    variables: { type: "array", items: { type: "string" } },
    bindings: { type: "array", items: jsonObjectSchema },
    ask: { type: "boolean" },
    triples: { type: "array", items: sparqlTriplePatternSchema },
    turtle: { type: "string" },
    datalog: { type: "object" },
  },
} as const;
export const sparqlResultCarrier = carrierFrom(sparqlResultSchema);
type SparqlResultCarrier = FromSchema<typeof sparqlResultSchema>;
export type SparqlBinding = Readonly<Record<string, JsonValue>>;
export type SparqlResult = Omit<SparqlResultCarrier, "bindings" | "triples"> & {
  readonly bindings: readonly SparqlBinding[];
  readonly triples: readonly RdfTriple[];
  readonly datalog: DatalogEvaluation;
};

export type RdfTriple = Readonly<{ readonly s: JsonValue; readonly p: JsonValue; readonly o: JsonValue }>;

const ANSWER = "__sparql_answer";

export function sparqlVariable(name: string): SparqlVariable {
  return sparqlVariableCarrier.assert({ kind: "knowing.sparql.variable", name });
}

export function isSparqlVariable(term: SparqlTerm): term is SparqlVariable {
  return typeof term === "object"
    && term !== null
    && !Array.isArray(term)
    && (term as { readonly kind?: unknown }).kind === "knowing.sparql.variable"
    && typeof (term as { readonly name?: unknown }).name === "string";
}

export function triplePattern(s: SparqlTerm, p: SparqlTerm, o: SparqlTerm): SparqlTriplePattern {
  return sparqlTriplePatternCarrier.assert({ s, p, o }) as SparqlTriplePattern;
}

export function evaluateSparql(rows: readonly (EAVT | EAVTRecord)[], query: SparqlQuery): SparqlResult {
  sparqlQueryCarrier.assert(query);
  const variables = variablesFor(query);
  const datalog = evaluateDatalog(rows, datalogQueryOf(query, variables));
  const bindings = bindingsOf(variables, datalog.answer.tuples);
  const triples = query.type === "construct" ? constructTriples(query.construct ?? query.where, bindings) : [];
  const result: SparqlResult = Object.freeze({
    kind: "knowing.sparql.result",
    type: query.type,
    variables: Object.freeze([...variables]),
    bindings,
    ask: bindings.length > 0,
    triples,
    turtle: triplesToTurtle(triples),
    datalog,
  });
  sparqlResultCarrier.assert(result);
  return result;
}

export function evaluateSparqlFromWitnessLog(
  store: WitnessStore,
  feed: string,
  query: SparqlQuery,
): SparqlResult {
  return evaluateSparql(readWitnessLog(store, feed), query);
}

/** Evaluate a carried hub chronicle query by reusing the SPARQL-to-Datalog projection. */
export function evaluateChronicleLedgerQuery(input: ChronicleLedgerQuery): SparqlResult {
  chronicleLedgerQueryCarrier.assert(input, "evaluateChronicleLedgerQuery input");
  return evaluateSparql(input.rows, input.query);
}

/** Query sessions currently witnessed as assigned to a package/path. */
export function sessionsAssignedToQuery(packagePath: string): SparqlQuery {
  return sparqlQueryCarrier.assert({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["session"]),
    where: Object.freeze([triplePattern(sparqlVariable("session"), HUB_ASSIGNMENT_PREDICATE, packagePath)]),
  }) as SparqlQuery;
}

/** Query masks published by one session actor. */
export function masksOfSessionQuery(session: string): SparqlQuery {
  return sparqlQueryCarrier.assert({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["mask"]),
    where: Object.freeze([triplePattern(session, HUB_SESSION_MASK_PREDICATE, sparqlVariable("mask"))]),
  }) as SparqlQuery;
}

function datalogQueryOf(query: SparqlQuery, variables: readonly string[]): DatalogQuery {
  const seen = new Map<string, ReturnType<typeof datalogVariable>>();
  const termOf = (term: SparqlTerm): DatalogTerm => {
    if (!isSparqlVariable(term)) return term;
    const existing = seen.get(term.name);
    if (existing !== undefined) return existing;
    const next = datalogVariable(term.name);
    seen.set(term.name, next);
    return next;
  };

  const body: DatalogAtom[] = query.where.map((pattern, index): DatalogAtom => Object.freeze({
    predicate: "eavt",
    terms: Object.freeze([
      termOf(pattern.s),
      termOf(pattern.p),
      termOf(pattern.o),
      datalogVariable(`__sparql_time_${index}`),
    ]),
  }));
  const find: DatalogAtom = Object.freeze({
    predicate: ANSWER,
    terms: Object.freeze(variables.map((name) => {
      const found = seen.get(name);
      if (found !== undefined) return found;
      const next = datalogVariable(name);
      seen.set(name, next);
      return next;
    })),
  });
  return Object.freeze({
    kind: "knowing.datalog.query",
    rules: Object.freeze([Object.freeze({ head: find, body })]),
    find,
  });
}

function variablesFor(query: SparqlQuery): readonly string[] {
  if (query.type === "select" && query.select !== undefined) return Object.freeze([...query.select]);
  if (query.type === "ask") return Object.freeze([]);
  const source = query.type === "construct" ? [...(query.construct ?? []), ...query.where] : query.where;
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (term: SparqlTerm): void => {
    if (!isSparqlVariable(term) || seen.has(term.name)) return;
    seen.add(term.name);
    names.push(term.name);
  };
  for (const pattern of source) {
    add(pattern.s);
    add(pattern.p);
    add(pattern.o);
  }
  return Object.freeze(names);
}

function bindingsOf(variables: readonly string[], tuples: readonly (readonly JsonValue[])[]): readonly SparqlBinding[] {
  return Object.freeze(tuples.map((tuple) => Object.freeze(Object.fromEntries(
    variables.map((name, index) => [name, tuple[index] ?? null]),
  ) as Record<string, JsonValue>)));
}

function constructTriples(
  template: readonly SparqlTriplePattern[],
  bindings: readonly SparqlBinding[],
): readonly RdfTriple[] {
  const triples = new Map<string, RdfTriple>();
  for (const binding of bindings) {
    for (const pattern of template) {
      const triple = instantiate(pattern, binding);
      const key = canonical(triple as unknown as JsonValue);
      triples.set(key, triple);
    }
  }
  return Object.freeze([...triples.values()].sort((left, right) =>
    canonical(left as unknown as JsonValue).localeCompare(canonical(right as unknown as JsonValue))));
}

function instantiate(pattern: SparqlTriplePattern, binding: SparqlBinding): RdfTriple {
  return Object.freeze({
    s: valueOf(pattern.s, binding),
    p: valueOf(pattern.p, binding),
    o: valueOf(pattern.o, binding),
  });
}

function valueOf(term: SparqlTerm, binding: SparqlBinding): JsonValue {
  if (!isSparqlVariable(term)) return term;
  const value = binding[term.name];
  if (value === undefined) throw new TypeError(`sparql: unbound variable ${term.name} in CONSTRUCT template`);
  return value;
}

export function triplesToTurtle(triples: readonly RdfTriple[]): string {
  if (triples.length === 0) return "";
  return `${triples.map((triple) =>
    `${subjectOrPredicate(triple.s)} ${subjectOrPredicate(triple.p)} ${objectTerm(triple.o)} .`).join("\n")}\n`;
}

function subjectOrPredicate(value: JsonValue): string {
  return iriRef(typeof value === "string" ? value : canonical(value));
}

function objectTerm(value: JsonValue): string {
  return typeof value === "string" && /^[a-z][a-z0-9+.-]*:/i.test(value) ? iriRef(value) : turtleLiteral(value);
}

export function triplesFromEavt(rows: readonly (EAVT | EAVTRecord)[]): readonly RdfTriple[] {
  return Object.freeze(rows.map((row) => {
    const record = eavtRecord(row);
    return Object.freeze({ s: record.e, p: record.a, o: record.v });
  }));
}
