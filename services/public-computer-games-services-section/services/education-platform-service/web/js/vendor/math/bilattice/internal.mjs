// internal.mjs — out-of-system plumbing (the `_`-prefixed helpers of the kernel). Not morphisms:
// they compare and key structures, and accumulate the evidence carrier. No math lives here.

/**
 * Structural-equality / map-key helper: `JSON.stringify`, sourced once instead of re-typed per op.
 * @param {unknown} x @returns {string}
 */
export const stringify = (x) => JSON.stringify(x);

/**
 * Lossless accumulation of evidence: concat two witness lists, dedup by structural equality. The
 * evidence carrier only ever GROWS (a join-semilattice); no witness is discarded, no matter which
 * lattice op is combining. This is the one operation the carrier admits — every charge op unions
 * evidence the same way, and they differ only in how they move the VALUE bits.
 * @template T @param {T[]} a @param {T[]} b @returns {T[]}
 */
export function union(a, b) {
  const out = [...a];
  for (const w of b) if (!out.some((x) => stringify(x) === stringify(w))) out.push(w);
  return out;
}
