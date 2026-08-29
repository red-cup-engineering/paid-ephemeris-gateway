// terminal-ascii.test.mts — the headless proof for durante's TERMINAL FACE: drives a real game
// session (the same BLOOD_MERGE_ROWS seed, the same game()/tick() the browser face and
// scripts/durante-terminal.mjs both use) through a SCRIPTED, deterministic intent log — no stdin, no TTY,
// no PixelScreen — and asserts the ASCII-fallback frames actually change appropriately as the player
// walks: distinct frames render at distinct positions, the wall census stays sane across every frame,
// and the daleske-framebuffer adapter carries the exact same pixels the ASCII path reads.

import { test } from "node:test";
import assert from "node:assert/strict";
import { worldFromRows } from "@red-cup-engineering/abrash/world";
import { game, tick, status } from "./game.mjs";
import { BLOOD_MERGE_ROWS } from "./seed-rows.mjs";
import { frameToAscii, toDaleskeFramebuffer } from "./terminal-ascii.mjs";

// the same deterministic walk ring the legacy abrash bin used for its own headless proof (see
// lib/legacy/.../apps/tools/abrash/scripts/abrash.mjs's intentAt) — a turn-then-walk sweep, replay-
// identical because it is a fixed array, never Math.random.
const RING = [
  { turn: 0.5 }, { turn: 0.5 }, { forward: 1 }, { forward: 1 },
  { turn: -0.3 }, { forward: 1 }, { strafe: 1 }, { turn: -0.4 },
];

function newGame() {
  const world = worldFromRows(BLOOD_MERGE_ROWS);
  return game({
    world,
    player: { x: 7.5, z: 2.5, angle: Math.PI / 2 },
    demons: [{ id: 0 }, { id: 1 }],
    cam: { fov: Math.PI / 3, maxDist: 24 },
  });
}

function walk(n, { width = 168, height = 96, cols = 56, rows = 22 } = {}) {
  let state = newGame();
  const frames = [];
  for (let i = 0; i < n; i++) {
    state = tick(state, RING[i % RING.length], { width, height });
    frames.push({
      ascii: frameToAscii(state.frame.fb, cols, rows),
      player: { ...state.player },
      census: status(state).arena,
    });
  }
  return frames;
}

test("scripted walk: consecutive ASCII frames change as the player actually moves", () => {
  const frames = walk(8);
  const distinct = new Set(frames.map((f) => f.ascii));
  // the ring mixes turns, forwards, and a strafe — at least most ticks visibly move the camera, so
  // the ASCII fallback must show more than one distinct frame (a static "nothing changed" screen
  // would be a hookup bug, not a rendering nuance).
  assert.ok(distinct.size >= 5, `expected several distinct ASCII frames across 8 scripted ticks, got ${distinct.size}`);
});

test("scripted walk: the player's position/angle actually advances tick over tick (not a frozen loop)", () => {
  const frames = walk(8);
  const positions = frames.map((f) => `${f.player.x.toFixed(3)},${f.player.z.toFixed(3)},${f.player.angle.toFixed(3)}`);
  assert.ok(new Set(positions).size > 1, "the player's (x,z,angle) changes across the scripted walk");
  // frame 0's player state must differ from the LAST frame's — the walk actually went somewhere over
  // 8 ticks of turn+forward+strafe, not immediately blocked back to its start.
  assert.notDeepEqual(frames[0].player, frames[frames.length - 1].player);
});

test("scripted walk: the ASCII frame at each tick is a deterministic pure function of that tick's state (replay-identical)", () => {
  const a = walk(8);
  const b = walk(8); // an entirely fresh game(), same seed, same scripted intents
  assert.deepEqual(a.map((f) => f.ascii), b.map((f) => f.ascii), "two independent walks over the identical seed + intent log render byte-identical ASCII frames");
});

test("scripted walk: the wall census (t/f/⊤ counts) is stable — walking doesn't spuriously mutate the arena", () => {
  const frames = walk(8);
  for (const f of frames) {
    assert.equal(f.census.t, 36, "36 settled wall voxels throughout (BLOOD_MERGE_ROWS's own count)");
    assert.equal(f.census.top, 1, "exactly the one contested phase-gate wall (voxel:4,4) throughout");
  }
});

test("frameToAscii renders a non-blank scene: at least one wall glyph and at least one floor/fog glyph appear", () => {
  const frames = walk(1);
  const ascii = frames[0].ascii;
  assert.ok(ascii.includes("#") || ascii.includes("%"), "at least one wall cell (settled or contested) is visible");
  assert.ok(/[.\s]/.test(ascii), "at least one floor/fog/sky cell is visible");
});

test("toDaleskeFramebuffer: the adapted framebuffer carries the EXACT same pixels as the source abrash frame", () => {
  const world = worldFromRows(BLOOD_MERGE_ROWS);
  let state = game({ world, player: { x: 7.5, z: 2.5, angle: Math.PI / 2 }, demons: [{ id: 0 }, { id: 1 }], cam: { fov: Math.PI / 3, maxDist: 24 } });
  state = tick(state, { forward: 1 }, { width: 40, height: 24 });
  const src = state.frame.fb;
  const dst = toDaleskeFramebuffer(src);
  assert.equal(dst.width, src.width, "adapted width matches");
  assert.equal(dst.height, src.height, "adapted height matches");
  assert.deepEqual(Array.from(dst.data), Array.from(src.data), "adapted RGBA bytes are byte-identical to the source");
  // and the adapted framebuffer is a REAL daleske Framebuffer — it has the tile machinery abrash's
  // own Framebuffer deliberately does not (this is the whole point of the adapter).
  assert.equal(typeof dst.tileRect, "function", "the adapted framebuffer has daleske's tileRect (tile-diffable)");
  assert.equal(typeof dst.tilePixels, "function", "the adapted framebuffer has daleske's tilePixels (tile-diffable)");
});
