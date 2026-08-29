// palette — the one place colour is decided, shared by every view (the WebGL renderer's tints,
// the Canvas2D fallback, the headless SVG snapshot, and the HUD). Returns linear-ish [r,g,b] in
// 0..1 so the GL path can use it raw; `css()` formats it for the 2D paths. Pure, browser-safe.

import { KIND, WORLD } from "./constants.mjs";
import { gradeAtXZ } from "./worldgen.mjs";

export const SKY = [0.62, 0.70, 0.82];

// entityColor — a creature's base colour from its kind and its bilattice charge. Charge wins:
// ⊤/anomaly is violet, f (slain) is grey, ⊥ (unknown) is dim — the world-truth shows in the hue.
export function entityColor(kind, charge, isMe = false) {
  if (charge === "⊤" || kind === KIND.anomaly) return [0.70, 0.30, 0.90];
  // [claims] an unstaked / f-denied CLAIM ALTAR reads as a pale gold standing stone (its kind), so a
  // dormant altar is legible; a t (sanctuary) altar still greens, a ⊤ (eruption) altar still violets.
  if (kind === KIND.altar && (charge === "⊥" || charge === "f")) return [0.86, 0.78, 0.52];
  if (charge === "f") return [0.40, 0.40, 0.43];
  if (charge === "⊥") return [0.35, 0.42, 0.52];
  switch (kind) {
    case KIND.player: return isMe ? [0.95, 0.82, 0.35] : [0.35, 0.62, 0.95];
    case KIND.critter: return [0.62, 0.52, 0.36];
    case KIND.brigand: return [0.66, 0.27, 0.22];
    case KIND.keeper: return [0.62, 0.86, 0.78]; // a pale teal-gold robe — reads friendly on every view
    case KIND.cairn: return [0.66, 0.70, 0.78]; // [marks] pale stone-grey-blue — a calm standing marker
    case KIND.resonance: return [0.35, 1.00, 0.78]; // [tide] a bright aquamarine bloom — a Bragg resonance, peaceful
    case KIND.altar: return [0.86, 0.78, 0.52]; // [claims] a pale gold standing stone — a CLAIM ALTAR, peaceful + immobile
    default: return [0.70, 0.70, 0.70];
  }
}

// [economy] itemColor — a held item's hue by its catalog KIND, for the inventory panel's glyphs.
// Weapons read steely, hides earthen, trinkets gold, relics the rim-violet (a contested thing).
export function itemColor(kind) {
  switch (kind) {
    case "weapon": return [0.74, 0.78, 0.86]; // steel
    case "hide": return [0.62, 0.50, 0.34]; // tanned earth
    case "trinket": return [0.92, 0.80, 0.40]; // worn gold
    case "relic": return [0.70, 0.40, 0.86]; // rim-violet — a contested ⊤ thing
    default: return [0.72, 0.74, 0.78];
  }
}

// terrainColor — ground shade by elevation + void-grade (grass in the heart, sand at the shore,
// bare rock where it's steep, a violet wash creeping in with the grade toward the rim).
export function terrainColor(x, y, z, flatness = 1) {
  let base;
  if (y < WORLD.seaLevel) base = [0.15, 0.32, 0.46]; // submerged
  else if (y < WORLD.seaLevel + 0.6) base = [0.74, 0.69, 0.5]; // shore
  else if (flatness < 0.78) base = [0.42, 0.40, 0.39]; // steep rock
  else base = mix([0.28, 0.52, 0.26], [0.5, 0.46, 0.34], clamp01((y - WORLD.seaLevel) / WORLD.maxHeight));
  return mix(base, [0.42, 0.26, 0.55], Math.min(0.55, gradeAtXZ(x, z) * 0.1));
}

export const css = (rgb, a = 1) =>
  `rgba(${(rgb[0] * 255) | 0},${(rgb[1] * 255) | 0},${(rgb[2] * 255) | 0},${a})`;
// hex — for SVG fills (no alpha)
export const hex = (rgb) =>
  "#" + rgb.map((c) => Math.max(0, Math.min(255, (c * 255) | 0)).toString(16).padStart(2, "0")).join("");

export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
