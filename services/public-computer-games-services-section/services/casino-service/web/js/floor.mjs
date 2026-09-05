// floor.mjs — makes the lobby ALIVE: a qwzspace-rendered canvas floor scene (table shapes, a slots
// bank, human/cast avatars with gentle presentation), a live jackpot ticker, a rolling event feed
// (cast dialogue as chat bubbles + a DOM list), presence count, and celebration effects on
// broadcast big wins. Talks to `server.mts`'s realtime floor room (`src/floor/floor.mts`) over a
// real WebSocket via `@red-cup-engineering/qwzspace/client-browser`'s `connectRoom`.
//
// DEGRADE GRACEFULLY: if `WebSocket` doesn't exist, or the room connection never opens, this
// module quietly leaves the floor panel in its static "the floor is warming up" state and does
// nothing else — `app.mjs`'s own balances/bundles/claim flow is completely independent of this
// file and keeps working either way. Nothing here throws past its own boundary.
//
// ZONE LAYOUT NOTE: `ZONE_CENTERS` below is a cosmetic canvas-coordinate convention that must stay
// in sync with `src/floor/world.mts`'s own `ZONE_CENTERS` (both files predate a shared "layout"
// endpoint) — a real seam, not an oversight; see this service's README "What's not here yet."

import { registerDrawable } from '/vendor/qwzspace/drawables.mjs';
import { createBackend } from '/vendor/qwzspace/render-2d.mjs';
import { createRenderLoop } from '/vendor/qwzspace/render-loop.mjs';
import { celebrate } from '/vendor/qwzspace/celebration.mjs';
import { createEffect, sampleEffect, presetSpec } from '/vendor/qwzspace/particles.mjs';
import { mergeSceneLayer } from '/vendor/qwzspace/project.mjs';
import { ensureAudioStarted, isSoundEnabled, setSoundEnabled, fireCue, duckAmbientFor } from './floor-audio.mjs';

const CANVAS_W = 640;
const CANVAS_H = 320;
const TICK_MS = 100;
const BUBBLE_TTL_MS = 4200;

// Mirrors src/floor/world.mts's own ZONE_CENTERS exactly — see this file's own header.
const ZONE_CENTERS = {
  lobby: { x: 0, y: 0 },
  blackjack: { x: -260, y: 40 },
  slots: { x: 260, y: 40 },
};
const CANVAS_CENTER_X = CANVAS_W / 2;
const CANVAS_CENTER_Y = CANVAS_H / 2 + 20;

function toCanvas(x, y) {
  return { x: CANVAS_CENTER_X + x * 0.75, y: CANVAS_CENTER_Y + y * 0.75 };
}

// ── backdrop drawables: the tables themselves, zero raster assets, per house doctrine ──────────
registerDrawable('floor-table-oval', {
  defaults: { w: 190, h: 90, color: '#0b3d2e' },
  build: (p) => [
    { type: 'path', ops: ellipsePathOps(p.w / 2, p.h / 2), fill: { type: 'radial', x1: 0, y1: -p.h * 0.2, x2: 0, y2: 0, r: p.w * 0.6, stops: [[0, '#154d38'], [1, p.color]] }, stroke: '#d4af37', lineWidth: 3 },
  ],
});
registerDrawable('floor-slot-bank', {
  defaults: { w: 210, h: 80, color: '#2a1f3d' },
  build: (p) => {
    const shapes = [{ type: 'rect', x: -p.w / 2, y: -p.h / 2, w: p.w, h: p.h, rx: 12, fill: p.color, stroke: '#d4af37', lineWidth: 3 }];
    const machines = 4;
    for (let i = 0; i < machines; i++) {
      const mx = -p.w / 2 + (i + 0.5) * (p.w / machines);
      shapes.push({ type: 'rect', x: mx - p.w / (machines * 3), y: -p.h * 0.28, w: p.w / (machines * 1.5), h: p.h * 0.56, rx: 4, fill: '#3d2f5c', stroke: '#e6b74a', lineWidth: 1 });
    }
    return shapes;
  },
});

function ellipsePathOps(rx, ry) {
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

function backdropEntities(tick) {
  const bj = toCanvas(ZONE_CENTERS.blackjack.x, ZONE_CENTERS.blackjack.y);
  const sl = toCanvas(ZONE_CENTERS.slots.x, ZONE_CENTERS.slots.y);
  const idleWobble = Math.sin(tick / 40) * 0.015; // a hair of idle motion so the floor never looks frozen
  return [
    { id: 'floor-table-blackjack', kind: 'table', role: 'table', x: bj.x, y: bj.y, z: 0, yaw: 0, layer: 'backdrop', sprite: 'floor-table-oval', spriteParams: {}, scale: 1 + idleWobble, opacity: 1, label: 'Blackjack' },
    { id: 'floor-table-slots', kind: 'table', role: 'table', x: sl.x, y: sl.y, z: 0, yaw: 0, layer: 'backdrop', sprite: 'floor-slot-bank', spriteParams: {}, scale: 1 - idleWobble, opacity: 1, label: 'Tideline Treasures' },
  ];
}

// ── the "immediate" buffer adapter — same pattern web/js/slots.mjs establishes, for the same
// reason: `composeFrame`'s tween/celebration composition is worth reusing even without a real
// InterpolationBuffer, and this floor's own WorldView already IS "current state" (see this file's
// header — the room ticks slowly and infrequently; smoothing between ticks buys little here). ────
function makeImmediateBuffer(getEntities, getTick) {
  return {
    sampleBrackets() {
      const entities = getEntities();
      const tick = getTick();
      return { left: { tick, entities }, right: { tick, entities }, alpha: 1, mode: 'between' };
    },
    sample() {
      return getEntities();
    },
  };
}

// ── state ───────────────────────────────────────────────────────────────────────────────────
let view = null; // the connected room's WorldView, once connected
let backend = null;
let renderLoop = null;
let tickCounter = 0;
let activeCelebrations = [];
let activeParticleEffects = [];
const bubbles = new Map(); // actorId -> { text, expiresAtMs }
const seenFeedEventIds = new Set();
let firstSnapshotSeen = false;
let displayedJackpot = 0;
let targetJackpot = 0;

function playerEntities() {
  if (view === null) return [];
  return view
    .entities()
    .filter((e) => e.kind === 'player')
    .map((e) => {
      const pos = toCanvas(Number(e.x) || 0, Number(e.y) || 0);
      return {
        id: e.id,
        kind: 'player',
        role: e.role,
        x: pos.x,
        y: pos.y,
        z: 0,
        yaw: 0,
        layer: 'pieces',
        sprite: e.sprite ?? 'chip',
        spriteParams: e.spriteParams ?? {},
        tint: e.tint,
        scale: 1,
        opacity: 1,
        label: e.name,
      };
    });
}

function bubbleEntities(nowMs) {
  const out = [];
  for (const [actorId, bubble] of [...bubbles.entries()]) {
    if (nowMs > bubble.expiresAtMs) {
      bubbles.delete(actorId);
      continue;
    }
    const owner = view?.get(actorId);
    if (owner === undefined) continue;
    const pos = toCanvas(Number(owner.x) || 0, Number(owner.y) || 0);
    const remaining = (bubble.expiresAtMs - nowMs) / BUBBLE_TTL_MS;
    out.push({
      id: `bubble-${actorId}`,
      kind: 'overlay',
      role: 'overlay',
      x: pos.x,
      y: pos.y - 26,
      z: 0,
      yaw: 0,
      layer: 'overlay',
      text: bubble.text,
      tint: '#fef3c7',
      textStyle: { font: '11px sans-serif', align: 'center' },
      opacity: Math.min(1, remaining * 2),
    });
  }
  return out;
}

function jackpotSprite() {
  const pos = toCanvas(0, -110);
  return { id: 'floor-jackpot-sprite', kind: 'jackpot', role: 'jackpot', x: pos.x, y: pos.y, z: 0, yaw: 0, layer: 'fx', sprite: 'gem', spriteParams: { radius: 14 }, tint: '#fde047', scale: 1, opacity: 1 };
}

function sceneEntities(nowMs) {
  const base = [...backdropEntities(tickCounter), jackpotSprite(), ...playerEntities(), ...bubbleEntities(nowMs)];
  if (activeParticleEffects.length === 0) return base;
  const extra = [];
  for (const effect of activeParticleEffects) {
    const { entries } = sampleEffect(effect, tickCounter);
    extra.push(...entries);
  }
  return extra.length > 0 ? mergeSceneLayer({ tick: tickCounter, entries: base, version: 2 }, extra).entries : base;
}

function setupRenderLoop() {
  const canvas = document.getElementById('floor-canvas');
  if (canvas === null) return;
  backend = createBackend({ mount: canvas, width: CANVAS_W, height: CANVAS_H, radius: 8 });
  const buffer = makeImmediateBuffer(() => sceneEntities(performance.now()), () => tickCounter);
  renderLoop = createRenderLoop({ backend, buffer, tweenOptions: { easing: 'easeOutCubic' }, getCelebrations: () => activeCelebrations });

  function frame(now) {
    tickCounter = Math.round(now / TICK_MS);
    if (Math.abs(displayedJackpot - targetJackpot) > 0.5) {
      displayedJackpot += (targetJackpot - displayedJackpot) * 0.08;
      renderJackpotText();
    } else if (displayedJackpot !== targetJackpot) {
      displayedJackpot = targetJackpot;
      renderJackpotText();
    }
    renderLoop.tickOnce();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── DOM chrome ──────────────────────────────────────────────────────────────────────────────

function renderJackpotText() {
  const el = document.getElementById('floor-jackpot-ticker');
  if (el !== null) el.textContent = Math.round(displayedJackpot).toLocaleString('en-US');
  // Keep the existing balances panel's own jackpot figure (app.mjs's one-time /balances read) in
  // sync too, once the floor is live — a live ticker that disagrees with the balances card would
  // read as a bug, not two independently-refreshed views of the same number.
  const legacy = document.getElementById('jackpot-balance');
  if (legacy !== null) legacy.textContent = Math.round(displayedJackpot).toLocaleString('en-US');
}

function renderPresence(count) {
  const el = document.getElementById('floor-presence-count');
  if (el !== null) el.textContent = String(count);
}

function feedLineText(e) {
  if (typeof e.text === 'string' && e.text.length > 0) return e.text;
  return `${e.actorName ?? 'Someone'} — ${e.type}`;
}

function renderFeedList() {
  const list = document.getElementById('floor-feed-list');
  if (list === null || view === null) return;
  const events = view
    .entities()
    .filter((e) => e.kind === 'feed-event')
    .sort((a, b) => (a.atTick ?? 0) - (b.atTick ?? 0));
  list.innerHTML = '';
  for (const e of events.slice(-30).reverse()) {
    const li = document.createElement('li');
    li.className = `floor-feed-item floor-feed-${e.type}`;
    li.textContent = feedLineText(e);
    list.appendChild(li);
  }
}

const TIER_CUE = { win: 'floor-win', 'big-win': 'floor-big-win', jackpot: 'floor-jackpot' };

function celebrateFeedEvent(e) {
  if (e.type === 'chat' || e.type === 'dialogue') {
    if (typeof e.actorId === 'string') bubbles.set(e.actorId, { text: e.text ?? '', expiresAtMs: performance.now() + BUBBLE_TTL_MS });
    fireCue('floor-chat');
    return;
  }
  const cue = TIER_CUE[e.type];
  if (cue === undefined) return;
  fireCue(cue);
  duckAmbientFor(cue === 'floor-jackpot' ? 'fanfare' : cue === 'floor-big-win' ? 'chime-major' : 'chime-minor');
  const spec = presetSpec('coin-fountain', { origin: { x: CANVAS_CENTER_X, y: CANVAS_CENTER_Y }, count: e.type === 'jackpot' ? 40 : e.type === 'big-win' ? 22 : 10, totalTicks: 40 });
  activeParticleEffects.push(createEffect({ seed: tickCounter + activeParticleEffects.length, spec, startTick: tickCounter }));
  if (e.type === 'jackpot' || e.type === 'big-win') {
    activeCelebrations.push(celebrate(e.type === 'jackpot' ? 'jackpot' : 'win', { tier: e.type === 'jackpot' ? 'epic' : 'major', seed: tickCounter, startTick: tickCounter, overrides: { text: e.text ?? (e.type === 'jackpot' ? 'JACKPOT!' : 'BIG WIN!') } }));
  }
  window.setTimeout(() => {
    activeParticleEffects = activeParticleEffects.filter((eff) => eff.startTick !== tickCounter);
    activeCelebrations = [];
  }, 3500);
}

function onSnapshot({ full }) {
  if (view === null) return;
  if (full && !firstSnapshotSeen) {
    // The initial full snapshot may carry the room's already-existing history (a viewer joining
    // mid-session) — mark it all as "already seen" so connecting to a lively floor doesn't fire a
    // confetti barrage for every win that already happened before this tab opened.
    for (const e of view.entities()) if (e.kind === 'feed-event') seenFeedEventIds.add(e.id);
    firstSnapshotSeen = true;
  }
  renderPresence(view.entities().filter((e) => e.kind === 'player').length);
  const jackpot = view.get('jackpot');
  if (jackpot !== undefined) targetJackpot = Number(jackpot.balance) || 0;
  renderFeedList();
  for (const e of view.entities()) {
    if (e.kind !== 'feed-event' || seenFeedEventIds.has(e.id)) continue;
    seenFeedEventIds.add(e.id);
    if (firstSnapshotSeen) celebrateFeedEvent(e);
  }
}

// ── connection ──────────────────────────────────────────────────────────────────────────────

function floorWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/`;
}

async function connectFloor() {
  const banner = document.getElementById('floor-status');
  if (typeof WebSocket === 'undefined') {
    if (banner !== null) banner.textContent = 'Live floor unavailable in this browser — showing the static lobby.';
    return;
  }
  try {
    const { connectRoom } = await import('/vendor/qwzspace/client-browser.mjs');
    const client = connectRoom(floorWsUrl(), {
      name: 'guest',
      onState: (state) => {
        if (banner === null) return;
        if (state === 'playing') banner.textContent = '';
        else if (state === 'disconnected' || state === 'error') banner.textContent = 'Reconnecting to the floor…';
      },
    });
    view = client.view;
    view.on('snapshot', onSnapshot);
    setupRenderLoop();
  } catch (err) {
    if (banner !== null) banner.textContent = 'Live floor unavailable right now — showing the static lobby.';
    // No rethrow: the rest of the lobby (app.mjs) must keep working regardless.
    void err;
  }
}

function wireSoundToggle() {
  const btn = document.getElementById('floor-sound-toggle-btn');
  if (btn === null) return;
  btn.textContent = isSoundEnabled() ? '\u{1F50A}' : '\u{1F507}';
  btn.setAttribute('aria-pressed', String(isSoundEnabled()));
  btn.addEventListener('click', () => {
    ensureAudioStarted();
    const enabled = !isSoundEnabled();
    setSoundEnabled(enabled);
    btn.textContent = enabled ? '\u{1F50A}' : '\u{1F507}';
    btn.setAttribute('aria-pressed', String(enabled));
  });
  // A user gesture is required before any audio can play — the first click anywhere on the floor
  // panel doubles as that gesture, exactly `slots.mjs`'s own "first Spin click" pattern.
  document.getElementById('floor-canvas')?.addEventListener('click', () => ensureAudioStarted(), { once: true });
}

async function bootFallbackSummary() {
  // No WS yet (or ever) — still show a real, if static-per-load, presence/jackpot/feed reading so
  // the floor never looks dead even in a degraded browser. See this file's header.
  try {
    const res = await fetch('/floor/summary');
    if (!res.ok) return;
    const summary = await res.json();
    renderPresence(summary.presenceCount);
    targetJackpot = summary.jackpot;
    displayedJackpot = summary.jackpot;
    renderJackpotText();
    const list = document.getElementById('floor-feed-list');
    if (list !== null) {
      list.innerHTML = '';
      for (const e of summary.recentEvents) {
        const li = document.createElement('li');
        li.className = `floor-feed-item floor-feed-${e.type}`;
        li.textContent = e.text;
        list.appendChild(li);
      }
    }
  } catch {
    /* the rest of the lobby still works without this — see this file's header */
  }
}

async function boot() {
  wireSoundToggle();
  await bootFallbackSummary();
  await connectFloor();
}

boot();
