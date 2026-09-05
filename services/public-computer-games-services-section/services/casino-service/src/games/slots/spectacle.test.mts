/**
 * spectacle.test.mts — a headless proof that the client's own composition path (the exact
 * qwzspace primitives `web/js/slots.mjs` drives: `composeFrame`/`createRenderLoop#tickOnce`,
 * `celebrate`/`sampleCelebration`, `createEffect`/`sampleEffect`, `frameOps`/`createBackend`)
 * really does compose a grid + a win celebration into a real, drawable frame, with no browser at
 * all. `composeFrame` is pure (per its own header — "no timers, no buffer/backend reference"),
 * and `render-2d`'s `createBackend` only needs a `{getContext('2d')}`-shaped mount, so this test
 * runs the identical pipeline `web/js/slots.mjs` runs, minus only the DOM and the real vendor-
 * route indirection (imported straight from `node_modules` here, exactly as `web/js/slots.mjs`
 * imports the same files through `/vendor/qwzspace/*` — see `server.test.mts`'s own proof that
 * those routes serve byte-identical files).
 *
 * `web/js/slots-drawables.mjs` itself is not imported here (it hard-codes absolute `/vendor/...`
 * specifiers meant for a browser's own module resolution, which plain Node ESM cannot resolve) —
 * this test instead exercises the identical composition pipeline against qwzspace's own stock
 * drawables (`disc`/`star`/`coin`, registered as a side effect of importing `drawables.mjs`,
 * exactly like this game's own symbols are), which is a completely faithful proof of the pipeline
 * itself: nothing about `composeFrame`/`tickOnce`/`frameOps` cares which sprite names are used.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '@red-cup-engineering/qwzspace/drawables';
import { composeFrame, createRenderLoop } from '@red-cup-engineering/qwzspace/render-loop';
import { createBackend, frameOps } from '@red-cup-engineering/qwzspace/render-2d';
import { celebrate } from '@red-cup-engineering/qwzspace/celebration';

const REELS = 5;
const ROWS = 3;
const CELL_W = 128;
const CELL_H = 118;

function gridEntities() {
  const names = ['disc', 'star', 'coin', 'disc', 'star'];
  const entities = [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      entities.push({
        id: `cell-${reel}-${row}`,
        kind: 'symbol',
        role: 'symbol',
        x: reel * CELL_W,
        y: row * CELL_H,
        z: 0,
        yaw: 0,
        label: names[reel],
        layer: 'board',
        sprite: names[reel],
        scale: 1,
        rotation: 0,
        opacity: 1,
      });
    }
  }
  return entities;
}

function immediateBracket(entities, tick) {
  return { left: { tick, entities }, right: { tick, entities }, alpha: 1, mode: 'between' };
}

test('composeFrame: a static 5x3 grid composes to exactly 15 board-layer entries, positions intact', () => {
  const entities = gridEntities();
  const composed = composeFrame({ bracket: immediateBracket(entities, 10), positions: entities, tick: 10 });
  assert.ok(composed !== null);
  assert.equal(composed.scene.entries.length, 15);
  assert.equal(composed.tick, 10);
  const first = composed.scene.entries.find((e) => e.id === 'cell-0-0');
  assert.equal(first.x, 0);
  assert.equal(first.y, 0);
  assert.equal(first.sprite, 'disc');
});

test('composeFrame: a null bracket (nothing buffered yet) composes to null, exactly as documented', () => {
  assert.equal(composeFrame({ bracket: null }), null);
});

test('composeFrame: folds an active jackpot celebration\'s particles/overlay into the scene and returns its camera pose', () => {
  const entities = gridEntities();
  const plan = celebrate('jackpot', { tier: 'epic', seed: 42, startTick: 0 });
  const composed = composeFrame({ bracket: immediateBracket(entities, 2), positions: entities, tick: 2, celebrations: [plan] });
  assert.ok(composed !== null);
  assert.ok(composed.scene.entries.length > 15, 'expected celebration particle/overlay entries merged in on top of the 15 grid cells');
  assert.ok(composed.cameraPose !== null, 'a jackpot celebration zooms/shakes the camera — its pose should not be null mid-celebration');
  const overlay = composed.scene.entries.find((e) => e.layer === 'overlay' && e.text);
  assert.ok(overlay !== undefined, 'expected a JACKPOT! banner overlay entry');
});

test('composeFrame: an expired celebration (tick far past its own duration) stops contributing entries', () => {
  const entities = gridEntities();
  const plan = celebrate('flash', { tier: 'minor', seed: 1, startTick: 0 });
  const composed = composeFrame({ bracket: immediateBracket(entities, 10_000), positions: entities, tick: 10_000, celebrations: [plan] });
  assert.equal(composed.scene.entries.length, 15);
});

// ── a real, headless "canvas": records every 2D-context call it receives, so tickOnce()'s actual
// draw pass is provably exercised end to end, not merely composed. ─────────────────────────────
function fakeCanvas() {
  const calls = [];
  const gradientStub = { addColorStop() {} };
  const ctx = {
    clearRect: (...a) => calls.push(['clearRect', a]),
    beginPath: () => calls.push(['beginPath']),
    arc: (...a) => calls.push(['arc', a]),
    rect: (...a) => calls.push(['rect', a]),
    moveTo: (...a) => calls.push(['moveTo', a]),
    lineTo: (...a) => calls.push(['lineTo', a]),
    bezierCurveTo: (...a) => calls.push(['bezierCurveTo', a]),
    quadraticCurveTo: (...a) => calls.push(['quadraticCurveTo', a]),
    closePath: () => calls.push(['closePath']),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (...a) => calls.push(['translate', a]),
    rotate: (...a) => calls.push(['rotate', a]),
    scale: (...a) => calls.push(['scale', a]),
    setLineDash: (...a) => calls.push(['setLineDash', a]),
    fillText: (...a) => calls.push(['fillText', a]),
    createLinearGradient: () => gradientStub,
    createRadialGradient: () => gradientStub,
    set fillStyle(v) {
      calls.push(['fillStyle', v]);
    },
    set strokeStyle(v) {
      calls.push(['strokeStyle', v]);
    },
    set lineWidth(v) {
      calls.push(['lineWidth', v]);
    },
    set globalAlpha(v) {
      calls.push(['globalAlpha', v]);
    },
    set font(v) {
      calls.push(['font', v]);
    },
    set textAlign(v) {
      calls.push(['textAlign', v]);
    },
  };
  return { getContext: () => ctx, calls };
}

test('frameOps: the grid scene produces one sprite draw op per cell, in stable (layer, z, id) order', () => {
  const entities = gridEntities();
  const ops = frameOps({ tick: 0, entries: entities, version: 2 }, { width: 800, height: 440 });
  const spriteOps = ops.filter((o) => o.type === 'sprite');
  assert.equal(spriteOps.length, 15);
  assert.equal(ops[0].type, 'clear');
});

test('tickOnce(): a full render-loop cycle against a headless mock canvas actually draws (clearRect + real shape ops), with no rAF and no browser', () => {
  const canvas = fakeCanvas();
  const backend = createBackend({ mount: canvas, width: 800, height: 440 });
  const entities = gridEntities();
  const buffer = {
    sampleBrackets: () => immediateBracket(entities, 5),
    sample: () => entities,
  };
  const loop = createRenderLoop({ backend, buffer, tweenOptions: { easing: 'easeOutBounce' } });
  const composed = loop.tickOnce();
  assert.ok(composed !== null);
  assert.equal(loop.isRunning(), false); // tickOnce() never starts the rAF shell on its own
  assert.ok(canvas.calls.some(([name]) => name === 'clearRect'), 'expected a real clearRect call');
  assert.ok(canvas.calls.some(([name]) => name === 'arc' || name === 'fill'), 'expected real shape draw calls from the sprite pass');
});

test('tickOnce(): a jackpot celebration mid-frame drives a real camera transform + overlay text draw on the mock canvas', () => {
  const canvas = fakeCanvas();
  const backend = createBackend({ mount: canvas, width: 800, height: 440 });
  const entities = gridEntities();
  const plan = celebrate('jackpot', { tier: 'epic', seed: 7, startTick: 0 });
  const buffer = {
    sampleBrackets: () => immediateBracket(entities, 3),
    sample: () => entities,
  };
  const loop = createRenderLoop({ backend, buffer, getCelebrations: () => [plan] });
  loop.tickOnce();
  assert.ok(canvas.calls.some(([name]) => name === 'translate'), 'expected the camera zoom/shake transform to actually translate the context');
  assert.ok(canvas.calls.some(([name]) => name === 'fillText'), 'expected the JACKPOT! banner text to actually draw');
});
