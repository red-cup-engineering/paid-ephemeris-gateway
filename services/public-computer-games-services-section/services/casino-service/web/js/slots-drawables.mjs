// slots-drawables.mjs — "Tideline Treasures"'s procedural symbol art, registered into
// qwzspace's shared drawable registry (`/vendor/qwzspace/drawables.mjs`). Zero raster assets,
// per the house's zero-image doctrine drawables.mjs itself documents (solitaire's cards-svg
// pattern, generalized) — every symbol below is path/circle/polygon shape data with gradient
// fills, recolored only through the registry's own "currentColor" convention where that actually
// helps (mostly it does not here: these symbols are multi-tone illustrations, not one flat-tint
// icons, so most fills are literal color/gradient values baked into the shape data itself).
//
// This module's only job is registerDrawable() calls — nothing here touches the DOM, the canvas,
// or game state. Import it once for its side effect (registering every symbol name below into the
// shared default registry `render-2d.mjs` resolves sprites against) before the first render.
//
// Eight names, exactly the roster `slots-rules` mirrors from the server's own `rules.mts`: the six
// paying symbols low-to-high (wave, anchor, starfish, gem, pearl, cowrie — the shell is deliberately
// the top *regular* symbol, since the shell IS the brand), plus wild and scatter.
//
// `gem` deliberately OVERRIDES qwzspace's own stock `gem` drawable (registerDrawable writes into
// the one shared default registry) — this page is the only consumer of that shared registry in
// this browser tab, so replacing the generic faceted-octagon stock gem with this game's own
// richer, tinted-facet version is safe and intentional, not an accidental collision.

import { registerDrawable } from '/vendor/qwzspace/drawables.mjs';

function ellipsePathOps(rx, ry) {
  // A closed ellipse built from four cubic bezier quadrants — the classic "kappa" magic-number
  // circle-to-bezier approximation, stretched independently on x/y since drawables' shape ops
  // have no native ellipse primitive (only circle/rect/polygon/path/line — see drawables.d.ts).
  const k = 0.5522847498;
  return [
    ['M', rx, 0],
    ['C', rx, ry * k, rx * k, ry, 0, ry],
    ['C', -rx * k, ry, -rx, ry * k, -rx, 0],
    ['C', -rx, -ry * k, -rx * k, -ry, 0, -ry],
    ['C', rx * k, -ry, rx, -ry * k, rx, 0],
    ['Z'],
  ];
}

// ── cowrie — the brand symbol: a domed oval shell with the long toothed aperture down its
// underside. Top regular-paying symbol. ─────────────────────────────────────────────────────────
registerDrawable('cowrie', {
  defaults: { width: 30, height: 20, shellColor: '#e8d9b5', shellDark: '#b8935a', apertureColor: '#5a3a2a' },
  build: (p) => {
    const rx = p.width / 2;
    const ry = p.height / 2;
    const shapes = [
      {
        type: 'path',
        ops: ellipsePathOps(rx, ry),
        fill: { type: 'radial', x1: -rx * 0.3, y1: -ry * 0.4, x2: 0, y2: 0, r: rx * 1.1, stops: [[0, '#fffaf0'], [0.55, p.shellColor], [1, p.shellDark]] },
        stroke: p.shellDark,
        lineWidth: 1,
      },
      // the aperture: a long thin lens down the center, with tick "teeth" perpendicular to it.
      { type: 'path', ops: ellipsePathOps(rx * 0.62, ry * 0.22), fill: p.apertureColor },
    ];
    const teeth = 7;
    for (let i = 0; i < teeth; i++) {
      const x = -rx * 0.55 + (i / (teeth - 1)) * rx * 1.1;
      shapes.push({ type: 'line', x1: x, y1: -ry * 0.22, x2: x, y2: ry * 0.22, stroke: p.shellColor, lineWidth: 0.8 });
    }
    // a soft highlight arc near the top for gloss.
    shapes.push({ type: 'path', ops: [['M', -rx * 0.4, -ry * 0.55], ['Q', 0, -ry * 0.85, rx * 0.4, -ry * 0.55]], stroke: 'rgba(255,255,255,0.65)', lineWidth: 1.2 });
    return shapes;
  },
});

// ── pearl — a glossy sphere. ─────────────────────────────────────────────────────────────────────
registerDrawable('pearl', {
  defaults: { radius: 15 },
  build: (p) => [
    {
      type: 'circle',
      cx: 0,
      cy: 0,
      r: p.radius,
      fill: { type: 'radial', x1: -p.radius * 0.35, y1: -p.radius * 0.4, x2: 0, y2: 0, r: p.radius * 1.2, stops: [[0, '#ffffff'], [0.45, '#f3e9f7'], [1, '#c9b6d8']] },
      stroke: '#a892bd',
      lineWidth: 1,
    },
    { type: 'circle', cx: -p.radius * 0.32, cy: -p.radius * 0.35, r: p.radius * 0.22, fill: 'rgba(255,255,255,0.85)' },
  ],
});

// ── anchor — nautical iconography for the mid-low tier. ─────────────────────────────────────────
registerDrawable('anchor', {
  defaults: { size: 30, color: '#6b8fae' },
  build: (p) => {
    const s = p.size;
    return [
      { type: 'circle', cx: 0, cy: -s * 0.42, r: s * 0.14, fill: 'none', stroke: p.color, lineWidth: s * 0.08 }, // ring
      { type: 'line', x1: 0, y1: -s * 0.3, x2: 0, y2: s * 0.4, stroke: p.color, lineWidth: s * 0.09 }, // shaft
      { type: 'line', x1: -s * 0.26, y1: -s * 0.08, x2: s * 0.26, y2: -s * 0.08, stroke: p.color, lineWidth: s * 0.08 }, // crossbar
      {
        type: 'path',
        ops: [
          ['M', 0, s * 0.4],
          ['C', -s * 0.05, s * 0.55, -s * 0.35, s * 0.55, -s * 0.42, s * 0.3],
          ['C', -s * 0.44, s * 0.22, -s * 0.3, s * 0.22, -s * 0.28, s * 0.32],
        ],
        stroke: p.color,
        lineWidth: s * 0.08,
      },
      {
        type: 'path',
        ops: [
          ['M', 0, s * 0.4],
          ['C', s * 0.05, s * 0.55, s * 0.35, s * 0.55, s * 0.42, s * 0.3],
          ['C', s * 0.44, s * 0.22, s * 0.3, s * 0.22, s * 0.28, s * 0.32],
        ],
        stroke: p.color,
        lineWidth: s * 0.08,
      },
    ];
  },
});

// ── wave — the lowest-paying symbol: two stacked crest lines with a foam highlight. ────────────
registerDrawable('wave', {
  defaults: { width: 34, color: '#2f8f9d', foam: '#d8f5f7' },
  build: (p) => {
    const w = p.width / 2;
    return [
      { type: 'path', ops: [['M', -w, 4], ['C', -w * 0.5, -6, 0, 8, w * 0.5, -2], ['C', w * 0.75, -6, w * 0.9, -3, w, 0]], stroke: p.color, lineWidth: 3.2 },
      { type: 'path', ops: [['M', -w, 12], ['C', -w * 0.5, 4, 0, 15, w * 0.5, 6], ['C', w * 0.75, 3, w * 0.9, 5, w, 8]], stroke: p.foam, lineWidth: 2.4 },
    ];
  },
});

// ── starfish — a rounded, organic 5-armed star with texture dots. ──────────────────────────────
registerDrawable('starfish', {
  defaults: { radius: 16, color: '#e07a5f', dot: '#f4c095' },
  build: (p) => {
    const arms = 5;
    const outerR = p.radius;
    const innerR = p.radius * 0.42;
    const ops = [];
    for (let i = 0; i <= arms; i++) {
      const aOuter = -Math.PI / 2 + (i / arms) * Math.PI * 2;
      const aInner = aOuter - Math.PI / arms;
      const ox = Math.cos(aOuter) * outerR;
      const oy = Math.sin(aOuter) * outerR;
      if (i === 0) ops.push(['M', ox, oy]);
      else {
        const ix = Math.cos(aInner) * innerR;
        const iy = Math.sin(aInner) * innerR;
        ops.push(['Q', ix, iy, ox, oy]);
      }
    }
    ops.push(['Z']);
    const shapes = [{ type: 'path', ops, fill: p.color, stroke: '#a8492f', lineWidth: 1 }];
    for (let i = 0; i < arms; i++) {
      const a = -Math.PI / 2 + (i / arms) * Math.PI * 2;
      shapes.push({ type: 'circle', cx: Math.cos(a) * outerR * 0.55, cy: Math.sin(a) * outerR * 0.55, r: outerR * 0.09, fill: p.dot });
    }
    shapes.push({ type: 'circle', cx: 0, cy: 0, r: outerR * 0.12, fill: p.dot });
    return shapes;
  },
});

// ── gem — a faceted, richly-tinted gem (overrides qwzspace's stock 'gem' — see this file's header). ─
registerDrawable('gem', {
  defaults: { radius: 16, color: '#2fb8c6' },
  build: (p) => {
    const r = p.radius;
    const top = [
      [0, -r],
      [r * 0.62, -r * 0.35],
      [r * 0.4, r * 0.55],
      [-r * 0.4, r * 0.55],
      [-r * 0.62, -r * 0.35],
    ];
    return [
      { type: 'polygon', points: top, closed: true, fill: { type: 'linear', x1: -r, y1: -r, x2: r, y2: r, stops: [[0, '#eafcff'], [0.5, p.color], [1, '#0f6b76']] }, stroke: '#0b4e57', lineWidth: 1 },
      { type: 'line', x1: 0, y1: -r, x2: 0, y2: r * 0.55, stroke: 'rgba(255,255,255,0.5)', lineWidth: 0.8 },
      { type: 'line', x1: -r * 0.62, y1: -r * 0.35, x2: r * 0.62, y2: -r * 0.35, stroke: 'rgba(255,255,255,0.5)', lineWidth: 0.8 },
      { type: 'line', x1: 0, y1: -r, x2: r * 0.4, y2: r * 0.55, stroke: 'rgba(0,0,0,0.25)', lineWidth: 0.6 },
    ];
  },
});

// ── wild — a glowing medallion: sunburst rays behind a pale shell glyph, gold-tinted so it never
// reads as just "another cowrie" at a glance. ───────────────────────────────────────────────────
registerDrawable('wild', {
  defaults: { radius: 20, color: '#f2cf5b', glow: '#fff3c4' },
  build: (p) => {
    const shapes = [
      { type: 'circle', cx: 0, cy: 0, r: p.radius * 1.15, fill: { type: 'radial', x1: 0, y1: 0, x2: 0, y2: 0, r: p.radius * 1.15, stops: [[0, 'rgba(255,243,196,0.55)'], [1, 'rgba(255,243,196,0)']] } },
    ];
    const rays = 10;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const x1 = Math.cos(a) * p.radius * 0.55;
      const y1 = Math.sin(a) * p.radius * 0.55;
      const x2 = Math.cos(a) * p.radius * 1.05;
      const y2 = Math.sin(a) * p.radius * 1.05;
      shapes.push({ type: 'line', x1, y1, x2, y2, stroke: p.color, lineWidth: 2.4 });
    }
    shapes.push({ type: 'circle', cx: 0, cy: 0, r: p.radius * 0.6, fill: { type: 'radial', x1: -p.radius * 0.2, y1: -p.radius * 0.2, x2: 0, y2: 0, r: p.radius * 0.7, stops: [[0, '#fffdf5'], [1, p.color]] }, stroke: '#c9992a', lineWidth: 1.2 });
    shapes.push({ type: 'path', ops: ellipsePathOps(p.radius * 0.34, p.radius * 0.16), fill: '#8a6a1c' });
    return shapes;
  },
});

// ── scatter — a compass rose: navigation/discovery, triggers the free-spin bonus. ──────────────
registerDrawable('scatter', {
  defaults: { radius: 18, color: '#1c4f6b', accent: '#e6b74a' },
  build: (p) => {
    const r = p.radius;
    const shapes = [{ type: 'circle', cx: 0, cy: 0, r, fill: { type: 'radial', x1: 0, y1: 0, x2: 0, y2: 0, r, stops: [[0, '#e7f4f8'], [1, '#bcd9e3']] }, stroke: p.color, lineWidth: 1.5 }];
    const points = 8;
    for (let i = 0; i < points; i++) {
      const a = (i / points) * Math.PI * 2;
      const long = i % 2 === 0;
      const len = long ? r * 0.85 : r * 0.45;
      const width = long ? r * 0.16 : r * 0.1;
      const tipX = Math.cos(a) * len;
      const tipY = Math.sin(a) * len;
      const baseA1 = a + Math.PI / 2;
      const baseA2 = a - Math.PI / 2;
      const b1x = Math.cos(baseA1) * width;
      const b1y = Math.sin(baseA1) * width;
      const b2x = Math.cos(baseA2) * width;
      const b2y = Math.sin(baseA2) * width;
      shapes.push({
        type: 'polygon',
        points: [[tipX, tipY], [b1x, b1y], [b2x, b2y]],
        closed: true,
        fill: long ? p.color : p.accent,
      });
    }
    shapes.push({ type: 'circle', cx: 0, cy: 0, r: r * 0.14, fill: p.accent, stroke: p.color, lineWidth: 1 });
    return shapes;
  },
});

export const SYMBOL_NAMES = ['wave', 'anchor', 'starfish', 'gem', 'pearl', 'cowrie', 'wild', 'scatter'];
