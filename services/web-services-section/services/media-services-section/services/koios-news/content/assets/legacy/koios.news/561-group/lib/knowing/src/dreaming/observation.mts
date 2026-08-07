/**
 * observation — an observer's charged claim about a task.
 *
 * The shared currency of knowing's dreaming: the knower dreams new observations by
 * recombining held ones (the three inward regimes) or by reaching outside the
 * settled fibers for genuinely new generators (the aperiodic regime). It carries a
 * `charge`, so it interoperates with anything that reads a charge (e.g. socializing's
 * `sheafObservations`, which keys only on `.charge`).
 */

import type { ChargeCarrier, PredicationTerm } from "@emsenn/relating";
import type { Task, TaskEvidenceCarrier } from "./task.mjs";

/** An observer's charged claim about a task, with optional provenance. */
export interface Observation {
  readonly observer: PredicationTerm;
  readonly task: Task;
  readonly charge: ChargeCarrier;
  /** When the observation was made, carried as relational evidence. */
  readonly at?: TaskEvidenceCarrier;
  /** Provenance: how this observation came to be, carried as relational evidence. */
  readonly note?: TaskEvidenceCarrier;
}

/** Build a frozen `Observation`, dropping absent optional fields. */
export function observation(input: {
  readonly observer: PredicationTerm;
  readonly task: Task;
  readonly charge: ChargeCarrier;
  readonly at?: TaskEvidenceCarrier;
  readonly note?: TaskEvidenceCarrier;
}): Observation {
  return Object.freeze({
    observer: input.observer,
    task: input.task,
    charge: input.charge,
    ...(input.at === undefined ? {} : { at: input.at }),
    ...(input.note === undefined ? {} : { note: input.note }),
  });
}
