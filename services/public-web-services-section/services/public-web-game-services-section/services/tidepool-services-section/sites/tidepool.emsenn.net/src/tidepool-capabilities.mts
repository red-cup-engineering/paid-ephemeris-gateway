// tidepool-capabilities — the one runtime every engine.mjs `step()` call is handed: feltos's
// own built-in `ecologyCapability` (fish/mussel/clam logistic regrowth) and
// `worldClockCapability` (tide/weather/season/dry-streak advancement) composed alongside
// Tidepool's seven `tidepool.*` capabilities, via `composeCapabilities` — never modifying the
// kernel, per capabilities.mjs's own contract. `TIDEPOOL_GAME.capabilities`
// (tidepool-game.mts) must list every id here, or its `onTick` never fires (see that file's
// own comment on this).

import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { ecologyCapability } from "@red-cup-engineering/feltos/ecology";
import { worldClockCapability } from "@red-cup-engineering/feltos/world-clock";
import { tendCapability, harvestCapability } from "./cap-ecology.mts";
import { buildCapability } from "./cap-economy.mts";
import { tideCapability } from "./cap-tide.mts";
import { signalCapability } from "./cap-social.mts";
import { discourseCapability } from "./cap-discourse.mts";
import { governanceCapability } from "./cap-governance.mts";

export const TIDEPOOL_RUNTIME = composeCapabilities([
  ecologyCapability,
  worldClockCapability,
  tendCapability,
  harvestCapability,
  buildCapability,
  tideCapability,
  signalCapability,
  discourseCapability,
  governanceCapability,
]);
