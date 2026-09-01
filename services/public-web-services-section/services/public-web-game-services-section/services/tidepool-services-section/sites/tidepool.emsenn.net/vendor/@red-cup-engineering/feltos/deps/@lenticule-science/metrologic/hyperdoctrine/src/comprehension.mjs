// comprehension.mjs — Lawvere comprehension: read a fiber's designated (order-top) locus off as a
// support, and its adjoint-inverse, extending a support back up to a fiber by joining in the designated
// value everywhere it holds. `{i : φ(i)}` and `Ext` — one adjunction, proven in
// `test/comprehension.test.mjs`: `Ext(S) ≤ φ` iff `S ⊆ {i : φ(i)}`.
import { orderOps, designated } from "./order.mjs";
import { assertFiberComplete } from "./morphism.mjs";
import { existsAlong } from "./adjoints.mjs";

/** @typedef {import("./morphism.mjs").Fiber} Fiber */

/**
 * `{i : φ(i)}` — the support where `φ` reads at the order's designated (top) value: `⊤` for knowledge
 * ("told both"), `T` for truth ("positive, not negative"). This is `φ`'s comprehension at that order.
 * @param {Fiber} fiber @param {string[]} keys @param {string} order @returns {string[]}
 */
export function comprehend(fiber, keys, order) {
  assertFiberComplete(fiber, keys);
  orderOps(order); // validates the order tag
  return keys.filter((k) => designated(fiber.get(k), order));
}

/**
 * `Ext(S)` — extend a support `S ⊆ keys` to a fiber over all of `keys` by existentially quantifying the
 * terminal fiber on `S` (every element of `S` carries the order's designated/top charge) along the
 * inclusion `S ↪ keys`. Outside `S` this reads at the order's ⊥ (nothing witnessed there).
 * @param {string[]} support @param {string[]} keys @param {string} order @returns {Fiber}
 */
export function extend(support, keys, order) {
  const ops = orderOps(order);
  const universe = new Set(keys);
  for (const s of support) {
    if (!universe.has(s)) throw new TypeError(`extend: support key ${JSON.stringify(s)} is not in keys`);
  }
  const inclusion = { source: support, target: keys, map: (k) => k };
  const terminal = new Map(support.map((k) => [k, ops.top]));
  return existsAlong(inclusion, terminal, order);
}
