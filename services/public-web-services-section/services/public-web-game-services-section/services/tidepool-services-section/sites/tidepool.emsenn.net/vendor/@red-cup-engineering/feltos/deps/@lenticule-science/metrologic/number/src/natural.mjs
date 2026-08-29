// natural.mjs — ℕ as a settled membership extension, built on the live floor.
//
// A natural number is the positive EXTENSION of a membership claim: the tokens whose membership, once
// SETTLED, lands at t. Nothing is seeded — there is no empty box to start from (the floor forbids it:
// `articulate([])` is malformed, and a value is measured, never stamped). In particular ZERO is REACHED:
//
//   zero        — articulate the boundary token's membership and settle it OFF t. Telling it both member
//                 and not-member, the knowledge-meet REACHES ⊥ (the floor's own [false,false]); so the
//                 claim settles and NOTHING lands at t. The empty extension is a *result of settling*,
//                 not a primitive ∅.
//   successor n — settle one more token to t: the open boundary n becomes a member, a new boundary opens.
//   value of n  — the size of its t-extension, read back through the floor's Chu space `extension`.
//
// Taken von Neumann, the tokens are the prior numbers, so n's members are {0,…,n−1} and its boundary is
// n. The two membership values are not hand-written corners: the member value t is the floor's settled
// `memberOf` claim, and the boundary value ⊥ is reached by a contradiction meet — both read off the floor.
//
// Numbers are interned (one canonical object per value) purely as canonicalization, so equality is object
// identity and the von Neumann nesting stays linear. That is a cache over the settled content, not the
// content. No host numbers live in the construction (only at the `toCount`/`fromCount` boundary).

import { settle, posit, predicate, articulate, negate, meetKnowledge, present } from "@lenticule-science/metrologic/bilattice";
import { fromMatrix, extension, FOUR } from "@lenticule-science/metrologic/chu";

// ── the two membership values, taken from the floor (settled / reached — never stamped) ────────────────
// MEMBER: the floor's settled `memberOf` claim for a given token — measured to t (potential).
const MEMBER = settle(posit(predicate(articulate(["token", "memberOf"]))))
  .sheaf.section["fiber-algebras"][0].assignments[0].charge;
// BOUNDARY: ⊥, REACHED — the same token told member and not-member, met under contradiction.
const BOUNDARY = meetKnowledge({ left: MEMBER, right: negate(MEMBER) });

const fourName = (charge) => {
  const [p, n] = present(charge);
  return p && n ? FOUR.TOP : p ? FOUR.T : n ? FOUR.F : FOUR.BOT;
};
const MEMBER_VALUE = fourName(MEMBER);     // t  — settled "is a member"
const BOUNDARY_VALUE = fourName(BOUNDARY); // ⊥  — reached "nothing lands here"

// ── the numbers ───────────────────────────────────────────────────────────────────────────────────────
let nextId = 0;
const registry = new Map(); // canonicalization (interning) over the settled content — not the content

function intern(memberList) {
  const seen = new Set();
  const uniq = [];
  for (const m of memberList) if (!seen.has(m.id)) { seen.add(m.id); uniq.push(m); }
  uniq.sort((a, b) => a.id - b.id);
  const sig = uniq.map((m) => m.id).join(",");
  let n = registry.get(sig);
  if (!n) { n = { id: nextId++, members: uniq, sig }; registry.set(sig, n); }
  return n;
}

/** 0 — reached, not seeded: the membership claim settles and nothing lands at t (its boundary reaches ⊥). */
export const zero = intern([]);

/** The members of n — the tokens its membership claim settles to t on (its von Neumann extension {0,…,n−1}). */
export const members = (n) => [...n.members];

/** The successor S(n) = n ∪ {n}: settle one more token to t — the open boundary n joins the extension. */
export const successor = (n) => intern([...n.members, n]);

/** 1 = S(0) = {0}. */
export const one = successor(zero);

/** Is n zero — does its membership claim land nothing at t? */
export const isZero = (n) => n.members.length === 0;

/** Equality of naturals — same extension (same canonical object). */
export const equal = (a, b) => a.id === b.id;

/** Membership m ∈ n — m is a token of n's extension. */
export const isMember = (m, n) => n.members.some((x) => x.id === m.id);

/** The order m ≤ n is inclusion m ⊆ n (every token of m settles to t in n). */
export const leq = (m, n) => m.members.every((x) => isMember(x, n));

/** The strict order m < n is membership m ∈ n. */
export const less = isMember;

/** Total comparison: −1 if m < n, 0 if equal, +1 if m > n. */
export const compare = (m, n) => (equal(m, n) ? 0 : less(m, n) ? -1 : 1);

/** The predecessor n−1 — the ⊆-greatest member of n (the token holding the most). pred(0) = 0. */
export const predecessor = (n) =>
  isZero(n) ? zero : n.members.reduce((a, b) => (a.members.length >= b.members.length ? a : b));

/** Addition: m + 0 = m, m + S(p) = S(m + p). */
export function add(m, n) {
  return isZero(n) ? m : successor(add(m, predecessor(n)));
}

/** Multiplication: m · 0 = 0, m · S(p) = m + (m · p). */
export function multiply(m, n) {
  return isZero(n) ? zero : add(m, multiply(m, predecessor(n)));
}

/** Truncated subtraction (monus): m ∸ n, floored at 0 (settle members away one boundary at a time). */
export function monus(m, n) {
  return isZero(n) ? m : isZero(m) ? zero : monus(predecessor(m), predecessor(n));
}

/**
 * Division with remainder by repeated subtraction: `{ quotient, remainder }` with n = quotient·d +
 * remainder and remainder < d. Throws on d = 0.
 * @param {object} n @param {object} d @returns {{ quotient: object, remainder: object }}
 */
export function divmod(n, d) {
  if (isZero(d)) throw new RangeError("natural divmod: division by zero");
  let quotient = zero, remainder = n;
  while (leq(d, remainder)) { remainder = monus(remainder, d); quotient = successor(quotient); }
  return { quotient, remainder };
}

/** The greatest common divisor by the Euclidean algorithm. gcd(a, 0) = a. */
export function gcd(a, b) {
  while (!isZero(b)) { const r = divmod(a, b).remainder; a = b; b = r; }
  return a;
}

// ── the extension realization (the number AS its settled membership, read through the floor) ────────────
const tokenOf = (n) => `#${n.id}`;

/**
 * The number AS a Chu space over FOUR: its `∈` claim over the universe n+1 = {0,…,n}, with each member
 * carrying the floor's SETTLED member value (t) and the boundary n carrying the REACHED value (⊥). The
 * floor's `extension` then reads the set back off it; for zero the lone boundary reached ⊥, so it is empty.
 * @param {object} n @returns {import("@lenticule-science/metrologic/chu").ChuSpace}
 */
export function asExtension(n) {
  const universe = [...n.members, n]; // {0,…,n−1} members, plus the open boundary n
  const matrix = {};
  for (const x of n.members) matrix[tokenOf(x)] = { "∈": MEMBER_VALUE };
  matrix[tokenOf(n)] = { "∈": BOUNDARY_VALUE };
  return fromMatrix(universe.map(tokenOf), ["∈"], matrix);
}

/** The tokens whose membership settles to t — n's extension, read through the floor. |extensionOf(n)| = n. */
export const extensionOf = (n) => extension(asExtension(n), "∈");

// ── boundary reads (host counts ↔ naturals) ───────────────────────────────────────────────────────────
// Not part of the construction — a convenience for tests and host code.

/** The host size of a natural: |n| = n (= the size of its t-extension). A boundary read. */
export const toCount = (n) => n.members.length;

/** Build the natural for a host count k ≥ 0 by iterating successor. A boundary builder. */
export function fromCount(k) {
  let n = zero;
  for (let i = 0; i < k; i++) n = successor(n);
  return n;
}
