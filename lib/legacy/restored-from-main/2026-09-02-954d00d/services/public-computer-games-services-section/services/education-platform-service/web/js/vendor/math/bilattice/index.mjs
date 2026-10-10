// @lenticule-science/metrologic/bilattice — the bilattice predication floor, on zero dependencies.
//
// The barrel: the full public API. Narrower imports are available via subpaths —
//   import { joinKnowledge } from "@lenticule-science/metrologic/bilattice/charge";
//   import { settle }        from "@lenticule-science/metrologic/bilattice/descent";
//   import { brim }          from "@lenticule-science/metrologic/bilattice/cone";
//   import { vanish }        from "@lenticule-science/metrologic/bilattice/void";

// charge — the carrier and its value-algebra
export {
  present,
  isTop,
  negate,
  conflate,
  joinKnowledge,
  meetKnowledge,
  joinTruth,
  meetTruth,
  leqKnowledge,
  compareKnowledge,
  aggregate,
} from "./charge.mjs";

// descent — the four-regime descent, the modal generators, settle, and the consistent/paraconsistent split
export {
  articulate,
  predicate,
  cohere,
  posit,
  commutate,
  raiseKnowledge,
  lowerKnowledge,
  raiseTruth,
  lowerTruth,
  possibilizeKnowledge,
  necessitateKnowledge,
  possibilizeTruth,
  necessitateTruth,
  lastValuation,
  settle,
  compare,
} from "./descent.mjs";

// cone — the counit/dual cones
export { brim, adjudicate, presume } from "./cone.mjs";

// void — the void reads and the aperiodic/transfinite duals
export { saturate, transfer, twistor, precipitate, estrange, gap, vanish } from "./void.mjs";
