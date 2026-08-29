// manifest.test — the manifest is real, valid CartridgeManifest data (assertManifest already threw
// at import time if not — this test additionally proves `verify` (the `replayVerifier` target) is a
// real, working replay verifier, not just a name in a string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateManifest } from "@red-cup-engineering/cartridge/manifest";
import { appendEntry } from "@red-cup-engineering/cartridge/intent-log";
import { manifest, verify } from "./manifest.mts";

test("manifest: is valid CartridgeManifest data per cartridge's own validator", () => {
  const result = validateManifest(manifest);
  assert.deepStrictEqual(result.errors, []);
  assert.strictEqual(result.valid, true);
});

test("manifest: replayVerifier names exactly this module's own export, matching the house convention", () => {
  assert.strictEqual(manifest.replayVerifier, "src/manifest.mts#verify");
});

test("manifest: verify() actually replay-verifies a real intent log against this game's engine", () => {
  let log: ReturnType<typeof appendEntry> = [];
  log = appendEntry(log, { kind: "tick", forward: 1 });
  log = appendEntry(log, { kind: "tick", forward: 1, turn: 0.02 });
  log = appendEntry(log, { kind: "tick", jump: true });

  const result = verify("manifest-verify-seed", "default", log);
  assert.strictEqual(result.valid, true);
  assert.ok(typeof result.stateHash === "string" && result.stateHash.length === 64, "expected a sha256 hex digest");
});

test("manifest: verify() invalidates a log carrying an unknown intent kind", () => {
  let log: ReturnType<typeof appendEntry> = [];
  log = appendEntry(log, { kind: "tick", forward: 1 });
  log = appendEntry(log, { kind: "not-a-real-intent" });
  const result = verify("manifest-verify-seed-2", "default", log);
  assert.strictEqual(result.valid, false);
});

test("manifest: entryPoints names a real headless module (src/cartridge.mts) an agent can import directly", () => {
  assert.strictEqual(manifest.entryPoints.headless, "src/cartridge.mts");
});
