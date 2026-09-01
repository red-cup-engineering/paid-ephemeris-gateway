/**
 * `kernel` — the browser's (and this directory's tests') single door into the domain engine.
 * Every export here is a straight re-export of `../../src/*.mts` — nothing is reimplemented,
 * ported, or duplicated (stoke-service's own `kernel.mjs` pattern, copied in shape). `web/server.mjs`
 * intercepts any request for a `*.mts` path, strips its types, and serves plain JS, so the browser
 * loads the identical source Node runs directly under `npm test`.
 *
 * No name collisions exist across these modules' exports (checked directly against every module's
 * own export list), so every domain module is re-exported without qualification, including
 * `cartridge.mts`. `cartridge.manifest.mts` is deliberately NOT re-exported — it is the one
 * Node/server-side-only concern (`web/server.mjs` imports it directly for `/api/manifest`) and the
 * browser client never needs it.
 */
export * from "../../src/graph.mts";
export * from "../../src/eigen.mts";
export * from "../../src/tick.mts";
export * from "../../src/provenance.mts";
export * from "../../src/state.mts";
export * from "../../src/tiers.mts";
export * from "../../src/content.mts";
export * from "../../src/attention.mts";
export * from "../../src/exploration.mts";
export * from "../../src/policy.mts";
export * from "../../src/goodhart.mts";
export * from "../../src/calibration.mts";
export * from "../../src/values.mts";
export * from "../../src/reflect.mts";
export * from "../../src/mentorship.mts";
export * from "../../src/intents.mts";
export * from "../../src/cartridge.mts";
