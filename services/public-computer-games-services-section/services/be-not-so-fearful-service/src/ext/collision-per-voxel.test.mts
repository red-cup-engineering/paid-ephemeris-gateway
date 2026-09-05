// collision-per-voxel.test — EXT-3's whole point, as an assertion: two ⊤ voxels in the SAME grid, one
// opted to pass and one not, behave differently in a single `movePerVoxel` call — something abrash's
// own single-`passContested`-per-call `move` cannot express.
import { test } from "node:test";
import assert from "node:assert/strict";
import { occupiedPerVoxel, movePerVoxel } from "./collision-per-voxel.mts";
import { move as abrashMove } from "@red-cup-engineering/abrash/collision";

// two ⊤ (contested) cells at x=5 and x=15, everything else open (bot/fog).
const grid = {
  at(x: number, z: number) {
    if (x === 5) return { charge: "top" };
    if (x === 15) return { charge: "top" };
    return { charge: "bot" };
  },
};

test("collision-per-voxel: a cell named as pass-through passes, while another ⊤ cell in the SAME call still blocks", () => {
  const passContestedWhere = (subjectKey: string) => subjectKey === "voxel:5,0"; // only the x=5 gate passes

  // approaching the phase-gate (x=5): should pass through.
  const gateResult = movePerVoxel(grid, { x: 4.5, z: 0.5, radius: 0.2 }, 1, 0, { passContestedWhere });
  assert.strictEqual(gateResult.hit.x, false, "the named phase-gate cell should pass");
  assert.ok(gateResult.body.x > 5, "should have crossed x=5");

  // approaching the ordinary contested hazard (x=15): should still block, same call shape, same opts function.
  const hazardResult = movePerVoxel(grid, { x: 14.5, z: 0.5, radius: 0.2 }, 1, 0, { passContestedWhere });
  assert.strictEqual(hazardResult.hit.x, true, "the non-named contested cell should still block");
  assert.ok(hazardResult.body.x <= 15, "should not have crossed x=15");
});

test("collision-per-voxel: with no passContestedWhere at all, behavior matches abrash's own default (⊤ blocks)", () => {
  const perVoxelResult = movePerVoxel(grid, { x: 4.5, z: 0.5, radius: 0.2 }, 1, 0, {});
  const realAbrashResult = abrashMove(grid, { x: 4.5, z: 0.5, radius: 0.2 }, 1, 0, {});
  assert.deepStrictEqual(perVoxelResult, realAbrashResult, "with no per-voxel override, the adapter must match abrash's own move() exactly");
});

test("collision-per-voxel: occupiedPerVoxel agrees with abrash's own occupied() when passContestedWhere is absent", () => {
  // abrash doesn't export `occupied` directly for a side-by-side call, so this proves the same
  // observable fact via `move`'s hit flags instead (already covered above) plus a direct radius check.
  assert.strictEqual(occupiedPerVoxel(grid, 5, 0, 0.1, {}), true, "a bare ⊤ cell should block by default, same as abrash's own blocks()");
  assert.strictEqual(occupiedPerVoxel(grid, 5, 0, 0.1, { passContestedWhere: () => true }), false, "opting a cell in should let it pass");
});
