// chu.mjs — a Chu space over the four-valued bilattice: a relation as a carrier with a duality.
//
// A Chu space C = (A, r, X) is a relation r : A × X → K valued in an alphabet K. Here K is FOUR
// (four.mjs). The points A are the rows, the states X the columns. Reading the matrix one way gives a
// point's costate (a row: what this point asserts across states); the other way gives a state's
// extension (a column: which points assert this state). Over FOUR — a self-dual alphabet with the
// involution `negate` — the transpose-and-negate dual is exactly linear-logic / *-autonomous negation.
//
// This is the clean, kernel-backed lift of swarm's src/chu.mjs and src/eavt-chu.mjs into one carrier:
// EAVT memory (Entity × Attribute → charge), an office table (Office × Capability → holds) and
// readiness (Work × Check → FOUR) are all the same shape, and all settle through the same kernel ⊕.

import { FOUR, asFour, negate, knowledgeJoin } from "./four.mjs";

/**
 * @typedef {import("./four.mjs").Four} Four
 * @typedef {(point: string, state: string) => Four | null | undefined} ValueAt
 * @typedef {{ state: string, value: Four }} Cell
 * @typedef {{ point: string, value: Four }} CoCell
 */

/**
 * A Chu space over FOUR.
 * @typedef {object} ChuSpace
 * @property {"chu.space"} kind
 * @property {readonly string[]} points  the rows (A)
 * @property {readonly string[]} states  the columns (X)
 * @property {Four} absent  the value read for a cell outside the matrix
 * @property {(point: string, state: string) => Four} at  the matrix entry r(point, state)
 */

/**
 * Build a Chu space from a value function. Points and states are frozen in the given order so row and
 * column reads are deterministic. A cell whose state is unknown, or whose `valueAt` returns null, reads
 * as `absent` (default `FOUR.F` — closed-world "absence is the negative charge"; pass `FOUR.BOT` for an
 * open-world "absence is unwitnessed" carrier such as EAVT memory).
 * @param {Iterable<string>} points
 * @param {Iterable<string>} states
 * @param {ValueAt} valueAt
 * @param {{ absent?: Four }} [options]
 * @returns {ChuSpace}
 */
export function chuSpace(points, states, valueAt, options = {}) {
  const P = Object.freeze([...points]);
  const X = Object.freeze([...states]);
  const stateSet = new Set(X);
  const absent = asFour(options.absent ?? FOUR.F);
  return Object.freeze({
    kind: "chu.space",
    points: P,
    states: X,
    absent,
    at(point, state) {
      if (!stateSet.has(state)) return absent;
      const v = valueAt(point, state);
      return v == null ? absent : asFour(v);
    },
  });
}

/**
 * Build a Chu space from an explicit `{ [point]: { [state]: Four } }` matrix.
 * @param {Iterable<string>} points
 * @param {Iterable<string>} states
 * @param {Record<string, Record<string, Four>>} matrix
 * @param {{ absent?: Four }} [options]
 * @returns {ChuSpace}
 */
export function fromMatrix(points, states, matrix, options = {}) {
  return chuSpace(points, states, (p, x) => matrix?.[p]?.[x], options);
}

// ── the two reads ────────────────────────────────────────────────────────────────────────────────
/** A point's costate: its value across every state (a row). @param {ChuSpace} space @param {string} point @returns {Cell[]} */
export function row(space, point) {
  return space.states.map((state) => ({ state, value: space.at(point, state) }));
}

/** A state's extension-with-values: every point's value on it (a column). @param {ChuSpace} space @param {string} state @returns {CoCell[]} */
export function col(space, state) {
  return space.points.map((point) => ({ point, value: space.at(point, state) }));
}

/** The positive extension of a state: the points whose value is `t`. @param {ChuSpace} space @param {string} state @returns {string[]} */
export function extension(space, state) {
  return col(space, state).filter((cell) => cell.value === FOUR.T).map((cell) => cell.point);
}

// ── the duality ──────────────────────────────────────────────────────────────────────────────────
/**
 * Transpose: swap points and states, transpose the matrix. `transpose ∘ transpose = id`.
 * @param {ChuSpace} space @returns {ChuSpace}
 */
export function transpose(space) {
  return chuSpace(space.states, space.points, (state, point) => space.at(point, state), { absent: space.absent });
}

/**
 * The *-autonomous (linear-negation) dual: transpose AND negate every cell. Both transpose and
 * `negate` are involutions, so `dual ∘ dual = id`. The `absent` default rides along under `negate`
 * so the round-trip is exact off the matrix too.
 * @param {ChuSpace} space @returns {ChuSpace}
 */
export function dual(space) {
  return chuSpace(space.states, space.points, (state, point) => negate(space.at(point, state)), {
    absent: negate(space.absent),
  });
}

// ── settling a line through a bilattice morphism ───────────────────────────────────────────────
/**
 * Fold a column to one value through a bilattice join (default knowledge-join ⊕, identity ⊥).
 * Any associative/commutative FOUR operation may be supplied with its identity.
 * @param {ChuSpace} space @param {string} state
 * @param {(a: Four, b: Four) => Four} [join] @param {Four} [identity]
 * @returns {Four}
 */
export function settleColumn(space, state, join = knowledgeJoin, identity = FOUR.BOT) {
  return col(space, state).reduce((acc, cell) => join(acc, cell.value), asFour(identity));
}

/**
 * Fold a row to one value through a bilattice join (default knowledge-join ⊕, identity ⊥).
 * @param {ChuSpace} space @param {string} point
 * @param {(a: Four, b: Four) => Four} [join] @param {Four} [identity]
 * @returns {Four}
 */
export function settleRow(space, point, join = knowledgeJoin, identity = FOUR.BOT) {
  return row(space, point).reduce((acc, cell) => join(acc, cell.value), asFour(identity));
}

/** Is `value` a Chu space built by this module? @param {unknown} value @returns {boolean} */
export function isChuSpace(value) {
  return !!value && typeof value === "object" && /** @type {ChuSpace} */ (value).kind === "chu.space";
}
