/**
 * handedness — an embodied agent's asymmetric coordinates as Player/Opponent
 * duality.
 *
 * The predicated-drone-swarm sub-theory characterizes an embodied participant
 * by the four-tuple `h(p) = (recv, send, actuate, observe)`.  The corpus claim
 * *embodied-handedness-is-player-opponent-duality* identifies this four-tuple
 * with Player/Opponent duality `(-)^⊥` in CGS (the theory of computing): a
 * morphism `A → B` is a strategy on `A^⊥ ∥ B`, playing Opponent-style on its
 * input and Player-style on its output.  The coordinates partition by side:
 *
 *   - `recv`, `observe` — Opponent-side: the agent takes input from the
 *     environment (the environment is Player on `A`).
 *   - `send`, `actuate` — Player-side: the agent commits output to the
 *     environment (the environment is Opponent on `B`).
 *
 * Each coordinate carries a *capacity* charge — `absurd` = ⊥ (the agent lacks
 * it), `potential` = t (provided), `active` = f (denied), `stable` = ⊤ (held
 * contradiction).  The dualizing operation `(-)^⊥` swaps the input and output
 * roles: recv↔send, observe↔actuate.  A *symmetric peer* is exactly a fixed
 * point of this dual — `recv = send` and `observe = actuate` — which the corpus
 * names the special case; embodied participants are generically asymmetric, and
 * each asymmetric axis contributes one generator to the frame-disagreement
 * cohomology `H^1_{χ∼}`.  Asymmetry is recorded, not refused.
 *
 * The categorical home of these coordinates — Player/Opponent polarity in a
 * concurrent game system — is realized in `@emsenn/gaming` (`polarity`,
 * `dual`); we keep the animating-side reading self-contained here on relating charge
 * so the animating substrate stays foundational.
 */

import type { ChargeValueName } from "@emsenn/relating";

/**
 * The name of one handedness coordinate of an embodied agent: `recv` and
 * `observe` (opponent/input side), `send` and `actuate` (player/output side).
 */
export type HandednessCoordinateName = "recv" | "send" | "actuate" | "observe";
/**
 * Which side of the Player/Opponent duality `(-)^⊥` a coordinate sits on:
 * `"opponent"` for the input side, `"player"` for the output side.
 */
export type HandednessSide = "opponent" | "player";

/** The canonical Player/Opponent side of each coordinate, per the embodied-handedness claim. */
const COORDINATE_SIDE: Readonly<Record<HandednessCoordinateName, HandednessSide>> = Object.freeze({
  recv: "opponent",
  observe: "opponent",
  send: "player",
  actuate: "player",
});

/** The dual coordinate name under the agent-side reading of `(-)^⊥`. */
const DUAL_COORDINATE: Readonly<Record<HandednessCoordinateName, HandednessCoordinateName>> = Object.freeze({
  recv: "send",
  send: "recv",
  observe: "actuate",
  actuate: "observe",
});

/**
 * One handedness coordinate carrier. The name is the projection used as an
 * object key; side and dual record the finite relation the name descends from.
 */
export interface HandednessCoordinate {
  readonly kind: "animating.agent.handedness.coordinate";
  readonly name: HandednessCoordinateName;
  readonly side: HandednessSide;
  readonly dual: HandednessCoordinateName;
}

export type HandednessCoordinateInput = HandednessCoordinateName | HandednessCoordinate;

/**
 * The four handedness coordinate names as a frozen tuple: `recv`, `send`, `actuate`,
 * `observe`.
 */
export const handednessCoordinateNames = (): readonly HandednessCoordinateName[] =>
  Object.freeze(["recv", "send", "actuate", "observe"] as const);

/** Build the carrier for a named handedness coordinate. */
export function handednessCoordinate(name: HandednessCoordinateName): HandednessCoordinate {
  return Object.freeze({
    kind: "animating.agent.handedness.coordinate" as const,
    name,
    side: COORDINATE_SIDE[name],
    dual: DUAL_COORDINATE[name],
  });
}

/** The finite carrier family of handedness coordinates. */
export const handednessCoordinates = (): readonly HandednessCoordinate[] =>
  Object.freeze(handednessCoordinateNames().map(handednessCoordinate));

export function isHandednessCoordinate(value: unknown): value is HandednessCoordinate {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<HandednessCoordinate>;
  return candidate.kind === "animating.agent.handedness.coordinate"
    && isHandednessCoordinateName(candidate.name)
    && candidate.side === COORDINATE_SIDE[candidate.name]
    && candidate.dual === DUAL_COORDINATE[candidate.name];
}

export function isHandednessCoordinateName(value: unknown): value is HandednessCoordinateName {
  return value === "recv" || value === "send" || value === "actuate" || value === "observe";
}

export function handednessCoordinateName(input: HandednessCoordinateInput): HandednessCoordinateName {
  return typeof input === "string" ? input : input.name;
}

/** Which side of `(-)^⊥` a coordinate sits on: input (opponent) or output (player). */
export const coordinateSide = (coordinate: HandednessCoordinateInput): HandednessSide =>
  COORDINATE_SIDE[handednessCoordinateName(coordinate)];

/** The dual coordinate under `(-)^⊥`: recv↔send, observe↔actuate. */
export const dualCoordinate = (coordinate: HandednessCoordinateInput): HandednessCoordinate =>
  handednessCoordinate(DUAL_COORDINATE[handednessCoordinateName(coordinate)]);

/**
 * An agent's handedness: the capacity charge it carries at each of the four
 * coordinates.  This is the agent's individual face on the same bilattice
 * charge the rest of the package uses.
 */
export interface Handedness {
  readonly kind: "animating.agent.handedness";
  readonly recv: ChargeValueName;
  readonly send: ChargeValueName;
  readonly actuate: ChargeValueName;
  readonly observe: ChargeValueName;
}

/**
 * Optional per-coordinate capacity charges for building a handedness; any
 * omitted coordinate defaults to `absurd`.
 */
export interface HandednessInput {
  readonly recv?: ChargeValueName;
  readonly send?: ChargeValueName;
  readonly actuate?: ChargeValueName;
  readonly observe?: ChargeValueName;
}

/**
 * Build a handedness from explicit per-coordinate capacity charges; any omitted
 * coordinate defaults to `absurd` (⊥, the agent lacks it).  Pass capacities to
 * describe an asymmetric embodied participant (e.g. a drone that can `observe`
 * but not `actuate`).
 */
export function handedness(input: HandednessInput = {}): Handedness {
  return Object.freeze({
    kind: "animating.agent.handedness" as const,
    recv: input.recv ?? "absurd",
    send: input.send ?? "absurd",
    actuate: input.actuate ?? "absurd",
    observe: input.observe ?? "absurd",
  });
}

/** The symmetric-peer handedness: every coordinate provided (`potential`), a fixed point of the dual. */
export const peerHandedness = (): Handedness =>
  handedness({ recv: "potential", send: "potential", actuate: "potential", observe: "potential" });

/** A handedness from a set of coordinates the agent provides; the rest are `absurd`. */
export function handednessFrom(present: readonly HandednessCoordinateInput[]): Handedness {
  const has = new Set(present.map(handednessCoordinateName));
  const at = (c: HandednessCoordinateName): ChargeValueName => (has.has(c) ? "potential" : "absurd");
  return handedness({ recv: at("recv"), send: at("send"), actuate: at("actuate"), observe: at("observe") });
}

/** The capacity charge a handedness carries at a given coordinate. */
export const chargeAt = (h: Handedness, coordinate: HandednessCoordinateInput): ChargeValueName =>
  h[handednessCoordinateName(coordinate)];

/**
 * The dual `(-)^⊥` of a handedness: swaps the Opponent input side with the
 * Player output side — recv↔send, observe↔actuate — the agent-side reading of
 * the CGS dualizing operation.  A symmetric peer is a fixed point of this dual.
 */
export function dualHandedness(h: Handedness): Handedness {
  return Object.freeze({
    kind: "animating.agent.handedness" as const,
    recv: chargeAt(h, dualCoordinate("recv")),
    send: chargeAt(h, dualCoordinate("send")),
    actuate: chargeAt(h, dualCoordinate("actuate")),
    observe: chargeAt(h, dualCoordinate("observe")),
  });
}

/**
 * Evidence that a handedness is a symmetric peer - a fixed point of the dual
 * where `recv = send` and `observe = actuate` - carrying the witnessed
 * handedness.
 */
export interface SymmetricPeerWitness {
  readonly kind: "animating.agent.handedness.symmetricPeer:witness";
  readonly handedness: Handedness;
}

/**
 * Evidence that a handedness fails to be a symmetric peer: carries the
 * handedness and the coordinate axes (`recv/send`, `observe/actuate`) whose two
 * sides disagree.
 */
export interface SymmetricPeerObstruction {
  readonly kind: "animating.agent.handedness.symmetricPeer-obstruction";
  readonly handedness: Handedness;
  /** The coordinate axes whose two sides disagree — the source of asymmetry. */
  readonly asymmetricAxes: readonly ("recv/send" | "observe/actuate")[];
}

/**
 * The result of judging symmetric-peerhood: either a `SymmetricPeerWitness` or
 * a `SymmetricPeerObstruction`.
 */
export type SymmetricPeerJudgment = SymmetricPeerWitness | SymmetricPeerObstruction;

/**
 * Judge whether a handedness is a *symmetric peer* — a fixed point of the dual,
 * i.e. `recv = send` and `observe = actuate`.  Embodied participants are
 * generically asymmetric; the obstruction records which axes break symmetry.
 */
export function symmetricPeerJudgment(h: Handedness): SymmetricPeerJudgment {
  const axes: ("recv/send" | "observe/actuate")[] = [];
  if (h.recv !== h.send) axes.push("recv/send");
  if (h.observe !== h.actuate) axes.push("observe/actuate");
  return axes.length === 0
    ? Object.freeze({ kind: "animating.agent.handedness.symmetricPeer:witness" as const, handedness: h })
    : Object.freeze({ kind: "animating.agent.handedness.symmetricPeer-obstruction" as const, handedness: h, asymmetricAxes: Object.freeze(axes) });
}

/**
 * Whether a handedness is a symmetric peer: true when `symmetricPeerJudgment`
 * yields a witness.
 */
export const isSymmetricPeer = (h: Handedness): boolean =>
  symmetricPeerJudgment(h).kind === "animating.agent.handedness.symmetricPeer:witness";

/**
 * Type guard for `Handedness`: true when the value is an object tagged
 * `"animating.agent.handedness"` with string charges at all four coordinates.
 */
export function isHandedness(value: unknown): value is Handedness {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Handedness>;
  return c.kind === "animating.agent.handedness"
    && typeof c.recv === "string"
    && typeof c.send === "string"
    && typeof c.actuate === "string"
    && typeof c.observe === "string";
}
