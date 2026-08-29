/** Farstone's current data-defined game and explicit capability runtime. */
export { FARSTONE_GAME, FARSTONE_RUNTIME, HARBOR_BIBLE, gameFromBible } from "./farstone-game.mts";
export { farstoneClimateCapability, farstoneClimateReport } from "./farstone-climate.mts";
export { farstoneArcCapability } from "./farstone-arcs.mts";
export { farstoneDirectorCapability, demandFor, roleDemandFor } from "./director.mts";
export { farstoneDepthsCapability, DEFAULT_RESPAWN, homeOf } from "./depths.mts";
export { farstoneProgressionCapability } from "./farstone-progression.mts";
export { OFF_SEASON, offSeasonStage, settleOffSeason } from "./campaign.mts";
export { THOUGHTS } from "./thoughts.mts";
export { FACTIONS, GATHER_VERBS, LAWS, PROFESSIONS, RECIPES, RESOURCES, SHIP_CLASSES, SOULS, STRUCTURES, TITLES, WARES } from "./catalogs.mts";

/** The qwzspace push transport: WS room seam, perception frame, and wire protocol. */
export { perceptionFrame, perceptionSnapEntry, farstoneAffordances, PERCEPTION_KIND } from "./farstone-perception.mts";
export { gameValidate, PROTOCOL_VERSION } from "./farstone-protocol.mts";
export { createFarstoneRoom, createFarstoneWorldFactory, farstoneInterestFor } from "./farstone-room.mts";
