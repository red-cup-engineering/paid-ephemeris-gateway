/**
 * `@emsenn/content-production/computer` — the content domain's computing,
 * folded in from the former @emsenn/content-computer app.
 *
 * The general computing over @emsenn/content's carriers, in three
 * groups:
 *
 * - demand — Search Console demand intake: the I/O binding over
 *   @emsenn/content-codecs' search-console codec, returning
 *   witness-or-obstruction carriers with injectable fetch and clock.
 * - ask — a prompt-to-text morphism over OpenAI-compatible endpoints
 *   (nim is the default-capable provider; groq only for small prompts).
 * - production — demand meets supply (assignment only where intake
 *   support exists) and the draft → judge → revise cycle, taking ask and
 *   gates as values and returning witness-or-obstruction carriers.
 *
 * Pure: performs no I/O it was not handed. A generic server binds these to
 * transports when a site wants them; the `demand-pull` script is the runnable
 * edge. Syndication-format parsing lives in @emsenn/content/syndication.
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
