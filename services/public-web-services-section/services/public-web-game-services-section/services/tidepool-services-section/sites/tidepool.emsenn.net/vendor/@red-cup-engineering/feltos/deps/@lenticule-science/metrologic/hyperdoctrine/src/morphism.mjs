// morphism.mjs — the finite index morphisms the hyperdoctrine fibers over, and their hand-rolled
// validation. No JSON-schema, no ajv: a morphism is checked by running it, the same way the bilattice
// floor is checked by running it.
//
// An IndexMorphism `u: J → I` is `{ source: string[], target: string[], map: (j: string) => string }` —
// a finite function given by listing its whole domain `source` (so `existsAlong`/`forallAlong` can group
// preimages) and codomain `target` (so vacuous cases — a target key nothing maps to — read as the
// order's ⊥/⊤ rather than being silently absent). A Fiber over an index set `I` is `Map<string, Charge>`,
// required COMPLETE over whatever index list it is read against (a charge for every key, even if that
// charge is `⊥` — nothing is read as absent-therefore-bottom; absence is a validation error).

/** @typedef {import("../../bilattice/src/charge.mjs").Charge} Charge */
/** @typedef {{ source: string[], target: string[], map: (sourceKey: string) => string }} IndexMorphism */
/** @typedef {Map<string, Charge>} Fiber */

/**
 * Validate a finite index morphism: `source`/`target` are string arrays, `map` is a function, and `map`
 * sends every element of `source` into `target` (a total function landing in its declared codomain).
 * @param {IndexMorphism} u
 */
export function assertMorphism(u) {
  if (!u || !Array.isArray(u.source) || !Array.isArray(u.target) || typeof u.map !== "function") {
    throw new TypeError("assertMorphism: expected { source: string[], target: string[], map: fn }");
  }
  const target = new Set(u.target);
  for (const j of u.source) {
    const i = u.map(j);
    if (!target.has(i)) {
      throw new TypeError(`assertMorphism: map(${JSON.stringify(j)}) = ${JSON.stringify(i)} is not in target`);
    }
  }
}

/**
 * Validate that a fiber carries a charge for every key in `keys` — completeness, not mere non-emptiness.
 * A fibration measures every cell of its index; a missing key is a bug in the caller, not a silent ⊥.
 * @param {Fiber} fiber @param {string[]} keys
 */
export function assertFiberComplete(fiber, keys) {
  if (!(fiber instanceof Map)) throw new TypeError("assertFiberComplete: expected a Fiber (Map<string, Charge>)");
  for (const k of keys) {
    if (!fiber.has(k)) throw new TypeError(`assertFiberComplete: fiber is missing a charge for ${JSON.stringify(k)}`);
  }
}
