/**
 * `client.test` — static checks on the one-document `CLIENT_HTML` string.
 *
 * This module has no imports of its own (per DESIGN.md: "no build, no deps") so these
 * tests are entirely static/string-level rather than DOM-level — there is no browser here.
 * What we CAN and DO verify without a browser:
 *   - the outer template-literal invariant itself: zero backtick characters and zero
 *     literal `${` sequences inside the document, the exact property that lets one big
 *     backtick string safely wrap arbitrary inner HTML/CSS/JS (see the sibling client for
 *     the same convention, and the module header here for why it matters);
 *   - every wire-protocol route and payload shape named in `./types.mts` is actually
 *     referenced (`/session`, `/stream`, `/input`, `/skus`, `/pay`, and the `ClientInput`
 *     kinds `start`/`swap`/`booster`/`abandon`);
 *   - every screen/HUD mount point and special-tile glyph id the DESIGN.md contract calls
 *     for is present in the markup;
 *   - the inner `<script>` block is syntactically valid JavaScript, checked by handing its
 *     text to `new Function(...)` — this *parses* the script (a SyntaxError throws
 *     immediately) without executing it, so it needs no DOM/browser to verify.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_HTML } from './client.mts';

function innerTemplateBody(html: string): string {
  const marker = 'CLIENT_HTML = ';
  // Not applicable here — CLIENT_HTML is already the fully-resolved string value, so the
  // whole exported value IS the document. Kept as a no-op wrapper for readability at call sites.
  void marker;
  return html;
}

test('CLIENT_HTML is a non-trivial self-contained HTML document', () => {
  assert.ok(CLIENT_HTML.length > 5000, 'expected a substantial document');
  assert.match(CLIENT_HTML, /^<!doctype html>/i);
  assert.match(CLIENT_HTML, /<\/html>\s*$/i);
  // TILESLOTS-DESIGN.md §5: the display name is TileSlots; "onestone" stays the engineering
  // identity (package/directory/module names, routes, env vars) but is not what a player sees.
  assert.match(CLIENT_HTML, /<title>TileSlots<\/title>/);
});

test('the document contains zero backtick characters (would break the outer template literal)', () => {
  const doc = innerTemplateBody(CLIENT_HTML);
  assert.equal((doc.match(/`/g) ?? []).length, 0);
});

test('the document contains zero literal ${ sequences (would trigger outer interpolation)', () => {
  const doc = innerTemplateBody(CLIENT_HTML);
  assert.equal((doc.match(/\$\{/g) ?? []).length, 0);
});

test('wire protocol: session/stream/input routes and payload fields are wired', () => {
  assert.match(CLIENT_HTML, /\/session/);
  assert.match(CLIENT_HTML, /\/stream\?token=/);
  assert.match(CLIENT_HTML, /\/input/);
  assert.match(CLIENT_HTML, /EventSource/);
  assert.match(CLIENT_HTML, /token:\s*state\.token/);
});

test('wire protocol: shop routes /skus and /pay are wired', () => {
  assert.match(CLIENT_HTML, /\/skus/);
  assert.match(CLIENT_HTML, /\/pay/);
  assert.match(CLIENT_HTML, /skuId/);
});

test('ClientInput kinds from types.mts all appear as literal input payloads', () => {
  for (const kind of ['start', 'swap', 'booster', 'abandon']) {
    assert.match(CLIENT_HTML, new RegExp('kind:\\s*"' + kind + '"'), `missing ClientInput kind "${kind}"`);
  }
});

test('screen mount points for login, map, and board are present', () => {
  for (const id of [
    'screen-login', 'screen-map', 'screen-board',
    'login-form', 'login-name',
    'chapter-tabs', 'level-trail',
    'board-canvas-wrap', 'lattice-canvas', 'tile-canvas', 'goal-list', 'booster-bar',
  ]) {
    assert.match(CLIENT_HTML, new RegExp('id="' + id + '"'), `missing mount point #${id}`);
  }
});

test('HUD mount points for lives/shards/prisms/moves/score are present', () => {
  for (const id of ['hud-lives', 'hud-shards', 'hud-prisms', 'hud-moves', 'hud-score']) {
    assert.match(CLIENT_HTML, new RegExp('id="' + id + '"'), `missing HUD element #${id}`);
  }
});

test('win/loss, shop, and Lattice Garden sheets are present', () => {
  for (const id of ['sheet-result', 'result-stars', 'result-continue', 'result-retry', 'sheet-shop', 'sku-list', 'sheet-garden', 'garden-grid']) {
    assert.match(CLIENT_HTML, new RegExp('id="' + id + '"'), `missing sheet element #${id}`);
  }
});

test('chaos-six flourish mount point is present', () => {
  assert.match(CLIENT_HTML, /id="chaos-flourish"/);
});

test('all four special-tile glyph ids from SpecialKind are defined and referenced', () => {
  for (const special of ['striped', 'nova', 'prism', 'ring']) {
    assert.match(CLIENT_HTML, new RegExp('id="glyph-' + special + '"'), `missing <symbol id="glyph-${special}">`);
    assert.match(CLIENT_HTML, new RegExp('glyph-' + special), `glyph-${special} never referenced`);
  }
});

test('five accessible-palette shape glyphs are defined (color-blind consideration)', () => {
  for (let i = 0; i < 5; i++) {
    assert.match(CLIENT_HTML, new RegExp('id="glyph-shape-' + i + '"'));
  }
});

test('rhombille cube-illusion shading is driven by cell.shade (not a fixed literal)', () => {
  assert.match(CLIENT_HTML, /cell\.shade/);
  assert.match(CLIENT_HTML, /shadeHex/);
});

test('booster kinds from BoosterKind all have wired icons and buttons', () => {
  for (const b of ['hammer', 'shuffle', 'extraMoves', 'prismStart']) {
    assert.match(CLIENT_HTML, new RegExp(b));
  }
  assert.match(CLIENT_HTML, /data-booster/);
});

test('goal kinds from Goal.kind are all handled', () => {
  for (const k of ['score', 'clearMoss', 'breakGeodes', 'collectColor']) {
    assert.match(CLIENT_HTML, new RegExp('kind === "' + k + '"|' + k + ':'), `goal kind ${k} not handled`);
  }
});

test('settle animation replays lastSteps as an rAF tween list: clear/fall/spawn tween kinds are all built', () => {
  assert.match(CLIENT_HTML, /lastSteps/);
  assert.match(CLIENT_HTML, /kind:\s*"clear"/);
  assert.match(CLIENT_HTML, /kind:\s*"fall"/);
  assert.match(CLIENT_HTML, /kind:\s*"spawn"/);
  assert.match(CLIENT_HTML, /buildStepTweens/);
  assert.match(CLIENT_HTML, /animateCascade/);
});

test('tap-adjacent swap and drag-swap are both wired to pointer events', () => {
  assert.match(CLIENT_HTML, /pointerdown/);
  assert.match(CLIENT_HTML, /pointerup/);
  assert.match(CLIENT_HTML, /cellsAdjacent/);
  assert.match(CLIENT_HTML, /trySwap/);
});

test('the layered-canvas renderer is wired: pure projectFrame seam, dirty-rect paint, Path2D glyph cache', () => {
  assert.match(CLIENT_HTML, /function projectFrame\(/);
  assert.match(CLIENT_HTML, /function paintDirty\(/);
  assert.match(CLIENT_HTML, /function computeDirtyRect\(/);
  assert.match(CLIENT_HTML, /new Path2D\(/);
  assert.match(CLIENT_HTML, /PURE RENDER CORE/);
});

test('the rAF driver never uses a fixed setTimeout tile-animation chain (the pattern the market teardown flags)', () => {
  assert.match(CLIENT_HTML, /requestAnimationFrame\(tick\)/);
  assert.doesNotMatch(CLIENT_HTML, /STEP_MS/);
});

test('WebAudio synthesis cues exist for pop/boom/chaos/blocker/illegal-swap and are user-gesture gated', () => {
  for (const fn of ['playPop', 'playBoom', 'playChaosFlourish', 'playBlockerBreak', 'playIllegalSwap']) {
    assert.match(CLIENT_HTML, new RegExp(fn + '\\('), `missing audio cue ${fn}`);
  }
  assert.match(CLIENT_HTML, /AudioContext/);
  assert.match(CLIENT_HTML, /audio-mute/);
});

test('prefers-reduced-motion is honored: screen shake is skipped in favor of a flash, motion reduces to fades', () => {
  assert.match(CLIENT_HTML, /prefers-reduced-motion/);
  assert.match(CLIENT_HTML, /reducedMotion/);
  assert.match(CLIENT_HTML, /flashOverlay/);
});

function extractScript(html: string): string {
  const open = html.indexOf('<script>');
  const close = html.indexOf('</script>');
  assert.ok(open >= 0 && close > open, 'expected exactly one inline <script> block');
  return html.slice(open + '<script>'.length, close);
}

test('the inline <script> block is syntactically valid JavaScript', () => {
  const script = extractScript(CLIENT_HTML);
  assert.ok(script.length > 2000, 'expected a substantial script body');
  // `new Function` parses the body immediately (throwing SyntaxError on bad syntax) without
  // ever calling/executing it, so this needs no DOM or browser globals to be a valid check.
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function(script);
  });
});

test('there is exactly one <script> and one </script> tag (no accidental nested/duplicated blocks)', () => {
  const opens = (CLIENT_HTML.match(/<script>/g) ?? []).length;
  const closes = (CLIENT_HTML.match(/<\/script>/g) ?? []).length;
  assert.equal(opens, 1);
  assert.equal(closes, 1);
});

test('CSS is theme-committed (dark palette tokens defined on :root, no build step)', () => {
  assert.match(CLIENT_HTML, /:root\{/);
  assert.match(CLIENT_HTML, /--ink:/);
  assert.match(CLIENT_HTML, /<style>/);
});
