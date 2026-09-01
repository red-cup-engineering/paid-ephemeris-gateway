// manifest.test.mts — proves durante's CartridgeManifest is well-formed per @red-cup-engineering/cartridge/
// manifest's own validator, wires the daily-utc seed policy the task's open item asked for, and that
// its replayVerifier (built on createDailyEngine, not the fixed-arena createEngine) actually replays a
// daily consistently.

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateManifest } from "@red-cup-engineering/cartridge/manifest";
import { manifest, verify } from "./manifest.mjs";
import { buildIntentLog } from "./cartridge.mjs";

test("durante's manifest validates clean against @red-cup-engineering/cartridge/manifest's own schema", () => {
  const result = validateManifest(manifest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("manifest.seedPolicy is daily-utc — the daily tournament's actual seed source (spec's open item)", () => {
  assert.deepEqual(manifest.seedPolicy, { kind: "daily-utc" });
});

test("manifest.replayVerifier names this module's own verify export", () => {
  assert.equal(manifest.replayVerifier, "src/manifest.mjs#verify");
});

test("manifest.entryPoints names both faces (browser + headless terminal)", () => {
  assert.equal(manifest.entryPoints.browser, "/");
  assert.equal(manifest.entryPoints.headless, "scripts/durante-terminal.mjs");
});

test("verify(date, configId, intentLog) replays against createDailyEngine's arena, deterministically", () => {
  const log = buildIntentLog([{ forward: 1 }, { turn: 0.2 }, { forward: 1 }]);
  const a = verify("2026-08-19", "daily", log);
  const b = verify("2026-08-19", "daily", log);
  assert.equal(a.valid, true);
  assert.equal(a.stateHash, b.stateHash);
});

test("verify against two different dates diverges (the daily's own arena, not the fixed one)", () => {
  const log = buildIntentLog([{ forward: 1 }]);
  const a = verify("2026-08-19", "daily", log);
  const b = verify("2026-08-20", "daily", log);
  assert.notEqual(a.stateHash, b.stateHash);
});
