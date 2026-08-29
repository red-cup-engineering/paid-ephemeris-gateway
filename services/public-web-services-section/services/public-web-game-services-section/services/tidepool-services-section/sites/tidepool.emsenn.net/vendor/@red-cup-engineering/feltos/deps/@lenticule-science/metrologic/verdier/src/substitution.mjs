// substitution.mjs — a substitution as a MORPHISM.
//
// A substitution over an alphabet A is a map `rule: A → A*` sending each letter to a word. It IS a
// morphism: it extends UNIQUELY, by concatenation, to a monoid endomorphism σ*: A* → A* of the free
// monoid on A — that is the universal property of A*. `substitute` is that extension; `iterate`/`orbit`
// run it. The substitution MATRIX is not primary: it is the ABELIANIZATION of this morphism — the induced
// endomorphism on the free abelian monoid ℤ^A, σ's commutative shadow — and `abelianize` derives it.
//
// The alphabet IS the bilattice values {⊥, t, f, ⊤} the floor already gives us (carriers, not letters with
// a labeling injected on top), but nothing here is special to them: the morphism is general over any
// alphabet and rule. Example substitutions used to exercise this live in the tests, not here.

import * as Z from "@lenticule-science/metrologic/number/integer";

/**
 * The substitution morphism σ*: A* → A* applied to a word. `σ*(w₁ w₂ … wₙ) = σ(w₁) · σ(w₂) · … · σ(wₙ)` —
 * the unique homomorphic extension of `rule` to the free monoid (concatenation is `flatMap`). A word is a
 * list of letters; the empty word `[]` is the identity, and σ* preserves it.
 * @param {Record<string, string[]>} rule each letter → its image word @param {string[]} word
 * @returns {string[]} σ*(word)
 */
export const substitute = (rule, word) => word.flatMap((letter) => rule[letter]);

/**
 * σⁿ(word): iterate the morphism n times (σ⁰ = the identity on the word).
 * @param {Record<string, string[]>} rule @param {string[]} word @param {number} n @returns {string[]}
 */
export function iterate(rule, word, n) {
  let w = word;
  for (let i = 0; i < n; i++) w = substitute(rule, w);
  return w;
}

/**
 * The orbit `seed, σ(seed), σ²(seed), …` as a lazy generator of words — the directly-watchable part of the
 * morphism's action. For a letter whose image starts with itself, the orbit's words are nested prefixes
 * converging to σ's fixed point (the infinite word σ^∞).
 * @param {Record<string, string[]>} rule @param {string[]} seed @yields {string[]}
 */
export function* orbit(rule, seed) {
  let w = seed;
  for (;;) { yield w; w = substitute(rule, w); }
}

/**
 * The substitution's FIXED-POINT CLOSURE as a `(lattice, phi)` pair — the closure morphism whose ordinal
 * the `closure` module MEASURES (don't assert it; run `closureOrdinal` on this and read κ off the result).
 *
 * The order is prefix-extension; Φ = σ. For a `seed` letter that σ prolongs (σ(seed) begins with seed),
 * the orbit `seed ⊑ σ(seed) ⊑ σ²(seed) ⊑ …` is a strictly-growing nested chain that never reaches a
 * finite fixed point, so its sup is taken only at the ω-limit: the infinite fixed word σ^∞ (the `INF`
 * element), which Φ fixes. Hence the closure ordinal is ω — the morphism is Scott-continuous — which the
 * `closure` module confirms by measurement. (`sup` returns `INF` the instant the chain grows, so it never
 * materialises a long word; for the same reason a small `finite` search bound suffices — growth precludes
 * any finite fixed point.)
 * @param {Record<string, string[]>} rule @param {string[]} seed a one-letter (prolongable) seed word
 * @returns {{ lattice: object, phi: (w:any)=>any }}
 */
export function fixedPointClosure(rule, seed) {
  const INF = { fixedPoint: true };                 // σ^∞, the limit infinite word — Φ fixes it
  const isPrefix = (a, b) => a.every((x, i) => x === b[i]);
  const eq = (a, b) =>
    a.fixedPoint ? !!b.fixedPoint : (!b.fixedPoint && a.length === b.length && isPrefix(a, b));
  const lattice = {
    bottom: seed,
    eq,
    leq: (a, b) => !!b.fixedPoint || (!a.fixedPoint && a.length <= b.length && isPrefix(a, b)),
    join: (a, b) => (a.fixedPoint || b.fixedPoint ? INF : a.length >= b.length ? a : b),
    sup: (seqFn) => {
      let prev = seqFn(0);
      for (let n = 1; n <= 32; n++) {
        const cur = seqFn(n);
        if (eq(cur, prev)) return cur;              // stabilised at a finite word (σ already fixed it)
        if (!cur.fixedPoint && !prev.fixedPoint && cur.length > prev.length) return INF; // grows ⇒ σ^∞
        prev = cur;
      }
      return INF;
    },
  };
  const phi = (w) => (w.fixedPoint ? INF : substitute(rule, w));
  return { lattice, phi };
}

/**
 * The abelianization of the morphism: its induced endomorphism on the free ABELIAN monoid ℤ^A, as a
 * matrix of OUR integers. `M[i][j]` = the number of times `alphabet[i]` occurs in `σ(alphabet[j])` — i.e.
 * σ read after forgetting the order of letters. The entry is built by COUNTING the occurrences and lifting
 * that count into ℤ via `number/integer.fromInt` — this is the morphism's commutative shadow, derived (pure
 * counting over our carriers), never injected, never host arithmetic.
 * @param {Record<string, string[]>} rule @param {string[]} alphabet ordered, fixes the matrix basis
 * @returns {object[][]} a matrix of our integers
 */
export function abelianize(rule, alphabet) {
  return alphabet.map((row) =>
    alphabet.map((col) => Z.fromInt(rule[col].filter((x) => x === row).length)));
}
