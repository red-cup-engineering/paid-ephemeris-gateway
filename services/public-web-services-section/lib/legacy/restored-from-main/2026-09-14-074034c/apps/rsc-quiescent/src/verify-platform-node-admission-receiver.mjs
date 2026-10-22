#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import CONFIG from "../content/config/platform-node-admission-receiver.json" with { type: "json" };
import SCHEMA from "../lib/schemas/platform-node-admission-receiver.schema.json" with { type: "json" };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
assert.equal(ajv.validate(SCHEMA, CONFIG), true, ajv.errorsText());
assert.equal(CONFIG.enabled, false);
for (const key of ["admittedProviderLaw", "contract", "allocationId", "customer", "nodeId", "authorizationAdmission", "authorizationEvidenceDigest", "workingRoot", "witnessJournal"]) {
  assert.equal(CONFIG[key], null, `checked-in ${key} must remain null`);
}
assert.equal(CONFIG.meshAuthorityRoot, "/home/emsenn/info");
assert.equal(CONFIG.receiverRoot, ROOT);
assert.deepEqual(CONFIG.ceilings, { maximumFiles: 16, maximumBytes: 524288, maximumRuntimeMs: 120000 });
assert.deepEqual(CONFIG.publication, { createOnly: true, overwrite: false, externalNetwork: false, credentials: false, externalSettlement: false });
assert.equal(existsSync(resolve(CONFIG.admittedParent, "blockchain-trashpanda")), false, "verification must not create the future target");

const nativeSource = readFileSync(resolve(ROOT, "native", "rename_noreplace.c"), "utf8");
assert.match(nativeSource, /SYS_renameat2/u);
assert.match(nativeSource, /RENAME_NOREPLACE/u);
const receiverSource = readFileSync(resolve(ROOT, "src", "platform-node-admission-receiver.mjs"), "utf8");
for (const token of ["admitEnterpriseInstall", "revalidateEnterpriseInstall", "expectedIdempotencyKey", "operationHistory", "actualManifestExact", "linkSync", "deepFreeze", "monotonicElapsedMs"]) assert.match(receiverSource, new RegExp(token, "u"));

const projector = resolve(ROOT, "../../../board-of-directors/services/executive-office/lib/management/skills/project-a-skill.js");
const source = resolve(ROOT, "../../../board-of-directors/services/executive-office/lib/management/skills/mesh-scope.js");
const executiveOffice = resolve(ROOT, "../../../board-of-directors/services/executive-office");
const projection = spawnSync(process.execPath, [projector, source, "--target", resolve(ROOT, "lib/management/skills"), "--from", executiveOffice, "--check"], { encoding: "utf8" });
assert.equal(projection.status, 0, projection.stderr || projection.stdout);

process.stdout.write(`${JSON.stringify({ ok: true, enabled: false, targetCreated: false })}\n`);
