// settling.mjs — the settling-associated sheaf and its cohomology, computed over real data.
//
// This is the central object of the cohomological development, built exactly to its definition
// (math/playground/_archive/formal/objects/settling-associated-sheaf.md and the regime theorems):
//
//   A SETTLING is a monotone sequence of stages; stage τ designates a set of predication cells
//   (knowledge accumulates — D_σ ⊆ D_τ for σ ≤ τ). Some stages are LIMIT ordinals.
//
//   𝓕_U(τ) = ℤ^{Δ⁺_τ},  the free abelian group on the cells NEWLY designated at τ
//            (Δ⁺_τ = D_τ \ D_{<τ}).
//
//   A FIRING is a stage with Δ⁺_τ ≠ ∅. A firing is NON-SCOTT-CONTINUOUS iff it happens at a LIMIT
//   stage: a cell that first appears only at the limit, obtainable from no finite sub-stage. (A
//   successor firing is a coboundary — it contributes 0 to H¹; a limit firing is a cocycle that is
//   not a coboundary — it contributes a generator.) Hence:
//
//   H¹  =  ⊕_{μ ∈ L_ns(κ)} ℤ^{Δ⁺_μ}  =  the free abelian group on the cells first designated at a
//          limit stage.   rank H¹ = the number of such cells.
//
//   cl-inv(v) = [𝟙_𝓕] = the sum of all those generators — the complete invariant for a settling up
//          to mutual local derivability (MLD): two settlings are MLD-equivalent iff their firing
//          structures agree up to settling-shift (a monotone reindexing of the stages).
//
// Everything here is finite ℤ-linear algebra over arbitrary data. A finite settling (no limit stage)
// has H¹ = 0 — which is exactly what the bilattice floor produces (see floor.mjs).

const S = (x) => JSON.stringify(x);
const dedup = (xs) => { const out = []; for (const x of xs) if (!out.some((o) => S(o) === S(x))) out.push(x); return out; };
const without = (xs, ys) => xs.filter((x) => !ys.some((y) => S(y) === S(x)));

// This file reads the TEMPORAL structure of a settling: which cells fire, and at which stages. `h1`
// counts the cells first designated at a limit stage — read directly off the witnessed settling. The
// CELLULAR cohomology (the actual ker δ⁰ / im δ⁰ of the settled relation) is constructed in cochain.mjs;
// this temporal firing count is the complementary reading. Both are read off the carriers, neither is
// imported.

/**
 * Build a settling from a list of stage specs. Each spec is `{ designated, limit? }`: `designated` is
 * the cumulative set of cells valued **t** through that stage; `limit` marks the stage as a limit
 * ordinal (default false). Validates monotonicity (knowledge only accumulates) and that stage 0 is not
 * a limit. `cofinal: "uncountable"` may be set to declare an ω₁-cofinal firing pattern (the aperiodic
 * regime, which a finite truncation otherwise presents as transfinite-bounded).
 * @param {Array<{ designated: unknown[], limit?: boolean }>} stages
 * @param {{ cofinal?: "uncountable" }} [opts]
 * @returns {{ stages: {designated: unknown[], limit: boolean}[], cofinal?: string }}
 */
export function settling(stages, opts = {}) {
  if (!Array.isArray(stages) || stages.length === 0) throw new TypeError("settling: need at least one stage");
  if (stages[0].limit) throw new TypeError("settling: stage 0 cannot be a limit ordinal");
  const norm = stages.map((s, i) => {
    const designated = dedup(s.designated ?? []);
    if (i > 0) {
      const prev = stages[i - 1].designated ?? [];
      if (without(prev, designated).length) throw new TypeError(`settling: stage ${i} drops cells — knowledge must only accumulate`);
    }
    return { designated, limit: !!s.limit };
  });
  return opts.cofinal ? { stages: norm, cofinal: opts.cofinal } : { stages: norm };
}

/**
 * The newly-designated cells at each stage — Δ⁺_τ = D_τ \ D_{<τ}, the support of the sheaf 𝓕_U.
 * @param {object} v a settling @returns {{ stage: number, limit: boolean, added: unknown[] }[]}
 */
export function increments(v) {
  return v.stages.map((s, i) => ({
    stage: i,
    limit: s.limit,
    added: i === 0 ? s.designated : without(s.designated, v.stages[i - 1].designated),
  }));
}

/** The firing ordinals — the stages at which something new is designated. */
export const firings = (v) => increments(v).filter((d) => d.added.length > 0);

/** The non-Scott-continuous firing ordinals — the firings that happen at a limit stage (L_ns). */
export const nscFirings = (v) => firings(v).filter((d) => d.limit);

/**
 * The temporal firing reading: the cells first designated at a limit stage, and their count — read
 * directly off the witnessed settling. `generators` lists them as `{ stage, cell }`; `rank` is the count;
 * `vanishes` is rank 0. For a finite settling the count is 0; with limit firings it is non-zero. (The
 * cellular cohomology — ker δ⁰ / im δ⁰ of the settled relation — is constructed in cochain.mjs.)
 * @param {object} v a settling @returns {{ generators: {stage: number, cell: unknown}[], rank: number, degree: 1, vanishes: boolean }}
 */
export function h1(v) {
  const generators = nscFirings(v).flatMap((d) => d.added.map((cell) => ({ stage: d.stage, cell })));
  return { generators, rank: generators.length, degree: 1, vanishes: generators.length === 0 };
}

/**
 * The classifying invariant cl-inv(v) = [𝟙_𝓕] — the complete invariant up to MLD. Rendered
 * shift-invariantly: the ordered sequence of cell-sets that fire at limit stages, with the stage
 * indices dropped (only their order is MLD-significant). Equal cl-inv ⟺ MLD-equivalent.
 * @param {object} v a settling @returns {string} the normalized class
 */
export function clInv(v) {
  return S(nscFirings(v).map((d) => dedup(d.added)));
}

/**
 * Two settlings are mutually locally derivable iff their classifying invariants agree (their
 * limit-firing structures match up to settling-shift).
 * @param {object} a @param {object} b @returns {boolean}
 */
export const mldEquivalent = (a, b) => clInv(a) === clInv(b);

/**
 * The static classification: a settling's DEPTH (κ, the stage at which it stabilizes — the last firing)
 * and the REGIME its firing structure places it in:
 *   • finite     — no limit stage (κ < ω); H¹ = 0.
 *   • scott      — a limit stage but no firing at it (κ = ω, Scott-continuous closure); H¹ = 0.
 *   • transfinite— a non-Scott-continuous firing at a (countable) limit; H¹ ≠ 0.
 *   • aperiodic  — declared ω₁-cofinal firing (`cofinal: "uncountable"`); H¹ ≠ 0 and never stabilizes.
 * @param {object} v a settling @returns {{ depth: number, regime: "finite"|"scott"|"transfinite"|"aperiodic" }}
 */
export function classify(v) {
  const fs = firings(v);
  const depth = fs.length ? fs[fs.length - 1].stage : 0;
  const hasLimit = v.stages.some((s) => s.limit);
  const hasNsc = nscFirings(v).length > 0;
  let regime;
  if (!hasNsc) regime = hasLimit ? "scott" : "finite";
  else regime = v.cofinal === "uncountable" ? "aperiodic" : "transfinite";
  return { depth, regime };
}

/** A settling's depth alone — its closure ordinal κ (the last firing stage). */
export const depth = (v) => classify(v).depth;
