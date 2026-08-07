/**
 * observation — an observer's charged claim about a task.
 *
 * This is the shared currency of the animating cognition layers: an agent dreams new
 * observations through learning, a fleet pools them into consensus (the network
 * sheaf in animating/becoming/doing/working/governing/deciding/fleet/consensus), and a study settles them. It lives here, beside
 * `Task`, because every cognition layer above passes observations around and they
 * must be the *same* type — defining a near-identical observation per layer would
 * reintroduce conversion boundaries that do not carry new law.
 *
 * Structurally it carries a `charge`, so it interoperates with anything that reads
 * a charge (e.g. `sheafObservations`, which keys only on `.charge`).
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
