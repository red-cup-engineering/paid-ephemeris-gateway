/**
 * @emsenn/computing — the root admission surface for operational CGS computing.
 *
 * The corpus's load-bearing theorem (`concurrent-game-system.md`): CGS, the
 * category of concurrent games with symmetry, IS the theory of computing. Where
 * `@emsenn/gaming` carries the CGS carriers, this package makes them operate.
 *
 * The package root is deliberately small: it exposes the same callable shape as
 * shell/API/MCP edges, `(action, token, ?claim)`. Richer objects and morphisms
 * live on explicit subpaths: `@emsenn/computing/categorifying`,
 * `/cartesianizing`, `/restricting`, `/operating`, and `/encoding`.
 *
 * Root category map:
 *
 * - Package/category: computing, the admission of an operational CGS step.
 * - Domain object: `ComputingRequest` = action + token + optional claim.
 * - Codomain object: `ComputingAdmission` = admitted gate + bilattice charge +
 *   observation or run judgment, when produced.
 * - Root morphism: `compute` / `computing`, preserving the operational path
 *   `settled labels -> observation arena` and `morphism + opponent move -> run`.
 * - Representation boundary: callers may pass finite labeled outcomes and move
 *   strings at the root; the function immediately resolves them into
 *   relational/gaming/computing carriers and relating charge evidence.
 *
 * The dependency flow it completes: relating -> animating -> gaming -> computing.
 */

import {
  chargeValueName,
  mark,
  negate,
  valueOf,
  witnessedPotential,
  type ChargeCarrier,
  type ChargeValueName,
} from "@emsenn/relating";
import type { Arena, EventPair } from "@emsenn/gaming";
import type { Morphism } from "./categorifying/index.mjs";
import {
  isAdmittedRun,
  observeLabels,
  observeArena,
  run,
  type LabeledSettledMemeInput,
  type Observation,
  type RunJudgment,
} from "./operating/index.mjs";

/** A requested computing operation. */
export type ComputingAction = "observe" | "run" | string;

/** The token presented at the package root boundary. */
export interface ComputingToken {
  readonly labels?: readonly LabeledSettledMemeInput[];
  readonly arena?: Arena;
  readonly causality?: readonly EventPair[];
  readonly conflict?: readonly EventPair[];
  readonly player?: Morphism;
  readonly history?: readonly string[];
  readonly opponentMove?: string;
}

/** The optional claim constraining the admitted computing operation. */
export interface ComputingClaim {
  readonly minimumEvents?: number;
  readonly admitted?: boolean;
}

/** The root domain object admitted by `compute`. */
export interface ComputingRequest {
  readonly action: ComputingAction;
  readonly token: ComputingToken;
  readonly claim?: ComputingClaim;
}

/** A charge-backed obstruction at the root admission boundary. */
export type ComputingObstruction =
  | {
      readonly kind: "computing.root.unsupported-action-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "computing.root.missing-labels-obstruction";
    }
  | {
      readonly kind: "computing.root.minimum-events-obstruction";
      readonly expected: number;
      readonly actual: number;
    }
  | {
      readonly kind: "computing.root.missing-player-obstruction";
    }
  | {
      readonly kind: "computing.root.missing-opponent-move-obstruction";
    }
  | {
      readonly kind: "computing.root.run-obstruction";
      readonly judgment: RunJudgment;
    };

/** The root codomain object derived from computing carriers and relating charges. */
export interface ComputingAdmission {
  readonly action: ComputingAction;
  readonly admitted: boolean;
  readonly status: ChargeValueName;
  readonly charge: ChargeCarrier;
  readonly observation?: Observation;
  readonly run?: RunJudgment;
  readonly obstruction?: ComputingObstruction;
}

/**
 * Admit an operational computing step by a token against an optional claim.
 *
 * Domain: `ComputingAction x ComputingToken x ComputingClaim?`.
 * Codomain: `ComputingAdmission`.
 * Law: `admitted` iff the request reduces to the package's existing carriers:
 * either a settled-label observation arena or an admitted run judgment.
 */
export function compute(
  action: ComputingAction,
  token: ComputingToken,
  claim: ComputingClaim = {},
): ComputingAdmission {
  switch (action) {
    case "observe":
      return admitObservation(action, token, claim);
    case "run":
      return admitRun(action, token, claim);
    default:
      return refused(action, { kind: "computing.root.unsupported-action-obstruction", action });
  }
}

/** Alias matching the package/category name. */
export const computing = compute;

function admitObservation(
  action: ComputingAction,
  token: ComputingToken,
  claim: ComputingClaim,
): ComputingAdmission {
  if (token.arena !== undefined) {
    const observation = observeArena(token.arena);
    const actual = observation.arena.structure.events.length;
    const expected = claim.minimumEvents ?? 0;
    if (actual < expected) {
      return refused(action, {
        kind: "computing.root.minimum-events-obstruction",
        expected,
        actual,
      });
    }
    return admitted(action, { carrier: "computing.computer.observation", events: actual }, { observation });
  }

  if (token.labels === undefined || token.labels.length === 0) {
    return refused(action, { kind: "computing.root.missing-labels-obstruction" });
  }
  const observation = observeLabels(token.labels, {
    ...(token.causality === undefined ? {} : { causality: token.causality }),
    ...(token.conflict === undefined ? {} : { conflict: token.conflict }),
  });
  const actual = observation.arena.structure.events.length;
  const expected = claim.minimumEvents ?? 0;
  if (actual < expected) {
    return refused(action, {
      kind: "computing.root.minimum-events-obstruction",
      expected,
      actual,
    });
  }
  return admitted(action, { carrier: "computing.computer.observation", events: actual }, { observation });
}

function admitRun(
  action: ComputingAction,
  token: ComputingToken,
  claim: ComputingClaim,
): ComputingAdmission {
  if (token.player === undefined) {
    return refused(action, { kind: "computing.root.missing-player-obstruction" });
  }
  if (token.opponentMove === undefined || token.opponentMove.length === 0) {
    return refused(action, { kind: "computing.root.missing-opponent-move-obstruction" });
  }
  const judgment = run(token.player, token.history ?? [], token.opponentMove);
  const admittedRun = isAdmittedRun(judgment);
  if (!admittedRun) {
    return refused(action, { kind: "computing.root.run-obstruction", judgment });
  }
  if (claim.admitted === false) {
    return refused(action, { kind: "computing.root.run-obstruction", judgment });
  }
  return admitted(action, { carrier: "computing.computer.run:witness", opponentMove: token.opponentMove }, { run: judgment });
}

function admitted(
  action: ComputingAction,
  witness: unknown,
  fields: Pick<ComputingAdmission, "observation" | "run">,
): ComputingAdmission {
  const charge = witnessedPotential(mark({ action, witness }));
  return Object.freeze({
    action,
    admitted: true,
    status: statusOf(charge),
    charge,
    ...fields,
  } as const);
}

function refused(action: ComputingAction, obstruction: ComputingObstruction): ComputingAdmission {
  const charge = negate(witnessedPotential(mark({ action, obstruction })));
  return Object.freeze({
    action,
    admitted: false,
    status: statusOf(charge),
    charge,
    obstruction,
  } as const);
}

function statusOf(charge: ChargeCarrier): ChargeValueName {
  return chargeValueName(valueOf(charge));
}
