// Type declarations for @lenticule-science/metrologic/number (the barrel covers every subpath).
//
// The number tower constructed on the floor: ℕ (von Neumann positive extension), ℤ (the charge's
// two-sided evidence read as a difference), ℚ (ratios + the residual ⊸), and the exact integer-matrix
// layer over ℤ. The carriers are opaque interned/structural objects; they are typed as branded opaques
// so values cannot be mixed across levels, but their internal shape is not part of the API.

/** A natural number — a von Neumann extension (interned; equality is object identity). */
export type Natural = { readonly __natural: unique symbol };
/** An integer — canonical two-sided evidence (pos, neg) of naturals, value pos − neg. */
export type Integer = { readonly __integer: unique symbol };
/** A rational — a canonical ratio num/den of integers, den > 0. */
export type Rational = { readonly __rational: unique symbol };
/** A matrix of integers — a list of rows. */
export type Matrix = Integer[][];

/** A quotient/remainder pair (the level's `divmod` result). */
export interface DivMod<T> {
  quotient: T;
  remainder: T;
}

// ── natural — ℕ as a settled membership extension (von Neumann), on @lenticule-science/metrologic/{bilattice,chu} ──
export namespace natural {
  /** 0 — reached, not seeded: the membership claim settles and nothing lands at t. */
  export const zero: Natural;
  /** 1 = S(0) = {0}. */
  export const one: Natural;
  /** The successor S(n) = n ∪ {n} — settle one more token to t. */
  export function successor(n: Natural): Natural;
  /** The predecessor n−1 (the ⊆-greatest member of n); pred(0) = 0. */
  export function predecessor(n: Natural): Natural;
  /** Is n zero? */
  export function isZero(n: Natural): boolean;
  /** Equality — same extension (same canonical object). */
  export function equal(a: Natural, b: Natural): boolean;
  /** The members (von Neumann extension {0,…,n−1}) of n. */
  export function members(n: Natural): Natural[];
  /** Membership m ∈ n. */
  export function isMember(m: Natural, n: Natural): boolean;
  /** The order m ≤ n is inclusion m ⊆ n. */
  export function leq(m: Natural, n: Natural): boolean;
  /** The strict order m < n is membership m ∈ n. */
  export function less(m: Natural, n: Natural): boolean;
  /** Total comparison: −1, 0, or +1. */
  export function compare(m: Natural, n: Natural): -1 | 0 | 1;
  /** Addition. */
  export function add(m: Natural, n: Natural): Natural;
  /** Multiplication. */
  export function multiply(m: Natural, n: Natural): Natural;
  /** Truncated subtraction (monus), floored at 0. */
  export function monus(m: Natural, n: Natural): Natural;
  /** Division with remainder by repeated subtraction. Throws on d = 0. */
  export function divmod(n: Natural, d: Natural): DivMod<Natural>;
  /** The greatest common divisor (Euclid). */
  export function gcd(a: Natural, b: Natural): Natural;
  /** The number AS a Chu space over FOUR — its `∈` claim, read through the floor. */
  export function asExtension(n: Natural): import("@lenticule-science/metrologic/chu").ChuSpace;
  /** The tokens whose membership settles to t — n's extension, read through the floor. */
  export function extensionOf(n: Natural): unknown[];
  /** The host size |n| = n (a boundary read). */
  export function toCount(n: Natural): number;
  /** Build the natural for a host count k ≥ 0 (a boundary builder). */
  export function fromCount(k: number): Natural;
}

// ── integer — ℤ as the charge's two-sided evidence read as a difference ─────────────────────────────
export namespace integer {
  /** The integer for two-sided evidence (pos, neg) — value pos − neg. */
  export function integer(pos: Natural, neg: Natural): Integer;
  /** The integer of a natural — purely positive evidence (n, 0). */
  export function fromNatural(n: Natural): Integer;
  /** 0 — the canonical balance (0, 0). */
  export const zero: Integer;
  /** 1 = (1, 0). */
  export const one: Integer;
  /** The additive inverse −z — swap the two evidence sides (`negate`). */
  export function negate(z: Integer): Integer;
  /** Addition. */
  export function add(a: Integer, b: Integer): Integer;
  /** Subtraction a − b = a + (−b). */
  export function subtract(a: Integer, b: Integer): Integer;
  /** Multiplication. */
  export function multiply(a: Integer, b: Integer): Integer;
  /** Canonical (structural) equality. */
  export function equal(a: Integer, b: Integer): boolean;
  /** The evidence-balance relation: (p,m) ∼ (q,n) iff p + n = q + m. */
  export function equivalent(a: Integer, b: Integer): boolean;
  /** Is z zero — does its evidence balance? */
  export function isZero(z: Integer): boolean;
  /** Is z positive? */
  export function isPositive(z: Integer): boolean;
  /** Is z negative? */
  export function isNegative(z: Integer): boolean;
  /** The sign of z: −1, 0, or +1. */
  export function sign(z: Integer): -1 | 0 | 1;
  /** The magnitude |z| as a natural. */
  export function magnitude(z: Integer): Natural;
  /** Division with remainder, truncated toward zero. Throws on b = 0. */
  export function divmod(a: Integer, b: Integer): DivMod<Integer>;
  /** The truncated quotient ⌊a/b⌋ toward zero. */
  export function quotient(a: Integer, b: Integer): Integer;
  /** Does b divide a exactly? */
  export function divides(b: Integer, a: Integer): boolean;
  /** Total comparison: −1, 0, or +1 — the sign of a − b. */
  export function compare(a: Integer, b: Integer): -1 | 0 | 1;
  /** The host integer of z (a boundary read). */
  export function toInt(z: Integer): number;
  /** Build the integer for a host integer k (a boundary builder). */
  export function fromInt(k: number): Integer;
}

// ── rational — ℚ as ratios, the multiplicative two-sidedness and the residual ⊸ ──────────────────────
export namespace rational {
  /** The rational num/den (both integers, den ≠ 0). */
  export function rational(num: Integer, den: Integer): Rational;
  /** The rational of an integer z — z/1. */
  export function fromInteger(z: Integer): Rational;
  /** 0 = 0/1. */
  export const zero: Rational;
  /** 1 = 1/1 — reached by any balance a/a. */
  export const one: Rational;
  /** The additive inverse −q. */
  export function negate(q: Rational): Rational;
  /** The multiplicative inverse 1/q — swap the two multiplicative sides. Throws on 0. */
  export function reciprocal(q: Rational): Rational;
  /** Addition. */
  export function add(a: Rational, b: Rational): Rational;
  /** Subtraction a − b = a + (−b). */
  export function subtract(a: Rational, b: Rational): Rational;
  /** Multiplication. */
  export function multiply(a: Rational, b: Rational): Rational;
  /** Division — the residual a ⊸ b = a / b. Throws on b = 0. */
  export function divide(a: Rational, b: Rational): Rational;
  /** Equality by cross-multiplication: a/b = c/d iff a·d = b·c. */
  export function equal(a: Rational, b: Rational): boolean;
  /** Is q zero? */
  export function isZero(q: Rational): boolean;
  /** The sign of q: −1, 0, or +1. */
  export function sign(q: Rational): -1 | 0 | 1;
  /** Total comparison: −1, 0, or +1 — the sign of a − b. */
  export function compare(a: Rational, b: Rational): -1 | 0 | 1;
  /** The rational for a host integer k (a boundary read). */
  export function fromInt(k: number): Rational;
  /** The rational for a host ratio n/d (a boundary read). */
  export function fromRatio(n: number, d: number): Rational;
  /** The host floating value of q (a boundary read). */
  export function toNumber(q: Rational): number;
}

// ── matrix — the exact integer-matrix layer over ℤ (det, charPoly, Smith normal form, rank) ──────────
export namespace matrix {
  /** Transpose. */
  export function transpose(M: Matrix): Matrix;
  /** Matrix product over ℤ. */
  export function matmul(A: Matrix, B: Matrix): Matrix;
  /** Structural equality of two integer matrices. */
  export function matEqual(A: Matrix, B: Matrix): boolean;
  /** The determinant of a square integer matrix (exact, over ℤ). */
  export function determinant(M: Matrix): Integer;
  /** The characteristic polynomial det(λI − M) — coefficients low→high, monic. */
  export function charPoly(M: Matrix): Integer[];
  /** The Smith normal form invariant factors (nonnegative, the divisor chain). */
  export function smithNormalForm(M: Matrix): Integer[];
  /** The rank — the number of nonzero invariant factors (= rank over ℚ). A host count. */
  export function rank(M: Matrix): number;
  /** A matrix from host integers, for inputs and tests. */
  export function fromInts(rows: number[][]): Matrix;
}
