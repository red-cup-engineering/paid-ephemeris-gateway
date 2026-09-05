// manifest — BNSF's `CartridgeManifest` (per `@red-cup-engineering/cartridge/manifest`), the house
// shape durante's own `src/manifest.mjs` and gambling-trainer-service's `src/manifest.mts` both use:
// a standalone module importing its game's own cartridge, never the reverse.
//
// seedPolicy.kind: "client-supplied", stated honestly rather than claiming "daily-utc" — cartridge's
// `dailySeed(gameId, date, configId)` IS wired (web/js/main.mjs defaults a fresh session's seed to
// exactly that, so every player who doesn't override it gets the same seed on the same UTC day, real
// "daily" behavior for a solo player) but there is NO server-side replay-verifying leaderboard backend
// standing behind it yet — durante's own "daily-utc" claim is backed by a real `POST /runs` route that
// replay-verifies every submission server-side before ranking it; BNSF v1 has no such route. Declaring
// "daily-utc" here without that backend would be exactly the kind of overclaim the design's own
// Carrier-Audit posture exists to catch. "Client-supplied" is what v1 actually, honestly is: the
// browser computes a seed (defaulting to today's dailySeed, overridable via `?seed=`) and hands it to
// `createEngine` like any other client-supplied string — a real seeded-dailies mechanism, "for
// leaderboard compatibility LATER" exactly as the design phrases it, not a live leaderboard today.
//
// replayVerifier: "src/manifest.mts#verify" — matching durante's own manifest convention exactly (a
// module-path#exportName string, never a bare function reference a manifest can't serialize).

import { assertManifest } from "@red-cup-engineering/cartridge/manifest";
import { createVerifier } from "@red-cup-engineering/cartridge/replay";
import { createEngine, applyIntent } from "./cartridge.mts";

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest = assertManifest({
  id: "be-not-so-fearful",
  displayName: "Be Not So Fearful",
  description:
    "A backrooms/SCP-inspired extraction shooter on @red-cup-engineering/abrash: OG-Wolfenstein-grade " +
    "raycast graphics, Quake-grade momentum physics (a BNSF-owned kernel composing abrash's real " +
    "collision.move — bunnyhop speed gain, rocket-jump verticality, both numerically tested) over " +
    "seeded backrooms-liminal levels whose contested (⊤) walls — abrash's own held-contradiction " +
    "mechanic — shiver as the dread signal. Four anomalies, each a learnable, tested behavior contract " +
    "(watched vs unwatched, sound through walls, territory, an unconditional toll). Loot is banked " +
    "only on an explicit extraction at a beacon; unbanked loot is simply never counted on death — " +
    "what you carry is what you can lose.",
  subdomain: "fearful",
  entryPoints: {
    browser: "/",
    headless: "src/cartridge.mts",
  },
  seedPolicy: { kind: "client-supplied" },
  intentLog: {
    schemaVersion: "bnsf-run/1",
  },
  replayVerifier: "src/manifest.mts#verify",
  keywords: [
    "game", "fps", "extraction-shooter", "backrooms", "scp", "quake-like", "raycaster", "momentum",
    "bunnyhop", "rocket-jump", "561-group", "browser", "federation", "paraconsistent", "bilattice",
  ],
});
