import {
  cell,
  cellSet,
  charge,
  chargeValue,
  claim,
  mark,
  negate,
  predicateOfClaim,
  token,
  utterance,
  witnessedPotential,
  type Cell,
  type CellSet,
  type ChargeCarrier,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
  type UtteranceCarrier,
} from "@emsenn/relating";
import type { SkillResult as AnimatingSkillResult } from "@emsenn/animating";

export type OrganizingCarrierTerm = null | boolean | number | string | readonly OrganizingCarrierTerm[];
export type FiberCoordinate = Readonly<{ term: PredicationTerm }>;
export type Fiber = Readonly<{ entries: readonly Readonly<{ coordinate: FiberCoordinate }>[] }>;
export type WorkId = PredicationTerm;
export type OfficeName = PredicationTerm;
export type CapabilityName = PredicationTerm;
export type DutyName = PredicationTerm;
export type WorkTerm = PredicationTerm;
export type WorkStatus = ChargeCarrier;
export type WorkEvidenceBearing = Readonly<{
  term: PredicationTerm;
  evidence?: readonly WorkEvidenceCarrier[];
}>;
export type TaskClosure = Readonly<{
  goalCells: readonly Readonly<{ cell: string; determinedAtDispatch: boolean }>[];
  rules: readonly Readonly<{ name: string; branching: boolean }>[];
}>;
export type WorkType = "task" | "procedure" | "process" | "project";

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
  readonly kind: "organizing.work.fact";
  readonly utterance: UtteranceCarrier;
  readonly cell: Cell;
}

export interface WorkAgent {
  readonly kind: "organizing.work.agent";
  readonly term: PredicationTerm;
  readonly capabilities?: readonly CapabilityName[];
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkTask {
  readonly kind: "organizing.work.task";
  readonly term: PredicationTerm;
  readonly goals: CellSet;
  readonly initial?: CellSet;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkItem {
  readonly kind: "organizing.work.item";
  readonly term: WorkId;
  readonly task: WorkTask;
  readonly office?: OfficeName;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkAssignment {
  readonly kind: "organizing.work.assignment";
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
  readonly kind: "organizing.work.project";
  readonly term: PredicationTerm;
  readonly work: readonly WorkItem[];
  readonly offices: readonly OfficeName[];
  readonly assignments: readonly WorkAssignment[];
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export interface WorkReport {
  readonly kind: "organizing.work.report";
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly charge: ChargeCarrier;
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
  readonly carrier: UtteranceCarrier;
  readonly facts: CellSet;
}

export const WORK_PREDICATES: Readonly<Record<WorkPredicateLabel, PredicationPredicate>> = Object.freeze({
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

export function workTerm(value: OrganizingCarrierTerm): PredicationTerm {
  return token(mark(value));
}

export const term = workTerm;

export function workPredicateTerm(value: OrganizingCarrierTerm): PredicationPredicate {
  return predicateOfClaim(claim(mark(value)));
}

export const predicate = workPredicateTerm;

export function officeTerm(value: string): PredicationTerm {
  return workTerm(["office", value]);
}

export function fiberCoordinate(value: PredicationTerm): FiberCoordinate {
  return Object.freeze({ term: value });
}

export function fiber(coordinates: readonly FiberCoordinate[]): Fiber {
  return Object.freeze({
    entries: Object.freeze(coordinates.map((coordinate) => Object.freeze({ coordinate }))),
  });
}

export function fiberOf(values: readonly string[], axis: "capability" | "authority" = "capability"): Fiber {
  return fiber(values.map((value) => fiberCoordinate(workTerm([axis, value]))));
}

export function workAgent(input: {
  readonly term: PredicationTerm;
  readonly capabilities?: readonly CapabilityName[];
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkAgent {
  const capabilities = input.capabilities === undefined ? undefined : Object.freeze([...input.capabilities]);
  const facts = [
    workFact(input.term, WORK_PREDICATES.agent, input.term),
    ...((capabilities ?? []).map((capability) => workFact(input.term, WORK_PREDICATES.capability, capability))),
    ...((input.evidence ?? []).flatMap((evidence) => evidenceFact(input.term, evidence))),
  ];
  return Object.freeze({
    kind: "organizing.work.agent" as const,
    term: input.term,
    ...(capabilities === undefined ? {} : { capabilities }),
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
    kind: "organizing.work.task" as const,
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
    kind: "organizing.work.item" as const,
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
    kind: "organizing.work.assignment" as const,
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
    kind: "organizing.work.project" as const,
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
    kind: "organizing.work.report" as const,
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

/** Where a single-agent skillful-work outcome lands in the social-scale ledger: a Success is
 *  `complete`; a ⊤-contradiction error is `blocked` (actionable — it wants a plan item); a
 *  ⊥-absence error is `noted` (an outcome, not a defect — "looked, found nothing"). The routing
 *  reads the SkillResult's CHARGE, which is the same bilattice value organizing's
 *  `workChargeStatus` already uses (complete→potential, blocked→⊤ stable, proposed→⊥ absurd) —
 *  so no translation table is needed between the agent kernel and the work ledger. */
export type SkillResultRouting = "complete" | "blocked" | "noted";

export function skillResultRouting(result: AnimatingSkillResult): SkillResultRouting {
  if (result.ok) return "complete";
  return result.charge === "stable" ? "blocked" : "noted";
}

/** Route an animating `SkillResult` (one agent's invocation outcome) into an organizing
 *  `WorkReport` (the social-scale work ledger entry). The result's bilattice CHARGE carries
 *  through unchanged — success and error are the classical / non-classical regions of one FOUR,
 *  shared across the two scales. A failure threads its error class and message as report
 *  evidence so the improvement loop downstream can triage it (⊤ `blocked` → a plan item;
 *  ⊥ `noted` → recorded outcome). The actual judgment is animating's; organizing only ledgers it. */
export function reportSkillResult(input: {
  readonly term: PredicationTerm;
  readonly work: WorkItem;
  readonly office: OfficeName;
  readonly result: AnimatingSkillResult;
  readonly at?: WorkEvidenceCarrier;
  readonly evidence?: readonly WorkEvidenceCarrier[];
}): WorkReport {
  const routing = skillResultRouting(input.result);
  const outcomeEvidence: WorkEvidenceCarrier[] = [workTerm(["status", routing])];
  if (!input.result.ok && input.result.error !== undefined) {
    outcomeEvidence.push(workTerm(["error-class", input.result.error.errorClass]));
    outcomeEvidence.push(workTerm(["error", input.result.error.message]));
    if (input.result.error.recoveryHint !== undefined) {
      outcomeEvidence.push(workTerm(["recovery-hint", input.result.error.recoveryHint]));
    }
  }
  return workReport({
    term: input.term,
    work: input.work,
    office: input.office,
    charge: charge(chargeValue(input.result.charge)),
    ...(input.at === undefined ? {} : { at: input.at }),
    evidence: [...outcomeEvidence, ...(input.evidence ?? [])],
  });
}

export function deriveWorkType(closure: TaskClosure): WorkType {
  if (closure.rules.some((rule) => rule.branching)) return "process";
  if (closure.goalCells.some((entry) => !entry.determinedAtDispatch)) return "project";
  return "task";
}

export function termKey(value: PredicationTerm): string {
  return JSON.stringify(value.mark.value);
}

export function uniqueTerms(values: readonly PredicationTerm[]): readonly PredicationTerm[] {
  const seen = new Set<string>();
  const out: PredicationTerm[] = [];
  for (const value of values) {
    const key = termKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return Object.freeze(out);
}

export function termValue(value: PredicationTerm): unknown {
  return value.mark.value;
}

export function officeName(value: PredicationTerm | undefined, fallback = "operations-manifold"): string {
  if (value === undefined) return fallback;
  const raw = termValue(value);
  return Array.isArray(raw) && raw[0] === "office" && typeof raw[1] === "string" ? raw[1] : termKey(value);
}

export function workEvidenceValue(item: WorkEvidenceBearing, key: string): unknown {
  for (const evidence of item.evidence ?? []) {
    if (!isTerm(evidence)) continue;
    const raw = evidence.mark.value;
    if (!Array.isArray(raw) || raw[0] !== key) continue;
    return raw.length === 2 ? raw[1] : raw.slice(1);
  }
  return undefined;
}

export function workTitle(item: WorkEvidenceBearing): string {
  const value = workEvidenceValue(item, "title");
  return typeof value === "string" && value.trim() !== "" ? value : termKey(item.term);
}

export function workStatusName(item: WorkEvidenceBearing): string {
  const value = workEvidenceValue(item, "status");
  return typeof value === "string" && value.trim() !== "" ? value : "active";
}

export function workPriority(item: WorkEvidenceBearing): number {
  const value = workEvidenceValue(item, "priority");
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function workPrompt(item: WorkEvidenceBearing): string {
  const value = workEvidenceValue(item, "prompt") ?? workEvidenceValue(item, "summary") ?? workEvidenceValue(item, "intent");
  return typeof value === "string" ? value : "";
}

export function workChargeStatus(item: WorkEvidenceBearing): WorkStatus {
  const status = workStatusName(item);
  if (status === "complete") return witnessedStatus("potential");
  if (status === "blocked") return witnessedStatus("stable");
  if (status === "proposed") return witnessedStatus("absurd");
  return witnessedStatus("active");
}

function witnessedStatus(value: "absurd" | "potential" | "active" | "stable"): WorkStatus {
  return value === "potential"
    ? witnessedPotential(mark(["organizing", "work", "status", value]))
    : value === "active"
      ? negate(witnessedPotential(mark(["organizing", "work", "status", value])))
      : charge(chargeValue(value));
}

function workCarrier(subject: PredicationTerm, predicate: PredicationPredicate): UtteranceCarrier {
  return utterance(subject.mark, predicate.mark);
}

function workFact(subject: PredicationTerm, predicate: PredicationPredicate, object: PredicationTerm): WorkFactCarrier {
  return Object.freeze({
    kind: "organizing.work.fact" as const,
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
  return predicateOfClaim(claim(mark(Object.freeze(["organizing", "work", label] as const))));
}

function isWorkFact(value: WorkEvidenceCarrier): value is WorkFactCarrier {
  return typeof value === "object" && value !== null && "kind" in value && value.kind === "organizing.work.fact";
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
    case "organizing.work.agent":
    case "organizing.work.task":
    case "organizing.work.item":
    case "organizing.work.assignment":
    case "organizing.work.project":
    case "organizing.work.report":
      return true;
    default:
      return false;
  }
}
