// manifest — durante's `CartridgeManifest` (per `@red-cup-engineering/cartridge/manifest`), the open item the
// port digest flagged: "src/cartridge.mjs exists but unwired... zero callers... confirms the task's
// 'unwired' framing exactly." This module is that wiring — the exact house shape gambling-trainer-
// service's src/manifest.mts and parlor-service's per-game manifest.mts files already use: a
// standalone manifest module that imports its game's own `cartridge.mjs`, never the reverse (a
// manifest describes a cartridge; a cartridge does not need to know its own manifest exists to run).
//
// seedPolicy.kind: "daily-utc" — the daily QUAKE tournament's actual policy (spec §2.1-§2.2): the
// UTC calendar date IS the seed source (daily.mjs#dailySeed), never a client-supplied string. This is
// the open item's other half: durante's ORIGINAL createEngine(seed, configId) still exists, unchanged,
// for the fixed-arena/proving-ground path the existing determinism tests exercise — but the manifest
// this app now PUBLISHES describes the daily-tournament entry point (createDailyEngine), matching what
// server.mjs's `GET /daily`/`POST /runs` routes actually serve.
//
// replayVerifier: 'src/manifest.mjs#verify' — matching gambling-trainer-service's own manifest.mts
// convention exactly (a module-path#exportName string a settlement backend resolves generically,
// never a bare function reference a manifest can't serialize).

import { assertManifest } from "@red-cup-engineering/cartridge/manifest";
import { createVerifier } from "@red-cup-engineering/cartridge/replay";
import { applyIntent, createDailyEngine } from "./cartridge.mjs";

// verify — durante's daily-tournament replay verifier: cartridge's own createVerifier, built from
// createDailyEngine (the seed-policy-correct engine constructor for this manifest) + applyIntent. This
// is deliberately NOT cartridge.mjs's own `verify` export (which is built on createEngine's FIXED
// BLOOD_MERGE_ROWS arena, for the proving-ground/determinism-test path) — a replay verifier resolved
// off THIS manifest must rebuild the arena the daily route actually served, not the shipped fixture.
// (createVerifier's `seed` parameter is threaded straight to createEngine's first argument by its own
// contract; here that parameter position carries the "YYYY-MM-DD" date string createDailyEngine
// expects — a documented, deliberate reuse of the position, not a same-typed coincidence, matching how
// gambling-trainer-service's own manifest module wires wager configs through the identical seam.)
export const verify = createVerifier({ createEngine: (date) => createDailyEngine(date), applyIntent });

export const manifest = assertManifest({
  id: "durante",
  displayName: "durante",
  description:
    "A QUAKE-like first-person shooter on @red-cup-engineering/abrash whose arena is the federated " +
    "merge of two traces (a contested wall is a phase gate), whose weapon's effect is evidence you " +
    "fold, and whose demon is held alive-AND-dead between your first wound and the kill. The daily " +
    "tournament seeds one arena per UTC day (daily.mjs#dailySeed) that AI and human players both " +
    "reach through the same intent-log submission route — peers by construction, labeled honestly.",
  subdomain: "durante",
  entryPoints: {
    browser: "/",
    headless: "scripts/durante-terminal.mjs",
  },
  seedPolicy: { kind: "daily-utc" },
  intentLog: {
    schemaVersion: "durante-run/1",
    schemaRef: "src/run-recorder.mjs#encodeRun",
  },
  replayVerifier: "src/manifest.mjs#verify",
  keywords: [
    "game", "fps", "quake-like", "first-person-shooter", "raycaster", "pixel", "federation",
    "paraconsistent", "bilattice", "held-contradiction", "561-group", "browser", "daily-tournament",
  ],
});
