/**
 * `render-projection.test` — unit tests for the canvas renderer's pure, testable seam.
 *
 * TILESLOTS-DESIGN.md §2.3 calls `projectFrame` (geometry + authoritative tile state + the
 * active tween list + a timestamp -> a flat RenderCommand[]) the renderer's one testable
 * function: `node --test` runs under Node, which has no `<canvas>`, so anything that touches a
 * `CanvasRenderingContext2D` can't be exercised the way `engine.test.mts` exercises
 * `engine.mts`. `projectFrame` and its helpers (easing, tween pruning, hit testing, color math)
 * are deliberately written with zero DOM/canvas/Math.random()/Date.now() dependencies for
 * exactly this reason, inside `client.mts`'s inline `<script>` between two comment markers
 * ("PURE RENDER CORE" ... "END PURE RENDER CORE").
 *
 * Since the one-file-no-build doctrine (DESIGN.md, client.mts's own module header) forbids the
 * browser-shipped script from `import`ing a separate module, this test does not duplicate that
 * logic in a second file — it extracts the *exact* source text between the two markers from the
 * real `CLIENT_HTML` export and evaluates it with `new Function`, then calls into the resulting
 * bindings. This is the same technique client.test.mts already uses (`new Function(script)` to
 * parse-check the whole inline script) taken one step further: eval only the DOM-free prefix
 * (which needs nothing beyond a few constants/tiny helpers also defined before the marker, none
 * of which touch `document` at *definition* time — only inside function bodies this file never
 * calls), then read real values back out of it. If the extracted text ever referenced `document`
 * or `canvas` at top level, this file would fail loudly rather than silently testing a stale
 * copy — there is no second copy to drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_HTML } from './client.mts';

interface RenderCore {
  projectFrame: (geom: any, tiles: any[], tweens: any[], now: number) => any[];
  pruneTweens: (tweens: any[], now: number) => any[];
  fallDepths: (falls: Array<{ from: number; to: number }>) => Record<number, number>;
  fallDuration: (dist: number, unitSpan: number) => number;
  fallProgress: (t: number) => number;
  spawnScaleProgress: (t: number) => number;
  overshootCurve: (t: number, over: number, turnFrac: number) => number;
  easeOutCubic: (t: number) => number;
  easeInCubic: (t: number) => number;
  jitterForCell: (cellId: number) => number;
  colorForCell: (colorId: number, shade: number) => string;
  shadeHex: (hex: string, deltaPct: number) => string;
  cellSpan: (cell: any) => number;
  railAngleForCell: (geom: any, cellId: number) => number;
  pointInPolygon: (x: number, y: number, poly: readonly number[]) => boolean;
  hitTestCell: (geom: any, x: number, y: number) => number | null;
  computeDirtyRect: (geom: any, cmds: any[]) => { x: number; y: number; w: number; h: number } | null;
  commandBBox: (geom: any, cmd: any) => { x: number; y: number; w: number; h: number };
  rectsIntersect: (a: any, b: any) => boolean;
  clamp01: (x: number) => number;
  PALETTE: readonly string[];
}

function loadRenderCore(): RenderCore {
  const startMarker = '"use strict";';
  const endMarker = '/* ===================== END PURE RENDER CORE ===================== */';
  const startIdx = CLIENT_HTML.indexOf(startMarker);
  const endIdx = CLIENT_HTML.indexOf(endMarker);
  assert.ok(startIdx >= 0 && endIdx > startIdx, 'expected both PURE RENDER CORE markers in CLIENT_HTML');
  const src = CLIENT_HTML.slice(startIdx, endIdx);
  // Sanity: nothing in the extracted prefix should reference the DOM/canvas at top level (only
  // inside function bodies, which this file never calls) — a stray top-level `document.` etc.
  // would throw the moment factory() below runs, but assert on the marker names explicitly too
  // so a future edit that moves something DOM-touching above the marker fails with a clear message.
  assert.match(src, /function projectFrame\(/);
  assert.doesNotMatch(src, /getContext\(/);
  const exposed = [
    'projectFrame', 'pruneTweens', 'fallDepths', 'fallDuration', 'fallProgress', 'spawnScaleProgress',
    'overshootCurve', 'easeOutCubic', 'easeInCubic', 'jitterForCell', 'colorForCell', 'shadeHex',
    'cellSpan', 'railAngleForCell', 'pointInPolygon', 'hitTestCell', 'computeDirtyRect', 'commandBBox',
    'rectsIntersect', 'clamp01', 'PALETTE',
  ];
  // eslint-disable-next-line no-new-func
  const factory = new Function(src + '\nreturn { ' + exposed.join(', ') + ' };');
  return factory() as RenderCore;
}

function squareCell(id: number, cx: number, cy: number, neighbors: number[] = []) {
  const half = 0.5;
  return {
    id, cx, cy,
    poly: [cx - half, cy - half, cx + half, cy - half, cx + half, cy + half, cx - half, cy + half],
    neighbors, fallFrom: null, fallTo: null, shade: 0,
  };
}
function geomOf(cells: ReturnType<typeof squareCell>[], rails: any[] = [], railsAt: number[][] = []) {
  return { tiling: 'square', cells, rails, railsAt, width: 10, height: 10, paletteSize: 5 };
}
function plainTile(color: number) {
  return { color, special: 'none', moss: false, frost: false, cage: false, geode: 0 };
}

const core = loadRenderCore();

test('projectFrame: an idle board (no tweens) renders every tile at rest, inactive', () => {
  const cells = [squareCell(0, 0.5, 0.5), squareCell(1, 1.5, 0.5)];
  const geom = geomOf(cells);
  const tiles = [plainTile(0), plainTile(2)];
  const cmds = core.projectFrame(geom, tiles, [], 1000);
  const tileCmds = cmds.filter((c) => c.kind === 'tile');
  assert.equal(tileCmds.length, 2);
  for (const c of tileCmds) {
    assert.equal(c.scale, 1);
    assert.equal(c.alpha, 1);
    assert.equal(c.rotation, 0);
    assert.equal(c.active, false);
  }
  assert.equal(tileCmds[0].x, 0.5);
  assert.equal(tileCmds[0].y, 0.5);
  assert.equal(tileCmds[1].color, 2);
});

test('projectFrame: shakeOffset command is zero with no shake tween, and reads inactive', () => {
  const geom = geomOf([squareCell(0, 0.5, 0.5)]);
  const cmds = core.projectFrame(geom, [plainTile(0)], [], 500);
  const shake = cmds[0];
  assert.equal(shake.kind, 'shakeOffset');
  assert.equal(shake.x, 0);
  assert.equal(shake.y, 0);
  assert.equal(shake.active, false);
});

test('projectFrame: a fall tween interpolates position and reports the tile active, exactly at rest at t=0 and t=dur', () => {
  const geom = geomOf([squareCell(0, 3, 4)]);
  const tween = { kind: 'fall', cell: 0, t0: 0, dur: 200, from: { x: 3, y: 2 }, to: { x: 3, y: 4 } };
  const atStart = core.projectFrame(geom, [plainTile(1)], [tween], 0).find((c) => c.kind === 'tile');
  assert.equal(atStart.active, true);
  assert.equal(atStart.y, 2); // fallProgress(0) === 0
  const atEnd = core.projectFrame(geom, [plainTile(1)], [tween], 200).find((c) => c.kind === 'tile');
  assert.equal(atEnd.y, 4); // fallProgress(1) === 1 exactly — no residual overshoot at the end
});

test('fallProgress: overshoots past 1.0 partway through, then settles back to exactly 1.0', () => {
  const mid = core.fallProgress(0.5);
  assert.ok(mid > 0 && mid < 1.1, 'mid-flight progress should be a plausible fraction, not runaway');
  const nearPeak = core.fallProgress(0.92); // the documented turn fraction
  assert.ok(nearPeak > 1, 'expected the overshoot bump past 1.0 near the turn fraction: got ' + nearPeak);
  assert.equal(core.fallProgress(1), 1);
  assert.equal(core.fallProgress(0), 0);
});

test('fallDuration: clamps to [MIN,MAX] and scales with distance in between', () => {
  assert.equal(core.fallDuration(0, 1), 120); // MIN_FALL_MS
  assert.equal(core.fallDuration(1000, 1), 340); // MAX_FALL_MS
  const one = core.fallDuration(1, 1);
  const two = core.fallDuration(2, 1);
  assert.ok(two > one, 'a longer fall must take longer, not the old fixed-STEP_MS-regardless-of-distance behavior');
});

test('pruneTweens: drops a tween exactly at its end time, keeps one mid-flight', () => {
  const tweens = [{ id: 1, kind: 'fall', cell: 0, t0: 0, dur: 100 }];
  assert.equal(core.pruneTweens(tweens, 50).length, 1);
  assert.equal(core.pruneTweens(tweens, 100).length, 0);
  assert.equal(core.pruneTweens(tweens, 99.9).length, 1);
});

test('fallDepths: chains falls by follow-into-vacated-cell, mouth-most tile is depth 0', () => {
  const falls = [{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }];
  const depths = core.fallDepths(falls);
  assert.equal(depths[2], 0);
  assert.equal(depths[3], 1);
  assert.equal(depths[4], 2);
});

test('fallDepths: two independent (non-chained) falls are both depth 0', () => {
  const falls = [{ from: 10, to: 11 }, { from: 20, to: 21 }];
  const depths = core.fallDepths(falls);
  assert.equal(depths[11], 0);
  assert.equal(depths[21], 0);
});

test('jitterForCell: deterministic (pure — no Math.random) and bounded to +-6deg', () => {
  const a = core.jitterForCell(42);
  const b = core.jitterForCell(42);
  assert.equal(a, b);
  for (const id of [0, 1, 7, 63, 999]) {
    const j = core.jitterForCell(id);
    assert.ok(j >= -6 && j <= 6, 'jitter ' + j + ' out of +-6deg range for cell ' + id);
  }
});

test('colorForCell/shadeHex: shade 1 lightens, shade 2 darkens, both stay valid hex', () => {
  const base = core.colorForCell(0, 0);
  const light = core.colorForCell(0, 1);
  const dark = core.colorForCell(0, 2);
  for (const hex of [base, light, dark]) assert.match(hex, /^#[0-9a-f]{6}$/i);
  assert.notEqual(base, light);
  assert.notEqual(base, dark);
});

test('pointInPolygon / hitTestCell: a point lands in the correct cell of a two-cell board', () => {
  const cells = [squareCell(0, 0.5, 0.5), squareCell(1, 1.5, 0.5)];
  const geom = geomOf(cells);
  assert.ok(core.pointInPolygon(0.5, 0.5, cells[0].poly));
  assert.ok(!core.pointInPolygon(1.5, 0.5, cells[0].poly));
  assert.equal(core.hitTestCell(geom, 0.2, 0.5), 0);
  assert.equal(core.hitTestCell(geom, 1.8, 0.5), 1);
});

test('railAngleForCell: reads the rail\'s own cell centers, is 0deg for a horizontal rail and 90deg for a vertical one', () => {
  const cells = [squareCell(0, 0, 0), squareCell(1, 1, 0), squareCell(2, 0, 1)];
  const geom = geomOf(cells, [{ family: 0, cells: [0, 1] }, { family: 1, cells: [0, 2] }], [[0, 1], [0], [1]]);
  assert.equal(core.railAngleForCell(geom, 0), 0); // cell 0 belongs to the horizontal rail first
  assert.equal(core.railAngleForCell(geom, 2), 90); // cell 2's only rail is the vertical one
});

test('computeDirtyRect: null when nothing is active, a real box when a tween-driven command exists', () => {
  const geom = geomOf([squareCell(0, 0.5, 0.5)]);
  const idleCmds = core.projectFrame(geom, [plainTile(0)], [], 0);
  assert.equal(core.computeDirtyRect(geom, idleCmds), null);
  const tween = { kind: 'clear', cell: 0, t0: 0, dur: 100, flashDur: 40, jitter: 3 };
  const activeCmds = core.projectFrame(geom, [plainTile(0)], [tween], 10);
  const rect = core.computeDirtyRect(geom, activeCmds);
  assert.ok(rect && rect.w > 0 && rect.h > 0);
});

test('particle and popup tweens vanish from projectFrame output once their lifetime elapses', () => {
  const geom = geomOf([squareCell(0, 0.5, 0.5)]);
  const particle = { kind: 'particle', t0: 0, dur: 300, x0: 0.5, y0: 0.5, vx: 1, vy: -1, gravity: 0.4, color: '#fff' };
  const popup = { kind: 'popup', t0: 0, dur: 500, x0: 0.5, y0: 0.5, rise: 0.6, text: '+42' };
  const mid = core.projectFrame(geom, [plainTile(0)], [particle, popup], 100);
  assert.ok(mid.some((c) => c.kind === 'particle'));
  assert.ok(mid.some((c) => c.kind === 'popup' && c.text === '+42'));
  const after = core.projectFrame(geom, [plainTile(0)], [particle, popup], 10000);
  assert.ok(!after.some((c) => c.kind === 'particle'));
  assert.ok(!after.some((c) => c.kind === 'popup'));
});
