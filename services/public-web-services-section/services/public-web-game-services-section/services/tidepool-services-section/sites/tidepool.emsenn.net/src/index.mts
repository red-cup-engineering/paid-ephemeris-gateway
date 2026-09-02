// index — Tidepool's public surface, for anything that wants to embed it rather than shell out
// to `serve.mts`.

export { TIDEPOOL_GAME, TIDEPOOL_CAPABILITY_IDS, START_ROOM, WARES, UNDERWATER_ROOMS, HARVEST_CELLS, HARVEST_WARE_OF, DIVE_ROOM, DIVE_DESTINATION, MARKET_ROOM, BUILD_ROOM } from "./tidepool-game.mts";
export { TIDEPOOL_RUNTIME } from "./tidepool-capabilities.mts";
export { perceptionFrame, perceptionSnapEntry, tidepoolAffordances, PERCEPTION_KIND } from "./perception.mts";
export { gameValidate, PROTOCOL_VERSION } from "./tidepool-protocol.mts";
export { createTidepoolRoom, createTidepoolWorldFactory, tidepoolInterestFor } from "./tidepool-room.mts";
export { renderTidepoolPage, tidepoolStaticFiles } from "./tidepool-tufte.mts";
// Persistence/runtime primitives live once in world-hosting now (world-host-runtime note,
// 2026-09-01) — re-exported here so an embedder still gets the whole public surface from one import.
export { createWorldRuntime, WorldRuntime } from "@red-cup-engineering/world-hosting/world-runtime";
export { openWorldStore, resolveWorldBackend } from "@red-cup-engineering/world-hosting/world-store";
export { openClockStore } from "@red-cup-engineering/world-hosting/clock-store";
