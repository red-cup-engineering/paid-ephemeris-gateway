import {
  parseCommunication,
  type CommunicatingCarrier,
  type CompiledBundle,
  type ParseResult,
} from "@emsenn/communicating";
import {
  charge,
  chargeValue,
  claim,
  mark,
  predicateOfClaim,
  token,
  type ChargeCarrier,
  type ChargeValueName,
  type PredicationPredicate,
  type PredicationTerm,
} from "@emsenn/relating";
import { observation, type Observation } from "./observation.mjs";
import { task, type Task, type TaskEvidenceCarrier } from "./task.mjs";

type CommunicationPredicateLabel = "word-connected" | "arc-status" | "answer-status";
type CommunicationStatusLabel = ParseResult["words"][number]["connected"] | ParseResult["arcs"][number]["status"];
type CommunicationReading =
  | ParseResult["words"][number]
  | ParseResult["arcs"][number]
  | ParseResult["answers"][number];

export interface CommunicationObservationCarrier {
  readonly kind: "animating.doing.communication.observations";
  readonly source: CommunicatingCarrier;
  readonly parse: ParseResult;
  readonly observations: readonly Observation[];
}

export function communicationObservations(
  source: CommunicatingCarrier,
  bundle: CompiledBundle,
): CommunicationObservationCarrier {
  const parsed = parseCommunication(source, bundle);
  return observationsOfCommunication(source, parsed);
}

export function observationsOfCommunication(
  source: CommunicatingCarrier,
  parsed: ParseResult,
): CommunicationObservationCarrier {
  const sourceNote = source.articulation;
  const observations = Object.freeze([
    ...parsed.words.map((word) => wordObservation(word, sourceNote)),
    ...parsed.arcs.map((arc) => arcObservation(arc, sourceNote)),
    ...parsed.answers.map((answer) => answerObservation(answer, sourceNote)),
  ]);
  return Object.freeze({
    kind: "animating.doing.communication.observations" as const,
    source,
    parse: parsed,
    observations,
  });
}

function wordObservation(word: ParseResult["words"][number], note: TaskEvidenceCarrier): Observation {
  return observation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask(
      readingTerm(word),
      COMMUNICATION_PREDICATES.wordConnected,
      statusTerm(word.connected),
    ),
    charge: communicationCharge(word.connected === "decided" ? "potential" : word.connected === "ambiguous" ? "stable" : "absurd", word),
    note,
  });
}

function arcObservation(arc: ParseResult["arcs"][number], note: TaskEvidenceCarrier): Observation {
  return observation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask(
      readingTerm(arc),
      COMMUNICATION_PREDICATES.arcStatus,
      statusTerm(arc.status),
    ),
    charge: communicationCharge(arc.value, arc),
    note,
  });
}

function answerObservation(answer: ParseResult["answers"][number], note: TaskEvidenceCarrier): Observation {
  return observation({
    observer: COMMUNICATION_OBSERVER,
    task: communicationTask(
      readingTerm(answer),
      COMMUNICATION_PREDICATES.answerStatus,
      statusTerm(answer.status),
    ),
    charge: communicationCharge(answer.value, answer),
    note,
  });
}

function communicationTask(
  subject: PredicationTerm,
  predicate: PredicationPredicate,
  object: PredicationTerm,
): Task {
  return task({ subject, predicate, object });
}

const COMMUNICATION_OBSERVER = token(mark(Object.freeze(["animating", "doing", "communication", "observer"] as const)));

const COMMUNICATION_PREDICATES = Object.freeze({
  wordConnected: communicationPredicate("word-connected"),
  arcStatus: communicationPredicate("arc-status"),
  answerStatus: communicationPredicate("answer-status"),
});

const COMMUNICATION_STATUS_TERMS = Object.freeze({
  decided: token(mark(Object.freeze(["animating", "doing", "communication", "status", "decided"] as const))),
  ambiguous: token(mark(Object.freeze(["animating", "doing", "communication", "status", "ambiguous"] as const))),
  void: token(mark(Object.freeze(["animating", "doing", "communication", "status", "void"] as const))),
});

function communicationPredicate(label: CommunicationPredicateLabel): PredicationPredicate {
  return predicateOfClaim(claim(mark(Object.freeze(["animating", "doing", "communication", "predicate", label] as const))));
}

function readingTerm(reading: CommunicationReading): PredicationTerm {
  return token(mark(reading));
}

function statusTerm(status: CommunicationStatusLabel): PredicationTerm {
  return COMMUNICATION_STATUS_TERMS[status];
}

function communicationCharge(value: ChargeValueName, witness: CommunicationReading): ChargeCarrier {
  const witnessMark = mark(witness);
  const evidence = value === "potential"
    ? [[witnessMark], []] as const
    : value === "active"
      ? [[], [witnessMark]] as const
      : value === "stable"
        ? [[witnessMark], [witnessMark]] as const
        : [[], []] as const;
  return charge(chargeValue(value), evidence);
}
