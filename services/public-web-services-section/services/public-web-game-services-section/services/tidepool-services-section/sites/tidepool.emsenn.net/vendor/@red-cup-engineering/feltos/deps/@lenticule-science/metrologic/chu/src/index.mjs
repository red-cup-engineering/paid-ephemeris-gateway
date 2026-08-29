// @lenticule-science/metrologic/chu — Chu spaces over the four-valued bilattice, on the 561-group math-kernel.
//
// The barrel: the full public API. Subpath entry points are also available for narrower imports —
//   import { negate } from "@lenticule-science/metrologic/chu/four";
//   import { chuSpace } from "@lenticule-science/metrologic/chu/chu";
//   import { chuTransform } from "@lenticule-science/metrologic/chu/transform";

export {
  FOUR,
  GLYPH,
  isFour,
  asFour,
  toCharge,
  fromCharge,
  negate,
  conflate,
  knowledgeJoin,
  knowledgeMeet,
  truthJoin,
  truthMeet,
} from "./four.mjs";

export {
  chuSpace,
  fromMatrix,
  isChuSpace,
  row,
  col,
  extension,
  transpose,
  dual,
  settleColumn,
  settleRow,
} from "./chu.mjs";

export {
  checkChuTransform,
  chuTransform,
  isChuTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "./chu-transform.mjs";
