import { charge as makeCharge, chargeValue, isChargeValueName, mark, token, type ChargeCarrier, type ChargeValueName, type PredicationTerm } from "@emsenn/relating";
import {
  canonical,
  type JsonValue,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json";
import {
  parseLines,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl";
import {
  eavtOrder,
  serialize,
  toEavt,
  type EAVT,
} from "@emsenn/relating/codecs/path/object/attribute/file/flatfile/serialization/json/jsonl/eavt";
import { fiber, fiberCoordinate, type Fiber, type FiberCoordinate } from "./becoming/doing/algebra/index.mjs";
import {
  admitTool,
  assignment,
  chargeStatus,
  governOperation,
  mode,
  office,
  readyWork,
  type Assignment,
} from "./becoming/doing/working/governing/algebra/index.mjs";
import { sheafCharges } from "./becoming/doing/working/governing/deciding/fleet/consensus/index.mjs";

export type ScriptAction = "scripts.admit" | "scripts.govern" | "scripts.dispatch" | "scripts.consensus";
/** A complete package-bin boundary document: EAVT JSONL. */
export type BoundaryDocument = string;
export type ScriptMorphism = (tokenDocument: BoundaryDocument) => BoundaryDocument;
export type ScriptMorphismRegistry = { readonly [action in ScriptAction]: ScriptMorphism };

export const scriptActions: readonly ScriptAction[] = Object.freeze([
  "scripts.admit",
  "scripts.govern",
  "scripts.dispatch",
  "scripts.consensus",
]);

export const scriptMorphisms = Object.freeze({
  "scripts.admit": (tokenDocument) => transformDocument(tokenDocument, "scripts.admit", admitFacts),
  "scripts.govern": (tokenDocument) => transformDocument(tokenDocument, "scripts.govern", governFacts),
  "scripts.dispatch": (tokenDocument) => transformDocument(tokenDocument, "scripts.dispatch", dispatchFacts),
  "scripts.consensus": (tokenDocument) => transformDocument(tokenDocument, "scripts.consensus", consensusFacts),
} satisfies ScriptMorphismRegistry);

function isScriptAction(action: string): action is ScriptAction {
  return Object.prototype.hasOwnProperty.call(scriptMorphisms, action);
}

export function evalAnimation(action: ScriptAction, tokenDocument: BoundaryDocument): BoundaryDocument {
  if (!isScriptAction(action)) throw new TypeError(`animating: unsupported script action ${JSON.stringify(action)}`);
  return scriptMorphisms[action](tokenDocument);
}

function transformDocument(
  tokenDocument: BoundaryDocument,
  action: ScriptAction,
  transform: (document: FactDocument) => readonly EAVT[],
): BoundaryDocument {
  const document = factDocument(readEavtDocument(tokenDocument));
  return writeEavtDocument([...document.eavts, ...transform(document)], action);
}

function readEavtDocument(text: BoundaryDocument): readonly EAVT[] {
  const trimmed = text.trim();
  if (trimmed === "") return [];
  return parseLines(trimmed).map(toEavt);
}

function writeEavtDocument(eavts: readonly EAVT[], action: ScriptAction): BoundaryDocument {
  const unique = new Map<string, EAVT>();
  for (const eavt of eavts) unique.set(canonical(eavt), eavt);
  return serialize([...unique.values()].sort(eavtOrder));
}

interface FactDocument {
  readonly eavts: readonly EAVT[];
  readonly subjects: readonly SubjectFacts[];
}

interface SubjectFacts {
  readonly subject: JsonValue;
  readonly facts: ReadonlyMap<string, readonly JsonValue[]>;
}

function factDocument(eavts: readonly EAVT[]): FactDocument {
  const bySubject = new Map<string, { subject: JsonValue; facts: Map<string, JsonValue[]> }>();
  for (const [subject, attribute, value] of eavts) {
    if (typeof attribute !== "string") continue;
    const key = canonical(subject);
    const bucket = bySubject.get(key) ?? { subject, facts: new Map<string, JsonValue[]>() };
    const values = bucket.facts.get(attribute) ?? [];
    values.push(value);
    bucket.facts.set(attribute, values);
    bySubject.set(key, bucket);
  }
  return Object.freeze({
    eavts,
    subjects: Object.freeze([...bySubject.values()].map((entry) => Object.freeze({
      subject: entry.subject,
      facts: entry.facts,
    }))),
  });
}

function subjectsFor(document: FactDocument, action: ScriptAction): readonly SubjectFacts[] {
  return document.subjects.filter((entry) => strings(entry, "animating.script.action").includes(action));
}

function firstString(entry: SubjectFacts, predicate: string): string | undefined {
  return strings(entry, predicate)[0];
}

function strings(entry: SubjectFacts, predicate: string): readonly string[] {
  return (entry.facts.get(predicate) ?? []).filter((value): value is string => typeof value === "string");
}

function scriptTime(action: ScriptAction): JsonValue {
  return ["animating", "script", action];
}

function fact(subject: JsonValue, predicate: string, value: JsonValue, action: ScriptAction): EAVT {
  return [subject, predicate, value, scriptTime(action)];
}

function obstruction(subject: JsonValue, action: ScriptAction, reason: string): readonly EAVT[] {
  return [fact(subject, "animating.script.obstruction", reason, action)];
}

function admitFacts(document: FactDocument): readonly EAVT[] {
  const vocabulary = fiberVocabulary();
  const terms = termVocabulary();
  return subjectsFor(document, "scripts.admit").flatMap((entry) => {
    const tool = firstString(entry, "animating.tool");
    if (tool === undefined) return obstruction(entry.subject, "scripts.admit", "missing-tool");
    const decision = admitTool({
      tool: termFromLabel(tool, terms),
      requires: fiberFromLabels(strings(entry, "animating.requires-authority"), vocabulary),
      authorities: fiberFromLabels(strings(entry, "animating.authority"), vocabulary),
    });
    return [
      fact(entry.subject, "animating.result.admitted", decision.admitted, "scripts.admit"),
      fact(entry.subject, "animating.result.charge", chargeStatus(decision.charge), "scripts.admit"),
      fact(entry.subject, "animating.result.delta", decision.readiness.delta, "scripts.admit"),
      fact(entry.subject, "animating.result.gap", decision.readiness.gap, "scripts.admit"),
    ];
  });
}

function governFacts(document: FactDocument): readonly EAVT[] {
  const vocabulary = fiberVocabulary();
  const terms = termVocabulary();
  return subjectsFor(document, "scripts.govern").flatMap((entry) => {
    const agent = firstString(entry, "animating.agent");
    const operation = firstString(entry, "animating.operation");
    if (agent === undefined) return obstruction(entry.subject, "scripts.govern", "missing-agent");
    if (operation === undefined) return obstruction(entry.subject, "scripts.govern", "missing-operation");
    const officeId = firstString(entry, "animating.office");
    const agentTerm = termFromLabel(agent, terms);
    const operationTerm = termFromLabel(operation, terms);
    const decision = governOperation({
      agent: agentTerm,
      operation: operationTerm,
      mode: mode(termFromLabel("scripts", terms), [
        {
          operation: operationTerm,
          requirement: {
          capabilities: fiberFromLabels(strings(entry, "animating.requires-capability"), vocabulary),
          authorities: fiberFromLabels(strings(entry, "animating.requires-authority"), vocabulary),
          },
        },
      ]),
      capabilities: fiberFromLabels(strings(entry, "animating.capability"), vocabulary),
      ...(officeId === undefined
        ? {}
        : { office: office(termFromLabel(officeId, terms), { authorities: fiberFromLabels(strings(entry, "animating.office-authority"), vocabulary) }) }),
    });
    return [
      fact(entry.subject, "animating.result.eligible", decision.eligible, "scripts.govern"),
      fact(entry.subject, "animating.result.charge", chargeStatus(decision.charge), "scripts.govern"),
      fact(entry.subject, "animating.result.delta", decision.readiness.delta, "scripts.govern"),
      fact(entry.subject, "animating.result.gap", decision.readiness.gap, "scripts.govern"),
      fact(entry.subject, "animating.result.contested", decision.readiness.contested, "scripts.govern"),
    ];
  });
}

function dispatchFacts(document: FactDocument): readonly EAVT[] {
  const vocabulary = fiberVocabulary();
  const terms = termVocabulary();
  return subjectsFor(document, "scripts.dispatch").flatMap((entry) => {
    const officeId = firstString(entry, "animating.office");
    if (officeId === undefined) return obstruction(entry.subject, "scripts.dispatch", "missing-office");
    const assignmentSubjects = entry.facts.get("animating.assignment") ?? [];
    const assignments = assignmentSubjects.flatMap((subject): readonly Assignment[] => {
      const assignmentEntry = subjectFacts(document, subject);
      if (assignmentEntry === undefined) return [];
      const id = jsonString(subject);
      const toOffice = firstString(assignmentEntry, "animating.to-office");
      if (id === undefined || toOffice === undefined) return [];
      const status = assignmentStatus(firstString(assignmentEntry, "animating.status"));
      return [assignment({
        term: termFromLabel(id, terms),
        toOffice: termFromLabel(toOffice, terms),
        requirements: {
          capabilities: fiberFromLabels(strings(assignmentEntry, "animating.requires-capability"), vocabulary),
          authorities: fiberFromLabels(strings(assignmentEntry, "animating.requires-authority"), vocabulary),
        },
        ...(status === undefined ? {} : { status }),
      })];
    });
    const ranked = readyWork(
      assignments,
      office(termFromLabel(officeId, terms), { authorities: fiberFromLabels(strings(entry, "animating.office-authority"), vocabulary) }),
      fiberFromLabels(strings(entry, "animating.capability"), vocabulary),
    );
    return ranked.flatMap((rankedEntry) => [
      fact(termJson(rankedEntry.assignment.term), "animating.result.ready", rankedEntry.readiness.ready, "scripts.dispatch"),
      fact(termJson(rankedEntry.assignment.term), "animating.result.delta", rankedEntry.readiness.delta, "scripts.dispatch"),
      fact(termJson(rankedEntry.assignment.term), "animating.result.gap", rankedEntry.readiness.gap, "scripts.dispatch"),
    ]);
  });
}

function fiberVocabulary(): Map<string, FiberCoordinate> {
  return new Map();
}

function termVocabulary(): Map<string, PredicationTerm> {
  return new Map();
}

function fiberFromLabels(labels: readonly string[], vocabulary: Map<string, FiberCoordinate>): Fiber {
  return fiber(labels.map((label) => coordinateForLabel(label, vocabulary)));
}

function coordinateForLabel(label: string, vocabulary: Map<string, FiberCoordinate>): FiberCoordinate {
  const prior = vocabulary.get(label);
  if (prior !== undefined) return prior;
  const coordinate = fiberCoordinate(token(mark(Object.freeze(["animating", "package-bin", "fiber-coordinate", label] as const))));
  vocabulary.set(label, coordinate);
  return coordinate;
}

function termFromLabel(label: string, vocabulary: Map<string, PredicationTerm>): PredicationTerm {
  const prior = vocabulary.get(label);
  if (prior !== undefined) return prior;
  const term = token(mark(Object.freeze(["animating", "package-bin", "term", label] as const)));
  vocabulary.set(label, term);
  return term;
}

function termJson(term: PredicationTerm): JsonValue {
  return term.mark.value as JsonValue;
}

function consensusFacts(document: FactDocument): readonly EAVT[] {
  return subjectsFor(document, "scripts.consensus").flatMap((entry) => {
    const names = strings(entry, "animating.observer-charge");
    if (names.length === 0) return obstruction(entry.subject, "scripts.consensus", "missing-observer-charge");
    const invalid = names.find((name) => !isChargeValueName(name));
    if (invalid !== undefined) return obstruction(entry.subject, "scripts.consensus", `invalid-charge:${invalid}`);
    const charges = names.map((name) => makeCharge(chargeValue(name as ChargeValueName)));
    const result = sheafCharges(charges);
    const globalFacts = [
      fact(entry.subject, "animating.result.confident", result.confident, "scripts.consensus"),
      fact(entry.subject, "animating.result.coordination-free", result.coordinationFree, "scripts.consensus"),
      fact(entry.subject, "animating.result.obstruction", result.obstruction, "scripts.consensus"),
    ];
    const componentFacts = result.componentConsensus.flatMap((component, index) => {
      const componentSubject = [entry.subject, "component", index] satisfies JsonValue;
      return [
        fact(entry.subject, "animating.result.component", componentSubject, "scripts.consensus"),
        fact(componentSubject, "animating.result.members", [...component.members], "scripts.consensus"),
        fact(componentSubject, "animating.result.pooled", chargeStatus(component.pooled), "scripts.consensus"),
        fact(componentSubject, "animating.result.common", chargeStatus(component.common), "scripts.consensus"),
      ];
    });
    return [...globalFacts, ...componentFacts];
  });
}

function subjectFacts(document: FactDocument, subject: JsonValue): SubjectFacts | undefined {
  const key = canonical(subject);
  return document.subjects.find((entry) => canonical(entry.subject) === key);
}

function jsonString(value: JsonValue): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function assignmentStatus(value: string | undefined): ChargeCarrier | undefined {
  if (value === undefined) return undefined;
  if (value === "open") return makeCharge(chargeValue("potential"), [[mark(Object.freeze(["animating", "package-bin", "assignment-status", "open"] as const))], []]);
  if (value === "claimed" || value === "complete") return makeCharge(chargeValue("active"), [[], [mark(Object.freeze(["animating", "package-bin", "assignment-status", value] as const))]]);
  return undefined;
}
