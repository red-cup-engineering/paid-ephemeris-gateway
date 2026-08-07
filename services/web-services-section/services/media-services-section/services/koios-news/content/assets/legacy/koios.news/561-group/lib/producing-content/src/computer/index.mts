/**
 * Producer helpers for @emsenn/producing-content.
 *
 * This internal facet folds in the former @emsenn/content-computer app: demand
 * intake, prompt-to-text ask providers, and demand-meets-supply production
 * helpers. Downstream packages should mount these through
 * @emsenn/producing-content.
 */

// ---------- ask ----------
export { contentProviders, hasProvider, pickProvider, makeAsk } from "./ask.mjs";
export type {
  ContentProviderName, ContentProvider, ContentProviderUsage, ContentAskOptions,
} from "./ask.mjs";

// ---------- demand ----------
export { fetchSearchConsoleDemand, defaultSearchConsoleKeyFile } from "./demand.mjs";
export type {
  DemandAssertion, SearchConsoleDemandOptions,
  SearchConsoleDemandWitness, SearchConsoleDemandObstruction, SearchConsoleDemandJudgment,
} from "./demand.mjs";

// ---------- production ----------
export {
  meetDemandWithSupply, articleSupport,
  gateWitness, gateObstruction,
  productionMove, productionStrategyReading,
  runProductionCycle,
} from "./production.mjs";
export type {
  SupportReading, TermSupportWitness, TermSupportObstruction, TermSupportJudgment,
  DemandSupplyMeet, MeetOptions,
  Ask, GateWitness, GateObstruction, GateJudgment, ProductionGate,
  ProductionMove, ProductionStrategyReading,
  CycleRound, CycleWitness, CycleObstruction, CycleJudgment, CycleOptions,
} from "./production.mjs";
