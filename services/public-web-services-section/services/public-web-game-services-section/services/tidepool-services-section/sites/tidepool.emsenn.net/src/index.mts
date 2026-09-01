// index — Tidepool's public surface, for anything that wants to embed it rather than shell out
// to `serve.mts`.

export { TIDEPOOL_GAME, TIDEPOOL_CAPABILITY_IDS, START_ROOM, WARES, UNDERWATER_ROOMS, HARVEST_CELLS, HARVEST_WARE_OF, DIVE_ROOM, DIVE_DESTINATION, MARKET_ROOM, BUILD_ROOM } from "./tidepool-game.mts";
export { TIDEPOOL_RUNTIME } from "./tidepool-capabilities.mts";
export { perceptionFrame, perceptionSnapEntry, tidepoolAffordances, PERCEPTION_KIND } from "./perception.mts";
export { gameValidate, PROTOCOL_VERSION } from "./tidepool-protocol.mts";
export { createTidepoolRoom, createTidepoolWorldFactory, tidepoolInterestFor } from "./tidepool-room.mts";
export { createWorldRuntime, WorldRuntime } from "./tidepool-runtime.mts";
export { openWorldStore, resolveWorldBackend } from "./world-store.mts";
export { openClockStore } from "./clock-store.mts";
