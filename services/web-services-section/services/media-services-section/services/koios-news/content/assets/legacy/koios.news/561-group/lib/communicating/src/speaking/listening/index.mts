/**
 * @emsenn/communicating/speaking/listening — listened communication.
 *
 * This is the normative listening spine: admission, articulation, parsing,
 * grounding, understanding, grammatical judgment, codecs, geometry, and the
 * language algebra (the fiber over which a chosen bundle is read). Language
 * bundles, realization, and prose conformance live in `communicating-in-<lang>`
 * packages downstream of this base.
 */

export * from "./parsing/index.mjs";
export * from "./grounding/index.mjs";
export * from "./understanding/index.mjs";
export * from "./judging/grammaticality/index.mjs";
export * from "./codecs/index.mjs";
export * from "./geometry/index.mjs";
export * from "./algebra/index.mjs";
export type { Charge } from "./parsing/index.mjs";
export type { ChargeStatus } from "./algebra/index.mjs";
