/**
 * Behaviour-carrier codec — bi-orthogonal closures of design-sets.
 *
 * A behaviour witness packages the carrier of a bi-orthogonally closed
 * ($\mathbf{B} = \mathbf{B}^{\perp\perp}$) set of designs — a Galois closure on
 * the lattice of design-sets under orthogonality.  The witness carrier has no
 * hidden invariant beyond being a list of designs, so we serialize the list and
 * reconstruct the frozen `BehaviourWitness` literal directly (its `kind`
 * discriminant fixed); we do *not* recompute the closure on decode, which would
 * not reproduce an arbitrary serialized carrier.
 */
import type { BehaviourWitness } from "../structuring/concurrent-game/with-symmetry/ludicizing/settling/index.mjs";
import { decodeDesign, encodeDesign } from "./design.mjs";
import { asArray, asObject, field } from "./json.mjs";
import type { Json } from "./json.mjs";

/** Encode a behaviour witness to `{carrier: [design, ...]}`. */
export function encodeBehaviour(value: BehaviourWitness): Json {
  return { carrier: value.carrier.map(encodeDesign) };
}

/** Decode `{carrier: [design, ...]}` back to a frozen `BehaviourWitness`. */
export function decodeBehaviour(json: unknown): BehaviourWitness {
  const obj = asObject(json, "behaviour");
  const carrier = asArray(field(obj, "carrier", "behaviour"), "behaviour.carrier").map(decodeDesign);
  return Object.freeze({
    kind: "game.behaviour:witness" as const,
    carrier: Object.freeze(carrier),
  });
}
