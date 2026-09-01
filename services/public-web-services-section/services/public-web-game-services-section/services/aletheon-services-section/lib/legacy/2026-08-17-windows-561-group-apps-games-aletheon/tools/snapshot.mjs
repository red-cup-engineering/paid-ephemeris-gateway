// snapshot — render Aletheon to an SVG (and an ASCII map) with NO browser and NO GPU. It seeds a
// world, ticks it forward, and draws a top-down view straight from the authoritative state, using
// the SAME shared palette + worldgen the live views use. Proof the world is real and legible even
// headless — and a way to teach the bilattice at a glance (every creature wears its charge glyph).
//
//   node tools/snapshot.mjs [ticks] [out.svg]
//
// Defaults: 80 ticks, ./aletheon-snapshot.svg. Also prints a small ASCII map to stdout.

import { writeFileSync } from "node:fs";
import { createWorld, spawn, all } from "../server/world/store.mjs";
import { seedWorld } from "../server/world/seed.mjs";
import { tick } from "../server/world/ticking.mjs";
import { damage } from "../server/world/combat.mjs";
import { terrainHeight, ringRadius } from "../shared/worldgen.mjs";
import { terrainColor, entityColor, hex } from "../shared/palette.mjs";
import { stateGlyph } from "../server/world/value.mjs";
import { claimGlyph } from "../server/world/claims.mjs"; // [claims] an altar wears its claim glyph
import { WORLD, KIND } from "../shared/constants.mjs";

// the entity's bilattice glyph: a CLAIM ALTAR wears its (player-authored) claim glyph; everyone
// else wears their settled life-state glyph (t / f / ⊤ / ⊥).
const G = (e) => (e.kind === KIND.altar && e.claim ? claimGlyph(e.claim) : stateGlyph(e.state));

const ticks = Number(process.argv[2]) || 80;
const out = process.argv[3] || "aletheon-snapshot.svg";

// build a world and let it live a while
const world = createWorld();
seedWorld(world);
// a wandering hero, and a doomed scout by the rim Anomaly so corruption blooms for the snapshot
const hero = spawn(world, { kind: KIND.player, name: "Snapshot", x: 6, z: -4, maxHp: 60 });
const anom = all(world).find((e) => e.kind === KIND.anomaly);
if (anom) { const v = spawn(world, { kind: KIND.brigand, name: "Doomed Scout", x: anom.x + 1.5, z: anom.z + 1.5, maxHp: 18, hostile: true }); while (v.state !== "dead") damage(world, null, v, 9); }
hero.input = { f: 1, s: 0, y: 0.6, a: 0 };
for (let i = 0; i < ticks; i++) tick(world);

// --- SVG (top-down, world centred) ------------------------------------------------------------
const SIZE = 900;
const span = WORLD.size; // world units shown across the image
const scale = SIZE / span;
const sx = (x) => (x + span / 2) * scale;
const sy = (z) => (z + span / 2) * scale;

const cells = 90, step = span / cells;
let rects = "";
for (let j = 0; j < cells; j++) {
  for (let i = 0; i < cells; i++) {
    const wx = -span / 2 + (i + 0.5) * step, wz = -span / 2 + (j + 0.5) * step;
    const y = terrainHeight(wx, wz);
    const yr = terrainHeight(wx + 1.5, wz), yu = terrainHeight(wx, wz + 1.5);
    const flat = 2 / Math.hypot(y - yr, 2, y - yu);
    rects += `<rect x="${(i * SIZE / cells).toFixed(1)}" y="${(j * SIZE / cells).toFixed(1)}" width="${(SIZE / cells + 1).toFixed(1)}" height="${(SIZE / cells + 1).toFixed(1)}" fill="${hex(terrainColor(wx, y, wz, flat))}"/>`;
  }
}
let rings = "";
for (let g = 0; g <= 5; g++) {
  rings += `<circle cx="${sx(0)}" cy="${sy(0)}" r="${(ringRadius(g) * scale).toFixed(1)}" fill="none" stroke="${g >= 3 ? "#c45cff" : "#9a9ab4"}" stroke-opacity="${g >= 3 ? 0.4 : 0.22}"/>`;
}
let ents = "";
for (const e of all(world)) {
  const g = G(e);
  const r = (e.kind === KIND.critter ? 5 : e.kind === KIND.anomaly ? 9 : 7) * (e.kind === KIND.player ? 1.2 : 1);
  const fill = hex(entityColor(e.kind, g, e.kind === KIND.player));
  ents += `<g><circle cx="${sx(e.x).toFixed(1)}" cy="${sy(e.z).toFixed(1)}" r="${r}" fill="${fill}" stroke="${e.kind === KIND.player ? "#fff" : "rgba(0,0,0,0.4)"}" stroke-width="${e.kind === KIND.player ? 2 : 1}"/>`;
  ents += `<text x="${sx(e.x).toFixed(1)}" y="${(sy(e.z) + r * 0.5).toFixed(1)}" font-size="${(r * 1.4).toFixed(0)}" text-anchor="middle" fill="rgba(0,0,0,0.85)" font-family="serif">${g}</text></g>`;
}

const counts = tally(all(world));
const legend = `
  <rect x="14" y="${SIZE - 92}" width="240" height="78" rx="8" fill="rgba(18,16,24,0.78)" stroke="rgba(180,150,210,0.4)"/>
  <text x="26" y="${SIZE - 70}" fill="#e8e2d2" font-size="13" font-family="serif">Aletheon — tick ${world.tick}</text>
  <text x="26" y="${SIZE - 50}" fill="#9fb" font-size="12" font-family="monospace">t alive ${counts.t}   f slain ${counts.f}   ⊤ Anomaly ${counts["⊤"]}</text>
  <text x="26" y="${SIZE - 32}" fill="#c9a7ef" font-size="11" font-family="serif">rings = void grades · centre = the Settled Reach</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<rect width="${SIZE}" height="${SIZE}" fill="#07080d"/>
${rects}
${rings}
${ents}
${legend}
</svg>`;
writeFileSync(out, svg);

// --- ASCII map (so even a terminal can witness it) --------------------------------------------
asciiMap(world);
console.log(`\nwrote ${out}  (tick ${world.tick}; ${all(world).length} entities — t ${counts.t}, f ${counts.f}, ⊤ ${counts["⊤"]})`);

function tally(es) { const c = { t: 0, f: 0, "⊤": 0, "⊥": 0 }; for (const e of es) c[G(e)] = (c[G(e)] || 0) + 1; return c; }

function asciiMap(world) {
  const cols = 60, rows = 30, grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
  const gx = (x) => Math.floor(((x + span / 2) / span) * cols);
  const gy = (z) => Math.floor(((z + span / 2) / span) * rows);
  // terrain backdrop
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = -span / 2 + (c / cols) * span, wz = -span / 2 + (r / rows) * span;
    const y = terrainHeight(wx, wz);
    grid[r][c] = y < WORLD.seaLevel ? "~" : y < WORLD.maxHeight * 0.45 ? "." : "^";
  }
  const mark = { player: "@", critter: "r", brigand: "&", anomaly: "T", keeper: "K", cairn: "A", resonance: "*", altar: "¶" }; // [marks] A = a raised Cairn; [tide] * = a Bragg resonance; [claims] ¶ = a Claim Altar
  for (const e of all(world)) {
    const r = gy(e.z), c = gx(e.x);
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = G(e) === "f" ? "x" : (mark[e.kind] || "?");
  }
  console.log("Aletheon, from above (@ you · r critter · & brigand · T Anomaly · x slain · ~ sea · ^ highland):\n");
  console.log(grid.map((row) => "  " + row.join("")).join("\n"));
}
