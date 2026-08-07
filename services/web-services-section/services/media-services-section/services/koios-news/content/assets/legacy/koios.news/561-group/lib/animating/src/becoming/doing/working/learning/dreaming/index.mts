/**
 * dreaming — learning-tier observation generation under the inward regimes.
 *
 * Dreaming reads settled doing observations generatively. These three regimes are
 * deterministic, network-free learning acts: finite composition, Scott evidence
 * consolidation, and transfinite co-predication. The aperiodic LLM/enactor
 * boundary is downstream in `@emsenn/computing-with-llm-agents/dreaming`.
 */

import {
  bottom,
  claim,
  cellIdentity,
  joinKnowledge,
  mark,
  meetKnowledge,
  predicateOfClaim,
  predicationTermIdentity,
  token,
  type ChargeCarrier,
  type Cell,
  type Mark,
  type PredicationPredicate,
  type PredicationTerm,
} from "@emsenn/relating";
import {
  observation as makeObservation,
  task as makeTask,
  type Observation,
} from "../../../algebra/index.mjs";

export type DreamRegime = "strict-finite" | "scott-continuous" | "transfinite" | "aperiodic";

export interface DreamResult {
  readonly regime: DreamRegime;
  readonly observations: readonly Observation[];
  readonly charge: ChargeCarrier;
}

export interface DreamOptions {
  readonly at?: Mark;
  readonly observer?: PredicationTerm;
  readonly limit?: number;
}

type DreamMarkLabel =
  | "animating"
  | "dream"
  | "observer"
  | DreamRegime
  | "strict-finite-composition"
  | "strict-finite-dream"
  | "scott-continuous-dream"
  | "co-predicate"
  | "transfinite-dream";

type DreamMarkPart =
  | DreamMarkLabel
  | PredicationTerm
  | PredicationPredicate
  | Cell;

/** strict-finite: compose observations where one's object is the next's subject. */
export function strictFiniteDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "strict-finite"]);
  const at = options.at ?? dreamMark(["strict-finite"]);
  const limit = options.limit ?? 50;
  const out: Observation[] = [];
  for (const left of observations) {
    for (const right of observations) {
      if (out.length >= limit) break;
      if (!sameTerm(left.task.object, right.task.subject)) continue;
      out.push(makeObservation({
        observer,
        task: makeTask({
          subject: left.task.subject,
          predicate: dreamPredicate(["strict-finite-composition", left.task.predicate, right.task.predicate]),
          object: right.task.object,
        }),
        charge: meetKnowledge(left.charge, right.charge),
        at,
        note: dreamMark(["strict-finite-dream", left.task.cell, right.task.cell]),
      }));
    }
    if (out.length >= limit) break;
  }
  return dreamResult("strict-finite", out);
}

/** scott-continuous: consolidate repeated cells by knowledge-join. */
export function scottContinuousDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "scott-continuous"]);
  const at = options.at ?? dreamMark(["scott-continuous"]);
  const limit = options.limit ?? 50;
  const grouped: { cell: Cell; observations: Observation[] }[] = [];
  for (const obs of observations) {
    const group = grouped.find((candidate) => sameCell(candidate.cell, obs.task.cell));
    if (group) group.observations.push(obs);
    else grouped.push({ cell: obs.task.cell, observations: [obs] });
  }
  const out: Observation[] = [];
  for (const group of grouped) {
    if (out.length >= limit) break;
    if (group.observations.length < 2) continue;
    const [first, ...rest] = group.observations;
    out.push(makeObservation({
      observer,
      task: first!.task,
      charge: rest.reduce((left, obs) => joinKnowledge(left, obs.charge), first!.charge),
      at,
      note: dreamMark(["scott-continuous-dream", group.cell]),
    }));
  }
  return dreamResult("scott-continuous", out);
}

/** transfinite: co-predicate every pair sharing a subject. */
export function transfiniteDream(observations: readonly Observation[], options: DreamOptions = {}): DreamResult {
  const observer = options.observer ?? dreamTerm(["observer", "transfinite"]);
  const at = options.at ?? dreamMark(["transfinite"]);
  const limit = options.limit ?? 50;
  const bySubject: { subject: PredicationTerm; observations: Observation[] }[] = [];
  for (const obs of observations) {
    const group = bySubject.find((candidate) => sameTerm(candidate.subject, obs.task.subject));
    if (group) group.observations.push(obs);
    else bySubject.push({ subject: obs.task.subject, observations: [obs] });
  }
  const out: Observation[] = [];
  for (const group of bySubject) {
    const members = group.observations;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (out.length >= limit) break;
        const left = members[i]!;
        const right = members[j]!;
        out.push(makeObservation({
          observer,
          task: makeTask({
            subject: group.subject,
            predicate: dreamPredicate(["co-predicate", left.task.predicate, right.task.predicate]),
          }),
          charge: meetKnowledge(left.charge, right.charge),
          at,
          note: dreamMark(["transfinite-dream", left.task.cell, right.task.cell]),
        }));
      }
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  return dreamResult("transfinite", out);
}

/** Dispatch the synchronous inward regimes over a single observation set. */
export function dreaming(
  input: { readonly observations?: readonly Observation[]; readonly regime?: Exclude<DreamRegime, "aperiodic"> } = {},
  options: DreamOptions = {},
): DreamResult {
  const regime = input.regime ?? "strict-finite";
  const observations = input.observations ?? [];
  if (regime === "scott-continuous") return scottContinuousDream(observations, options);
  if (regime === "transfinite") return transfiniteDream(observations, options);
  return strictFiniteDream(observations, options);
}

export function dreamResult(regime: DreamRegime, observations: readonly Observation[]): DreamResult {
  return Object.freeze({
    regime,
    observations: Object.freeze([...observations]),
    charge: observations.reduce<ChargeCarrier>((left, obs) => joinKnowledge(left, obs.charge), bottom),
  });
}

function sameTerm(left: PredicationTerm, right: PredicationTerm): boolean {
  return predicationTermIdentity(left, right).kind === "predication.termIdentity:witness";
}

function sameCell(left: Cell, right: Cell): boolean {
  return cellIdentity(left, right).kind === "predication.cellIdentity:witness";
}

function dreamTerm(parts: readonly DreamMarkPart[]): PredicationTerm {
  return token(dreamMark(parts));
}

function dreamPredicate(parts: readonly DreamMarkPart[]): PredicationPredicate {
  return predicateOfClaim(claim(dreamMark(parts)));
}

function dreamMark(parts: readonly DreamMarkPart[]): Mark {
  return mark(Object.freeze(["animating", "dream", ...parts] as const));
}
