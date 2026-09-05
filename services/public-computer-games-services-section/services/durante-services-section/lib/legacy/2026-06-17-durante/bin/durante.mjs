#!/usr/bin/env node
// durante demo — a QUAKE-like walk-and-shoot through a FEDERATED arena, rendered over abrash's software
// 3D into daleske's pixel framebuffer. It loads the shipped seed (world/blood-merge.jsonl) — the MERGE of
// two peers' wall-traces (alpha built an inner wall, beta carved it open, so voxel:4,4 is CONTESTED ⊤, a
// shivering PHASE GATE) plus two demons. You walk the arena, the demons chase, and you SHOOT: each shot
// that lands appends a WOUND (deny on the demon's `alive`), so the demon passes through HELD ⊤
// (alive-AND-dead, wounded) before enough wounds SETTLE it to dead. The contested wall shivers; the
// wounded demon's tile shivers. The LAW, live, in a shooter.
//
// Two modes:
//   (default, TTY)        — daleske's pixel cockpit: the 3D frame blitted via kitty/sixel, WASD to move,
//                           SPACE to fire, q to quit; a calm status line carries the four-value audit.
//   --headless / non-TTY  — a scripted run: walk toward demon 0 and empty the magazine into it, printing
//                           a tiny ASCII downsample of each 3D frame + the demon's vitality settling
//                           t -> ⊤ (wounded) -> f (dead). So CI / a pipe can SEE the kill-by-settle.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { worldFromRows } from "@561-group/abrash/world";

import { game, tick, status } from "../src/game.mjs";
import { contestedWalls, census } from "../src/arena.mjs";
import { vitalityOf, positionOf } from "../src/demon.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = join(HERE, "..", "world", "blood-merge.jsonl");

function loadSeed() {
  const text = readFileSync(SEED, "utf8").trim();
  return text ? text.split("\n").map((l) => JSON.parse(l)) : [];
}

// a fresh game over the merged arena, with the two seeded demons already on the board.
function newGame(camOpts = {}) {
  const world = worldFromRows(loadSeed());
  return game({
    world,
    // stand in the x=7 lane and look straight DOWN it (+z): demon 0 spawned at (7.5,7.5) is dead ahead,
    // an open line of fire with no inner wall between — the contested gate (4,4) is off to the left.
    player: { x: 7.5, z: 2.5, angle: Math.PI / 2 },
    demons: [{ id: 0 }, { id: 1 }],
    cam: { fov: Math.PI / 3, maxDist: 24, ...camOpts },
  });
}

// aimAt(player, target) — the heading that points the crosshair straight at (target.x,target.z).
function aimAt(player, target) {
  return Math.atan2(target.z - player.z, target.x - player.x);
}

// ── headless: a scripted walk-and-empty-the-mag, an ASCII downsample per frame ──
function frameToAscii(frame, cols = 60, rows = 22) {
  const { fb } = frame;
  const sx = fb.width / cols, sy = fb.height / rows;
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const [R, G, B] = fb.getPixel(Math.floor(c * sx), Math.floor(r * sy));
      const lum = (R + G + B) / 3;
      if (G > R + 30 && G > B + 30 && lum > 70) line += "#";        // settled wall (green)
      else if (R > 150 && G > 130 && B < 110) line += "%";          // contested seam (yellow)
      else if (R > 120 && G < 100 && B < 100) line += "%";          // contested deny face (red)
      else if (lum > 45) line += ".";                               // floor / fog
      else line += " ";                                             // sky
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function runHeadless() {
  let state = newGame({ width: 180, height: 96 });
  console.log(`durante — loaded the MERGED arena: ${JSON.stringify(census(state.world))}, ` +
    `${contestedWalls(state.world).length} contested ⊤ phase-gate(s); 2 demons spawned.`);
  // the script: snap the crosshair onto demon 0 (it is chasing UP the lane toward us) and FIRE every
  // tick. The demo manipulates only the player's heading to aim — an honest stand-in for the human
  // turning with A/D — then lets the engine resolve the shot into wound EVIDENCE.
  const TICKS = 10;
  for (let n = 0; n < TICKS; n++) {
    const target = positionOf(state.world, 0) ?? { x: state.player.x, z: state.player.z + 1 };
    state = { ...state, player: { ...state.player, angle: aimAt(state.player, target) } };
    state = tick(state, { fire: true });
    const st = status(state);
    const v0 = vitalityOf(state.world, 0);
    const r = state.report;
    const shotMsg = r.shot.fired ? (r.shot.landed ? `HIT demon:${r.shot.demonId} @${r.shot.dist.toFixed(1)}` : "miss") : "—";
    console.log(`\n── tick ${n} ──  shot:${shotMsg}  demon0:${v0.vital}(${v0.wounds}/${v0.toughness})  ` +
      `hunting:${st.hunting} wounded:${st.wounded} dead:${st.dead}  ⊤walls:${st.contestedWalls}  hurt:${st.hurt}`);
    console.log(frameToAscii(state.frame));
  }
  console.log("\n(demon 0's vitality settled t -> ⊤ -> f: alive, then HELD alive-AND-dead while wounded,");
  console.log(" then DEAD once the wound-evidence reached its toughness. The kill is a SETTLE, not a subtraction.");
  console.log(" The '%' columns are the CONTESTED phase-gate wall — voxel:4,4, where the two peers' traces disagree.)");
}

// ── interactive: daleske pixel cockpit ──
// The pixel terminal (daleske) is abrash's terminal — durante reaches it THROUGH the engine rather than
// declaring it a direct dependency. Only the interactive cockpit needs it, so we import it lazily here;
// headless and the tests stay pure (abrash + computer only).
async function runInteractive() {
  const { PixelScreen } = await import("@561-group/daleske/screen");
  const screen = new PixelScreen();
  let state = newGame();
  let running = true;
  let intent = {};

  const paint = () => {
    state = tick(state, intent, { width: screen.width, height: screen.height });
    intent = {};
    screen.paint(state.frame.fb);
    const st = status(state);
    const row = Math.floor(screen.height / 16) + 1;
    process.stdout.write(`\x1b[${row};1Hdurante  hunting:${st.hunting} ⊤wounded:${st.wounded} dead:${st.dead}  ` +
      `⊤walls:${st.contestedWalls}  hurt:${st.hurt}  [WASD]move [SPACE]fire [q]quit`);
  };

  screen.start();
  paint();
  screen.onKey((k) => {
    if (k.name === "q") { running = false; screen.stop(); process.exit(0); }
    if (k.name === "space") { intent = { ...intent, fire: true }; return; }
    if (k.name === "char") {
      if (k.char === "w") intent = { ...intent, forward: 1 };
      else if (k.char === "s") intent = { ...intent, forward: -1 };
      else if (k.char === "a") intent = { ...intent, turn: -1 };
      else if (k.char === "d") intent = { ...intent, turn: 1 };
      else if (k.char === " ") intent = { ...intent, fire: true };
    }
  });
  screen.onInterrupt(() => { running = false; screen.stop(); process.exit(0); });

  const loop = () => { if (!running) return; paint(); setTimeout(loop, 90); };
  setTimeout(loop, 90);
}

function main() {
  const headless = process.argv.includes("--headless") || !process.stdout.isTTY;
  if (headless) runHeadless();
  else runInteractive();
}

main();
