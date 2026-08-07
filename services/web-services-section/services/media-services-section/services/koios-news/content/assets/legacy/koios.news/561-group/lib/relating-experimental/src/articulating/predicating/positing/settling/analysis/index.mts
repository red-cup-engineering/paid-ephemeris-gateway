/**
 * settling/analysis — analytical reads of settled carriers.
 *
 * Analysis is downstream of settlement: it reads extrema and derived geometry
 * (exact arithmetic, graded sectors, spectral root structure, differential
 * controls) without defining the primitive carriers it analyzes.
 */
export * from "./exact-number.mjs";
export * from "./graded.mjs";
export * from "./spectral.mjs";
export * from "./laplacian.mjs";
export * from "./evidence.mjs";
export * as arithmetic from "./arithmetic.mjs";
export * as differential from "./differential.mjs";
export * as conservation from "./conservation.mjs";
