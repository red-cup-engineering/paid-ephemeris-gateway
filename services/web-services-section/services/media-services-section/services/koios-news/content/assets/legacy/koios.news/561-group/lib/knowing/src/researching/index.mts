/**
 * researching — research : Memory → SettledResearch, and its nested derivatives.
 *
 * Each verb is a morphism: a function from a domain carrier to a codomain carrier,
 * the codomain of each being the domain of the next, physically nested like the
 * memory proof tree and lib/relating-experimental's articulating→…→settling:
 *
 *   research    : Memory → SettledResearch          (./researching)
 *   ├ knowing    : SettledResearch → Knowledge       (./knowing)
 *   └ introducing : SettledResearch → AgentCell      (./introducing)        becoming
 *     └ studying  : AgentCell → AgentSite            (.../studying)         doing
 *       ├ explaining : AgentSite → Explanation       (.../explaining)
 *       └ learning   : AgentSite → AgentLearning     (.../learning)
 *         ├ teaching : AgentLearning → Curriculum    (.../teaching)
 *         └ tutoring : AgentLearning → NextStep      (.../tutoring)
 */
export { research, certified, type SettledResearch } from "./researching.mjs";
export { researchAction, learningAction, curriculumAction, researchActions } from "./actions.mjs";
export * from "./knowing/index.mjs";
export * from "./introducing/index.mjs";
