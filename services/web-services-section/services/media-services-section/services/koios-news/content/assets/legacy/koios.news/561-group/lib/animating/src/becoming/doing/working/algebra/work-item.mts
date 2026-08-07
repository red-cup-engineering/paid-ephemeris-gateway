import {
  cell,
  cellSet,
  claim,
  mark,
  predicateOfClaim,
  token,
  utterance,
  type Cell,
  type CellSet,
  type ChargeCarrier,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
  type UtteranceCarrier,
} from "@emsenn/relating";
import type { Fiber, FiberCoordinate } from "../../algebra/index.mjs";

export type WorkId = PredicationTerm;
export type OfficeName = PredicationTerm;
export type CapabilityName = FiberCoordinate;
export type DutyName = PredicationTerm;
export type WorkTerm = PredicationTerm;
export type WorkStatus = ChargeCarrier;
type WorkPredicateLabel =
  | "agent"
  | "task"
  | "work"
  | "office"
  | "duty"
  | "capability"
  | "assignment"
  | "assignee"
  | "report"
  | "goal"
  | "initial"
  | "evidence";

export type WorkEvidenceCarrier =
  | Mark
  | PredicationTerm
  | PredicationPredicate
  | UtteranceCarrier
  | Cell
  | CellSet
  | WorkFactCarrier
  | WorkAgent
  | WorkTask
  | WorkItem
  | WorkAssignment
  | WorkProject
  | WorkReport;

export interface WorkFactCarrier {
  readonly kind: "animating.work.fact";
  readonly utterance: UtteranceCarrier;
  readonly cell: Cell;
}

export interface WorkAgent {
  readonly kind: "animating.work.agent";
  readonly term: PredicationTerm;
  readonly capabilities?: Fiber;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkTask {
  readonly kind: "animating.work.task";
  readonly term: PredicationTerm;
  readonly goals: CellSet;
  readonly initial?: CellSet;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkItem {
  readonly kind: "animating.work.item";
  readonly term: WorkId;
  readonly task: WorkTask;
  readonly office?: OfficeName;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkAssignment {
  readonly kind: "animating.work.assignment";
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly assignee?: WorkAgent;
  readonly duties: readonly DutyName[];
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkProject {
  readonly kind: "animating.work.project";
  readonly term: PredicationTerm;
  readonly work: readonly WorkItem[];
  readonly offices: readonly OfficeName[];
  readonly assignments: readonly WorkAssignment[];
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkReport {
  readonly kind: "animating.work.report";
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly charge: ChargeCarrier;
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export const WORK_PREDICATES = Object.freeze({
  agent: workPredicate("agent"),
  task: workPredicate("task"),
  work: workPredicate("work"),
  office: workPredicate("office"),
  duty: workPredicate("duty"),
  capability: workPredicate("capability"),
  assignment: workPredicate("assignment"),
  assignee: workPredicate("assignee"),
  report: workPredicate("report"),
  goal: workPredicate("goal"),
  initial: workPredicate("initial"),
  evidence: workPredicate("evidence"),
});

export function workSubject(term: PredicationTerm): WorkId {
  return term;
}

export function workAgent(input: {
  readonly term: PredicationTerm;
  readonly capabilities?: Fiber;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkAgent {
  const facts = [
    workFact(input.term, WORK_PREDICATES.agent, input.term),
    ...((input.capabilities?.entries ?? []).map((entry) => workFact(input.term, WORK_PREDICATES.capability, entry.coordinate.term))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.agent" as const,
    term: input.term,
    ...(input.capabilities === undefined ? {} : { capabilities: input.capabilities }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.agent),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workTask(input: {
  readonly term: PredicationTerm;
  readonly goals: readonly Cell[] | CellSet;
  readonly initial?: readonly Cell[] | CellSet;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkTask {
  const goals = cellsOf(input.goals);
  const initial = input.initial === undefined ? undefined : cellsOf(input.initial);
  const facts = [
    workFact(input.term, WORK_PREDICATES.task, input.term),
    ...goals.cells.map((goal) => workFact(input.term, WORK_PREDICATES.goal, token(mark(goal)))),
    ...((initial?.cells ?? []).map((initialCell) => workFact(input.term, WORK_PREDICATES.initial, token(mark(initialCell))))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.task" as const,
    term: input.term,
    goals,
    ...(initial === undefined ? {} : { initial }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.task),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workItem(input: {
  readonly term: WorkId;
  readonly task: WorkTask;
  readonly office?: OfficeName;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkItem {
  const facts = [
    workFact(input.term, WORK_PREDICATES.work, input.task.term),
    ...(input.office === undefined ? [] : [workFact(input.term, WORK_PREDICATES.office, input.office)]),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.item" as const,
    term: input.term,
    task: input.task,
    ...(input.office === undefined ? {} : { office: input.office }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.work),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function assignWork(input: {
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly assignee?: WorkAgent;
  readonly duties?: readonly DutyName[];
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkAssignment {
  const duties = Object.freeze([...(input.duties ?? [])]);
  const facts = [
    workFact(input.term, WORK_PREDICATES.work, input.work.term),
    workFact(input.term, WORK_PREDICATES.office, input.office),
    ...duties.map((duty) => workFact(input.term, WORK_PREDICATES.duty, duty)),
    ...(input.assignee === undefined ? [] : [workFact(input.term, WORK_PREDICATES.assignee, input.assignee.term)]),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.assignment" as const,
    term: input.term,
    work: input.work,
    office: input.office,
    ...(input.assignee === undefined ? {} : { assignee: input.assignee }),
    duties,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.assignment),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workProject(input: {
  readonly term: PredicationTerm;
  readonly work: readonly WorkItem[];
  readonly offices?: readonly OfficeName[];
  readonly assignments?: readonly WorkAssignment[];
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkProject {
  const offices = Object.freeze([...(input.offices ?? [])]);
  const assignments = Object.freeze([...(input.assignments ?? [])]);
  const facts = [
    ...input.work.map((item) => workFact(input.term, WORK_PREDICATES.work, item.term)),
    ...offices.map((office) => workFact(input.term, WORK_PREDICATES.office, office)),
    ...assignments.map((assignment) => workFact(input.term, WORK_PREDICATES.assignment, assignment.term)),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.project" as const,
    term: input.term,
    work: Object.freeze([...input.work]),
    offices,
    assignments,
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.work),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

export function workReport(input: {
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly charge: ChargeCarrier;
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkReport {
  const facts = [
    workFact(input.term, WORK_PREDICATES.report, input.work.term),
    workFact(input.term, WORK_PREDICATES.office, input.office),
    workFact(input.term, WORK_PREDICATES.work, token(mark(input.charge))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "animating.work.report" as const,
    term: input.term,
    work: input.work,
    office: input.office,
    charge: input.charge,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.evidence === undefined ? {} : { evidence: Object.freeze([...input.evidence]) }),
    carrier: workCarrier(input.term, WORK_PREDICATES.report),
    facts: cellSet(facts.map((fact) => fact.cell)),
  });
}

function workCarrier(subject: PredicationTerm, predicate: PredicationPredicate): UtteranceCarrier {
  return utterance(subject.mark, predicate.mark);
}

function workFact(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): WorkFactCarrier {
  return Object.freeze({
    kind: "animating.work.fact" as const,
    utterance: workCarrier(subject, predicate),
    cell: cell(subject, predicate, object),
  });
}

function evidenceFact(subject: PredicationTerm, evidence: WorkEvidenceCarrier): readonly WorkFactCarrier[] {
  if (isWorkFact(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, token(mark(evidence.cell)))];
  if (isTerm(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence)];
  if (isCell(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, token(mark(evidence)))];
  if (isCellSet(evidence)) return evidence.cells.map((entry) => workFact(subject, WORK_PREDICATES.evidence, token(mark(entry))));
  if (isUtterance(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.token)];
  if (isWorkCarrier(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, evidence.term)];
  if (isPredicate(evidence)) return [workFact(subject, WORK_PREDICATES.evidence, token(evidence.mark))];
  return [workFact(subject, WORK_PREDICATES.evidence, token(evidence))];
}

function cellsOf(input: readonly Cell[] | CellSet): CellSet {
  return isCellSetInput(input) ? input : cellSet([...input]);
}

function workPredicate(label: WorkPredicateLabel): PredicationPredicate {
  return predicateOfClaim(claim(mark(Object.freeze(["animating", "work", label] as const))));
}

function isWorkFact(value: WorkEvidenceCarrier): value is WorkFactCarrier {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "animating.work.fact";
}

function isTerm(value: WorkEvidenceCarrier): value is PredicationTerm {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.token";
}

function isCell(value: WorkEvidenceCarrier): value is Cell {
  return typeof value === "object" && value !== null && "subject" in value && "predicate" in value && "object" in value;
}

function isCellSet(value: WorkEvidenceCarrier): value is CellSet {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.cellSet";
}

function isCellSetInput(value: readonly Cell[] | CellSet): value is CellSet {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.cellSet";
}

function isUtterance(value: WorkEvidenceCarrier): value is UtteranceCarrier {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "utterance.carrier";
}

function isPredicate(value: WorkEvidenceCarrier): value is PredicationPredicate {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "predication.predicate";
}

function isWorkCarrier(value: WorkEvidenceCarrier): value is WorkAgent | WorkTask | WorkItem | WorkAssignment | WorkProject | WorkReport {
  if (typeof value !== "object" || value === null || !("kind" in value) || !("term" in value)) return false;
  switch (value.kind) {
    case "animating.work.agent":
    case "animating.work.task":
    case "animating.work.item":
    case "animating.work.assignment":
    case "animating.work.project":
    case "animating.work.report":
      return true;
    default:
      return false;
  }
}
