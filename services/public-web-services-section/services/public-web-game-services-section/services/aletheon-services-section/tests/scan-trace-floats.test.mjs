// scan-trace-floats — tests for the read-only float-safety detector (scripts/scan-trace-floats.mjs).
// This is the migration-precondition check: @red-cup-engineering/eavt@0.4.0's appendEavt refuses
// (via cbor-codec-service's encodeCanonical) any row carrying a non-safe-integer number. These
// tests never touch a real WORLD_LOG; every fixture below is synthetic, built in a tmpdir or held
// in memory, using row SHAPES taken from the real writers (store.mjs's spawn/mint, ticking.mjs's
// "moved") so the detector is exercised against realistic content, not invented content.

import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { scanTrace } from "../scripts/scan-trace-floats.mjs";
import { gradePosition } from "../shared/worldgen.mjs";

async function tmpTracePath() {
  const dir = await mkdtemp(join(tmpdir(), "aletheon-scan-floats-"));
  return { dir, path: join(dir, "trace.jsonl") };
}

test("scanTrace: an all-safe-integer trace verdicts SAFE with zero float rows", () => {
  const rows = [
    { e: "player-1", a: "spawned", v: { kind: "player", name: "p", x: 10, z: -20, maxHp: 100, hostile: false }, t: 1 },
    { e: "player-1", a: "vitality", v: { hp: 90, maxHp: 100 }, t: 2 },
    { e: "player-1", a: "left", v: null, t: 3 },
  ];
  const text = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  const report = scanTrace(text);
  assert.equal(report.verdict, "SAFE");
  assert.equal(report.parsedRows, 3);
  assert.equal(report.floatRows.length, 0);
  assert.equal(report.floatOccurrences, 0);
  assert.equal(report.unparseableLines.length, 0);
});

test("scanTrace: a 'spawned' row carrying real gradePosition() coordinates is BLOCKED", () => {
  // gradePosition (shared/worldgen.mjs) is exactly what store.spawn()/seedAltars() feed into a
  // "spawned" row's v.x/v.z — real world-generation coordinates, not synthetic decimals.
  const p1 = gradePosition(1, 1, 5); // grade 1, a non-degenerate ring: irrational-looking x/y/z
  const row = { e: "critter-1", a: "spawned", v: { kind: "critter", name: "critter", x: p1.x, z: p1.z, maxHp: 10, hostile: false }, t: 1 };
  assert.equal(Number.isSafeInteger(p1.x), false, "test setup: gradePosition(1,1,5).x must actually be a non-safe-integer float");

  const text = JSON.stringify(row) + "\n";
  const report = scanTrace(text);
  assert.equal(report.verdict, "BLOCKED");
  assert.equal(report.floatRows.length, 1);
  const found = report.floatRows[0];
  assert.equal(found.a, "spawned");
  const paths = found.floats.map((f) => f.path).sort();
  assert.deepEqual(paths, ["v.x", "v.z"]);
});

test("scanTrace: a 'moved' row carrying round2()-quantized coordinates is still BLOCKED", () => {
  // ticking.mjs's own "moved" rows quantize with round2/round3 (Math.round(n*100)/100 style) —
  // this still produces ordinary non-integer decimals (e.g. 12.35), not safe integers.
  const round2 = (n) => Math.round(n * 100) / 100;
  const row = { e: "player-1", a: "moved", v: { x: round2(12.3456), y: round2(0.5), z: round2(-7.891), yaw: round2(1.5707) }, t: 5 };
  assert.equal(Number.isSafeInteger(row.v.x), false, "test setup: round2(12.3456) must be a non-safe-integer float");

  const text = JSON.stringify(row) + "\n";
  const report = scanTrace(text);
  assert.equal(report.verdict, "BLOCKED");
  assert.equal(report.floatRows.length, 1);
  assert.equal(report.floatOccurrences, 4); // x, y, z, yaw are all fractional
});

test("scanTrace: blank lines are skipped silently; malformed lines are counted and reported (not silenced)", () => {
  const good = JSON.stringify({ e: "a", a: "left", v: null, t: 1 });
  const text = [good, "", "   ", "{not json", JSON.stringify({ e: "b", a: "x", v: 1 }) /* missing t */, ""].join("\n");
  const report = scanTrace(text);
  assert.equal(report.parsedRows, 1);
  assert.equal(report.blankLines, 3); // two blank lines in the middle + the trailing split segment
  assert.equal(report.unparseableLines.length, 2);
  assert.equal(report.verdict, "SAFE");
});

test("scanTrace: a torn/partial final line is reported as unparseable, not silently dropped", async () => {
  const { dir, path } = await tmpTracePath();
  try {
    const good = JSON.stringify({ e: "a", a: "left", v: null, t: 1 });
    const torn = '{"e":"b","a":"moved","v":{"x":1.5}'; // no closing brace — simulates a crash mid-write
    await writeFile(path, good + "\n" + torn, "utf8");

    const { readFlatfileText } = await import("@red-cup-engineering/flatfile");
    const report = scanTrace(readFlatfileText(path));
    assert.equal(report.parsedRows, 1);
    assert.equal(report.unparseableLines.length, 1);
    assert.equal(report.unparseableLines[0].line, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
