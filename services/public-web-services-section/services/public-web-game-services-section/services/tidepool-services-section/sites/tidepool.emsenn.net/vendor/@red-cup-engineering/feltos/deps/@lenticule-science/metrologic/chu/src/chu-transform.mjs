// chu-transform.mjs — Chu transforms: the morphisms of Chu(FOUR), making the spaces a category.
//
// chu.mjs gives the OBJECTS — a relation r : A×X → FOUR with rows, columns and a duality. This module
// gives the ARROWS. A morphism from C=(A, r, X) to D=(B, s, Y) is an adjoint pair (f, g):
//     f : A → B   (forward, on points — covariant)
//     g : Y → X   (backward, on states — CONTRAVARIANT)
// satisfying the single adjointness law
//     s(f a, y) = r(a, g y)   for all a ∈ A, y ∈ Y.
// The backward leg is the whole point: a view pushes points forward but pulls observations back, and
// the law says "what D sees of the moved point equals what C saw through the pulled-back observation"
// — a governed view, with no information invented at the seam. The dual functor falls straight out of
// *-autonomy: the dual of (f, g) is the same pair swapped, (g, f).

import { asFour } from "./four.mjs";
import { dual } from "./chu.mjs";

/**
 * @typedef {import("./chu.mjs").ChuSpace} ChuSpace
 * @typedef {import("./four.mjs").Four} Four
 * @typedef {(point: string) => string} Forward
 * @typedef {(state: string) => string} Backward
 * @typedef {{ kind: "domain", point?: string, state?: string, mapped: string, why: string }
 *          | { kind: "adjointness", point: string, state: string, left: Four, right: Four }} Failure
 * @typedef {{ ok: boolean, failures: Failure[] }} CheckResult
 */

/**
 * A morphism of Chu spaces C → D: an adjoint pair (forward, backward).
 * @typedef {object} ChuTransform
 * @property {"chu.transform"} kind
 * @property {string | null} label
 * @property {ChuSpace} source
 * @property {ChuSpace} target
 * @property {Forward} forward
 * @property {Backward} backward
 */

/**
 * Check the adjoint pair (forward, backward) : source → target. Verifies both legs stay in their
 * carriers (forward lands in `target.points`, backward in `source.states`) and the adjointness law
 * holds on every (point, state). Returns every failing cell; `ok` ⇔ no failures.
 * @param {ChuSpace} source @param {ChuSpace} target @param {Forward} forward @param {Backward} backward
 * @returns {CheckResult}
 */
export function checkChuTransform(source, target, forward, backward) {
  /** @type {Failure[]} */
  const failures = [];
  const targetPoints = new Set(target.points);
  const sourceStates = new Set(source.states);

  for (const a of source.points) {
    const fa = forward(a);
    if (!targetPoints.has(fa)) failures.push({ kind: "domain", point: a, mapped: fa, why: "forward left target.points" });
  }
  for (const y of target.states) {
    const gy = backward(y);
    if (!sourceStates.has(gy)) failures.push({ kind: "domain", state: y, mapped: gy, why: "backward left source.states" });
  }
  if (failures.length) return { ok: false, failures };

  for (const a of source.points) {
    for (const y of target.states) {
      const left = asFour(target.at(forward(a), y)); // s(f a, y)
      const right = asFour(source.at(a, backward(y))); // r(a, g y)
      if (left !== right) failures.push({ kind: "adjointness", point: a, state: y, left, right });
    }
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Construct a morphism C → D from an adjoint pair. THROWS if the pair is not adjoint — building a
 * non-morphism is a category error, and the thrown message names the first cell that broke.
 * @param {ChuSpace} source @param {ChuSpace} target @param {Forward} forward @param {Backward} backward
 * @param {{ label?: string }} [options]
 * @returns {ChuTransform}
 */
export function chuTransform(source, target, forward, backward, options = {}) {
  const check = checkChuTransform(source, target, forward, backward);
  if (!check.ok) {
    const first = check.failures[0];
    throw new Error(`not a Chu transform (${check.failures.length} violation(s)); first: ${JSON.stringify(first)}`);
  }
  return Object.freeze({
    kind: "chu.transform",
    label: options.label ?? null,
    source,
    target,
    forward,
    backward,
  });
}

/** Is `value` a Chu transform built by this module? @param {unknown} value @returns {boolean} */
export function isChuTransform(value) {
  return !!value && typeof value === "object" && /** @type {ChuTransform} */ (value).kind === "chu.transform";
}

/**
 * The identity morphism on a space: both legs are identity (trivially adjoint, s = r, f = g = id).
 * @param {ChuSpace} space @param {{ label?: string }} [options] @returns {ChuTransform}
 */
export function idTransform(space, options = {}) {
  return chuTransform(space, space, (a) => a, (y) => y, { label: options.label ?? "id" });
}

/**
 * Compose t1 : C → D with t2 : D → E. Points run forward through both (f2 ∘ f1); states pull back
 * through both in the OPPOSITE order (g1 ∘ g2) — the state leg's contravariance is what makes the
 * composite well-typed. Adjointness is re-checked, so a mistyped composite throws rather than slips.
 * @param {ChuTransform} t1 @param {ChuTransform} t2 @param {{ label?: string }} [options]
 * @returns {ChuTransform}
 */
export function composeTransforms(t1, t2, options = {}) {
  if (t1.target !== t2.source) {
    throw new Error("composeTransforms: t1.target must be t2.source (cannot compose these morphisms)");
  }
  const forward = (/** @type {string} */ a) => t2.forward(t1.forward(a));
  const backward = (/** @type {string} */ z) => t1.backward(t2.backward(z));
  return chuTransform(t1.source, t2.target, forward, backward, {
    label: options.label ?? `${t2.label ?? "·"}∘${t1.label ?? "·"}`,
  });
}

/**
 * The dual functor on morphisms (the *-autonomous structure). A transform (f, g) : C → D dualizes to
 * (g, f) : D^⊥ → C^⊥ — the same pair, swapped — so `dualTransform ∘ dualTransform` is the original.
 * @param {ChuTransform} t @param {{ label?: string }} [options] @returns {ChuTransform}
 */
export function dualTransform(t, options = {}) {
  return chuTransform(dual(t.target), dual(t.source), t.backward, t.forward, {
    label: options.label ?? `(${t.label ?? "·"})^⊥`,
  });
}
