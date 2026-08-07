/**
 * @emsenn/gaming — the root admission surface for concurrent game systems.
 *
 * Gaming is downstream of animating and upstream of computing in the spine:
 * relating -> animating -> gaming -> computing. It reads animating handedness as
 * Player/Opponent polarity over the relating charge substrate.
 *
 * The package root is deliberately small: it exposes the same callable shape as
 * shell/API/MCP edges, `(action, token, ?claim)`. Richer carriers, morphisms,
 * topology, traces, codecs, and operational tools live under the actual CGS
 * construction rooted at `@emsenn/gaming/structuring`.
 *
 * Root category map:
 *
 * - Package/category: gaming, the admission of a requested CGS operation.
 * - Domain object: `GamingRequest` = action + token + optional claim.
 * - Codomain object: `GamingAdmission` = admitted gate + bilattice charge +
 *   created running-game carrier, when admitted.
 * - Root morphism: `gaming` / `game`, preserving the carrier path
 *   `Arena -> GameComputer.create -> Game`; refusals are active charges with
 *   Mark evidence rather than independent DTO errors.
 * - Representation boundary: callers may pass plain ids and demo names at the
 *   root; the function immediately resolves them into CGS arena/game carriers
 *   and relating charge evidence.
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
import type { Arena } from "./structuring/index.mjs";
import { GameComputer, demoArena, type Game } from "./running/index.mjs";

/** A requested gaming operation. */
export type GamingAction = "create" | string;

/** The token presented at the package root boundary. */
export interface GamingToken {
  readonly id?: string;
  readonly arena?: Arena;
  readonly demo?: string;
  readonly computer?: GameComputer;
}

/** The optional claim constraining the admitted gaming operation. */
export interface GamingClaim {
  readonly id?: string;
  readonly demo?: string;
}

/** The root domain object admitted by `gaming`. */
export interface GamingRequest {
  readonly action: GamingAction;
  readonly token: GamingToken;
  readonly claim?: GamingClaim;
}

/** A charge-backed obstruction at the root admission boundary. */
export type GamingObstruction =
  | {
      readonly kind: "gaming.root.unsupported-action-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "gaming.root.missing-id-obstruction";
    }
  | {
      readonly kind: "gaming.root.missing-arena-obstruction";
    }
  | {
      readonly kind: "gaming.root.unknown-demo-obstruction";
      readonly demo: string;
    }
  | {
      readonly kind: "gaming.root.claim-mismatch-obstruction";
      readonly coordinate: "id" | "demo";
      readonly expected: string;
      readonly actual?: string;
    };

/** The root codomain object derived from CGS carriers and relating charges. */
export interface GamingAdmission {
  readonly action: GamingAction;
  readonly admitted: boolean;
  readonly status: ChargeValueName;
  readonly charge: ChargeCarrier;
  readonly computer?: GameComputer;
  readonly game?: Game;
  readonly obstruction?: GamingObstruction;
}

/**
 * Admit a gaming operation by a token against an optional claim.
 *
 * Domain: `GamingAction x GamingToken x GamingClaim?`.
 * Codomain: `GamingAdmission`.
 * Law: `admitted` iff the request can be reduced to a real `Arena` carrier and
 * then into `GameComputer.create`; every refusal is a negated witnessed
 * potential, so it descends through `Mark` into relating charge evidence.
 */
export function gaming(
  action: GamingAction,
  token: GamingToken,
  claim: GamingClaim = {},
): GamingAdmission {
  if (action !== "create") {
    return refused(action, { kind: "gaming.root.unsupported-action-obstruction", action });
  }

  if (claim.id !== undefined && claim.id !== token.id) {
    return refused(action, claimMismatch("id", claim.id, token.id));
  }

  if (claim.demo !== undefined && claim.demo !== token.demo) {
    return refused(action, claimMismatch("demo", claim.demo, token.demo));
  }

  if (token.id === undefined || token.id.length === 0) {
    return refused(action, { kind: "gaming.root.missing-id-obstruction" });
  }

  const resolution = arenaOf(token);
  if (resolution.obstruction !== undefined) return refused(action, resolution.obstruction);

  const computer = token.computer ?? new GameComputer();
  const created = computer.create(token.id, resolution.arena);
  const charge = witnessedPotential(mark({
    action,
    id: token.id,
    demo: token.demo,
    carrier: "game.computer.game",
  }));
  return Object.freeze({
    action,
    admitted: true,
    status: statusOf(charge),
    charge,
    computer: created.computer,
    game: created.game,
  } as const);
}

/** Alias matching the gaming reading of the same root morphism. */
export const game = gaming;

export * from "./structuring/index.mjs";
export * from "./encoding/index.mjs";
export * from "./running/index.mjs";

function arenaOf(token: GamingToken):
  | { readonly arena: Arena; readonly obstruction?: undefined }
  | { readonly arena?: undefined; readonly obstruction: GamingObstruction } {
  if (token.arena !== undefined) return { arena: token.arena };
  if (token.demo === undefined || token.demo.length === 0) {
    return { obstruction: { kind: "gaming.root.missing-arena-obstruction" } };
  }
  const demo = demoArena(token.demo);
  if (demo === undefined) {
    return { obstruction: { kind: "gaming.root.unknown-demo-obstruction", demo: token.demo } };
  }
  return { arena: demo.arena };
}

function refused(action: GamingAction, obstruction: GamingObstruction): GamingAdmission {
  const charge = negate(witnessedPotential(mark({ action, obstruction })));
  return Object.freeze({
    action,
    admitted: false,
    status: statusOf(charge),
    charge,
    obstruction,
  } as const);
}

function claimMismatch(
  coordinate: "id" | "demo",
  expected: string,
  actual: string | undefined,
): GamingObstruction {
  return actual === undefined
    ? Object.freeze({
        kind: "gaming.root.claim-mismatch-obstruction",
        coordinate,
        expected,
      } as const)
    : Object.freeze({
        kind: "gaming.root.claim-mismatch-obstruction",
        coordinate,
        expected,
        actual,
      } as const);
}

function statusOf(charge: ChargeCarrier): ChargeValueName {
  return chargeValueName(valueOf(charge));
}
