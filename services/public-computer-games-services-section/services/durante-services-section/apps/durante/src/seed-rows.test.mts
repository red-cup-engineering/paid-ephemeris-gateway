// seed-rows.test.mts — proves seed-rows.mjs's BLOOD_MERGE_ROWS (the pure-JS, no-I/O copy) is
// byte-for-byte the same content as world/blood-merge.jsonl (the on-disk canonical seed asset the port
// digest asked be kept verbatim), so the two can never silently drift apart.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BLOOD_MERGE_ROWS } from "./seed-rows.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(HERE, "..", "world", "blood-merge.jsonl");

test("BLOOD_MERGE_ROWS matches world/blood-merge.jsonl row for row", () => {
  const text = readFileSync(SEED_PATH, "utf8").trim();
  const fileRows = text.split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(BLOOD_MERGE_ROWS, fileRows);
});

test("BLOOD_MERGE_ROWS: contains the contested phase-gate voxel (both solid and not-solid on voxel:4,4)", () => {
  const solid = BLOOD_MERGE_ROWS.filter((r) => r.e === "voxel:4,4" && r.a === "solid");
  const notSolid = BLOOD_MERGE_ROWS.filter((r) => r.e === "voxel:4,4" && r.a === "not-solid");
  assert.equal(solid.length, 1);
  assert.equal(notSolid.length, 1);
});

test("BLOOD_MERGE_ROWS: spawns exactly two demons", () => {
  const spawns = BLOOD_MERGE_ROWS.filter((r) => r.a === "alive");
  assert.equal(spawns.length, 2);
  assert.deepEqual(spawns.map((r) => r.e).sort(), ["demon:0", "demon:1"]);
});
