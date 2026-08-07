import {
  articulate,
  cell,
  predicateOfClaim,
  type ArticulationCell,
  type Cell,
  type Claim,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
  type Token,
  type UtteranceCarrier,
} from "@emsenn/relating";

export type Term = PredicationTerm;
export type Utterance = UtteranceCarrier;
export type TaskEvidenceCarrier =
  | Mark
  | Token
  | Claim
  | PredicationPredicate
  | PredicationTerm
  | Cell
  | UtteranceCarrier
  | ArticulationCell
  | Task;

export interface Task {
  readonly kind: "animating.task";
  readonly utterance: UtteranceCarrier;
  readonly articulation: ArticulationCell;
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object: PredicationTerm;
  readonly cell: Cell;
}

export function taskCell(taskCarrier: Task): Cell {
  return taskCarrier.cell;
}

export function task(input: {
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object?: PredicationTerm;
}): Task;
export function task(input: Cell): Task;
export function task(input: UtteranceCarrier): Task;
export function task(input: Cell | UtteranceCarrier | {
  readonly subject: PredicationTerm;
  readonly predicate: PredicationPredicate;
  readonly object?: PredicationTerm;
}): Task {
  if (isUtteranceCarrier(input)) {
    const subject = input.token;
    const predicate = predicateOfClaim(input.claim);
    return taskFromCell(input, cell(subject, predicate, subject));
  }
  if (isCellCarrier(input)) {
    return taskFromCell(undefined, input);
  }
  return taskFromCell(undefined, cell(input.subject, input.predicate, input.object ?? input.subject));
}

function taskFromCell(utteranceCarrier: UtteranceCarrier | undefined, taskCarrier: Cell): Task {
  const carrier = utteranceCarrier ?? Object.freeze({
    kind: "utterance.carrier" as const,
    token: taskCarrier.subject,
    claim: taskCarrier.predicate.claim,
  });
  return Object.freeze({
    kind: "animating.task" as const,
    utterance: carrier,
    articulation: articulate(carrier),
    subject: taskCarrier.subject,
    predicate: taskCarrier.predicate,
    object: taskCarrier.object,
    cell: taskCarrier,
  });
}

function isUtteranceCarrier(value: object): value is UtteranceCarrier {
  return "kind" in value && value.kind === "utterance.carrier";
}

function isCellCarrier(value: object): value is Cell {
  return "subject" in value && "predicate" in value && "object" in value;
}
