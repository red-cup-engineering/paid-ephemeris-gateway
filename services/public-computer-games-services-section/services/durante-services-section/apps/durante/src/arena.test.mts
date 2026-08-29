// arena.test.mts — proves twist #1: THE LEVEL IS A MERGE OF TRACES. Two peers' independently-built
// arenas federate (G-Set union, order-independent); agreement settles t, disagreement folds to ⊤ — a
// contested wall that is also a phase gate (collision's passContested reads it as passable). The legacy
// arena.test.mjs this stands in for never existed on disk (port digest §1) — written fresh.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arenaRows, arenaWorld, mergeArena, arenaGrid, contestedWalls, census, FOUR,
} from "./arena.mjs";
import { occupied } from "@red-cup-engineering/abrash/collision";

const ALPHA_SKETCH = ["###", "###", "###"]; // alpha builds a solid center wall too
const BETA_SKETCH = ["###", "#~#", "###"]; // beta carves the SAME center cell open — a real disagreement

test("arenaRows: '#' becomes a solid predication, '.' contributes no row", () => {
  const rows = arenaRows(["#."]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].a, "solid");
  assert.equal(rows[0].e, "voxel:0,0");
});

test("arenaRows: '~' becomes a deny (not-solid) predication — a carved, evidenced opening", () => {
  const rows = arenaRows(["#~"]);
  assert.equal(rows.length, 2);
  const carved = rows.find((r) => r.e === "voxel:1,0");
  assert.equal(carved.a, "not-solid");
});

test("arenaWorld: builds a settled world with no contested cells when read alone", () => {
  const w = arenaWorld(["###", "#.#", "###"]);
  const ds = contestedWalls(w);
  assert.equal(ds.length, 0);
});

test("mergeArena: two peers who lay the SAME wall agree — the merged cell reads t, not contested", () => {
  const a = arenaWorld(["###"]);
  const b = arenaWorld(["###"]);
  const merged = mergeArena(a, b);
  assert.equal(contestedWalls(merged).length, 0);
  const g = arenaGrid(merged);
  assert.equal(g.at(0, 0).charge, FOUR.T);
});

test("mergeArena: THE TWIST — one peer's wall vs. the other's carve at the SAME cell folds to ⊤", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const merged = mergeArena(alpha, beta);
  const ds = contestedWalls(merged);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].x, 1);
  assert.equal(ds[0].z, 1);
});

test("mergeArena: is order-independent — mergeArena(a,b) and mergeArena(b,a) contest the same cell", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const ab = contestedWalls(mergeArena(alpha, beta));
  const ba = contestedWalls(mergeArena(beta, alpha));
  assert.deepEqual(ab.map((d) => d.subject), ba.map((d) => d.subject));
});

test("contestedWalls: THE PHASE GATE — a contested cell is passable under passContested (durante's default)", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const merged = mergeArena(alpha, beta);
  const g = arenaGrid(merged, { passContested: true });
  assert.equal(occupied(g, 1.5, 1.5, 0.2, { passContested: true }), false);
});

test("contestedWalls: WITHOUT passContested, the same contested cell still blocks (the default hold)", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const merged = mergeArena(alpha, beta);
  const g = arenaGrid(merged);
  assert.equal(occupied(g, 1.5, 1.5, 0.2, {}), true);
});

test("contestedWalls: each entry carries both witnesses (evidence linear — nobody erased)", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const ds = contestedWalls(mergeArena(alpha, beta));
  assert.ok(ds[0].witnesses.evidence[0].length >= 1); // affirm witness ids
  assert.ok(ds[0].witnesses.evidence[1].length >= 1); // deny witness ids
});

test("census: tallies t/f/top counts across the merged arena", () => {
  const alpha = arenaWorld(ALPHA_SKETCH, "alpha");
  const beta = arenaWorld(BETA_SKETCH, "beta");
  const c = census(mergeArena(alpha, beta));
  assert.equal(c.top, 1);
  assert.ok(c.t >= 7); // the 8 perimeter walls minus the one contested center
});
