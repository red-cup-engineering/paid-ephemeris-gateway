import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { migrateYanagiRecovery } from "../scripts/migrate-yanagi-recovery.mjs";

const MNEMONIC = "test test test test test test test test test test test junk";
const ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "yanagi-recovery-migration-"));
  const envPath = join(root, ".env");
  const credentialRoot = join(root, "credentials");
  const evidencePath = join(root, "data", "evidence.json");
  writeFileSync(envPath, `OTHER=value\nYANAGI_WALLET=${MNEMONIC}\n`, { mode: 0o600 });
  mkdirSync(credentialRoot, { mode: 0o700 });
  return { root, envPath, credentialRoot, evidencePath };
}

test("verifies, encrypts, reopens, and only then retires the plaintext mnemonic", async () => {
  const paths = fixture();
  const receipt = await migrateYanagiRecovery({ ...paths, expectedAddress: ADDRESS, now: () => "2026-07-22T20:00:00.000Z" });
  assert.equal(receipt.recoveryIdentity, `eip155:8453:${ADDRESS}`);
  assert.equal(receipt.plaintextSourceRetired, true);
  assert.equal(receipt.runtimeUseAuthorized, false);
  assert.equal(Object.hasOwn(receipt, "mnemonic"), false);
  assert.equal(Object.hasOwn(receipt, "privateKey"), false);
  assert.doesNotMatch(readFileSync(paths.envPath, "utf8"), /test test|YANAGI_WALLET=/u);
  assert.match(readFileSync(paths.envPath, "utf8"), /YANAGI_WALLET retired/u);
  assert.equal(JSON.parse(readFileSync(paths.evidencePath, "utf8")).keystoreSha256, receipt.keystoreSha256);
});

test("bad expected identity leaves the plaintext source and creates no migration evidence", async () => {
  const paths = fixture();
  await assert.rejects(migrateYanagiRecovery({ ...paths, expectedAddress: "0x1111111111111111111111111111111111111111" }), /exact admitted recovery address/u);
  assert.match(readFileSync(paths.envPath, "utf8"), /YANAGI_WALLET=test test/u);
  assert.equal(existsSync(paths.evidencePath), false);
});
