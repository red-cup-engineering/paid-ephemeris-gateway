/**
 * @emsenn/animating/becoming/doing/working/governing/deciding — decision as a morphism over a settled relating
 * section: read a valuation charge, draw a linear budget, emit a typed
 * action or a typed abstention.
 *
 * The substrate is domain-neutral. A specialization supplies `Proposal`s
 * (action + linear cost + scalar merit + justifying charge); `decide` allocates
 * the finite budget across them and returns a complete, auditable `DecisionRun`.
 */
export { decide, actionsOf, actedOf } from "./deciding.mjs";
export * as fleet from "./fleet/index.mjs";
export type {
  LinearBudget,
  Proposal,
  Decision,
  Acted,
  Abstained,
  AbstainReason,
  DecisionRun,
  DecideOptions,
} from "./deciding.mjs";
