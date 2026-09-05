// slots.mjs — "Tideline Treasures" spectacle client. Talks to server.mts's /slots/* JSON API
// only; the server is fully authoritative (every grid, every payout, every jackpot hit is decided
// and settled server-side in one /spin call) — this module's entire job is turning an already-
// known result into a good show: staggered reel stops, anticipation, win presentation tiers, and
// sound, using @red-cup-engineering/qwzspace's spectacle layer (drawables/tween/particles/camera/
// celebration/render-loop) and @red-cup-engineering/resonator (./slots-audio.mjs) for the parts a
// server response can't carry.
//
// ── Why a hand-rolled "immediate" buffer instead of qwzspace's real InterpolationBuffer ─────────
// `@red-cup-engineering/qwzspace/client`'s `createInterpolationBuffer()` exists to smooth a
// NETWORKED room's ticks against real transport jitter/latency — it deliberately renders a
// slightly-delayed, interpolated view of a server it does not control the timing of. This game has
// no such server round-trip during an animation: every reel-motion frame is this module's OWN,
// already-fully-resolved domain simulation (see `updateReels` below), computed fresh every
// `requestAnimationFrame` tick from real timestamps. Feeding that through the real buffer would
// only ever ADD an artificial rendering delay for no benefit, so `makeImmediateBuffer` below
// satisfies `render-loop.mjs#createRenderLoop`'s own `InterpolationBufferLike` interface
// (`sampleBrackets()`/`sample()`) with a `left === right` bracket at `alpha` fixed — a legitimate,
// documented shape (`InterpolationBracket`'s `mode` field allows exactly this) — so `composeFrame`'s
// real tween/celebration/camera composition pipeline still runs unmodified; only the position
// SOURCE is local instead of network-buffered. `tickOnce()` is still what actually renders each
// frame — this module drives its own rAF loop that updates the domain, then calls `tickOnce()`,
// matching the "fixed-step host with no rAF concept of its own" pattern render-loop.mjs's own
// header documents `tickOnce` for, just with the rAF driven here instead of inside qwzspace.

import './slots-drawables.mjs';
import { SYMBOL_NAMES } from './slots-drawables.mjs';
import { ensureAudioStarted, isSoundEnabled, setSoundEnabled, fireCue, playSpinRiser, playReelStopTick, duckAmbientFor } from './slots-audio.mjs';
import { createBackend } from '/vendor/qwzspace/render-2d.mjs';
import { createRenderLoop } from '/vendor/qwzspace/render-loop.mjs';
import { celebrate } from '/vendor/qwzspace/celebration.mjs';
import { createEffect, sampleEffect, presetSpec } from '/vendor/qwzspace/particles.mjs';
import { easingFn } from '/vendor/qwzspace/tween.mjs';
import { mergeSceneLayer } from '/vendor/qwzspace/project.mjs';

// ── layout ──────────────────────────────────────────────────────────────────────────────────
const REELS = 5;
const ROWS = 3;
const CANVAS_W = 800;
const CANVAS_H = 440;
const CELL_W = 128;
const CELL_H = 118;
const GRID_LEFT = (CANVAS_W - CELL_W * REELS) / 2 + CELL_W / 2;
const GRID_TOP = (CANVAS_H - CELL_H * ROWS) / 2 + CELL_H / 2;
const SYMBOL_SCALE_BY_NAME = { cowrie: 1.3, wild: 1.15, gem: 1.1, starfish: 1.0, pearl: 0.85, anchor: 1.1, wave: 1.0, scatter: 1.1 };

function cellX(reel) {
  return GRID_LEFT + reel * CELL_W;
}
function cellY(row) {
  return GRID_TOP + row * CELL_H;
}

// ── timing ──────────────────────────────────────────────────────────────────────────────────
const BASE_SPIN_MS = 650;
const REEL_STAGGER_MS = 220;
const SETTLE_MS = 550;
const SETTLE_ROWS = 5;
const ANTICIPATION_EXTRA_MS = 700;
const OUTCOME_PAUSE_MS = 420;
const WIN_DISPLAY_MS = 1200;
const BONUS_TRANSITION_MS = 1400;
const TICK_MS = 16;
const easeOutBounce = easingFn('easeOutBounce');

// ── session (mirrors app.mjs/blackjack.mjs exactly — same identity across every page) ─────────
const CLIENT_KEY_STORAGE = 'cowrie-casino-client-key';
const HOUSE_MATH_STORAGE = 'cowrie-casino-slots-housemath-visible';

let token = null;

function clientKey() {
  let key = localStorage.getItem(CLIENT_KEY_STORAGE);
  if (key === null) {
    key = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY_STORAGE, key);
  }
  return key;
}

async function api(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers ?? {}) };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...options, headers });
  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(responseBody.error ?? `request to ${path} failed (${res.status})`);
  return responseBody;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function announce(message) {
  setText('slots-message', message);
}

// ── game state ──────────────────────────────────────────────────────────────────────────────
let currentMachine = null; // last /slots/* response's `machine` field
let betPerLine = 5;
let autoSpinRemaining = 0;
let autoSpinActive = false;
let spinBusy = false;
let spinCounter = 0;

// ── the "immediate" buffer adapter — see this file's own header ───────────────────────────────
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

// ── reel domain simulation ─────────────────────────────────────────────────────────────────────

function randomFiller(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(SYMBOL_NAMES[Math.floor(Math.random() * SYMBOL_NAMES.length)]);
  return out;
}

/** Build the per-reel local animation plan for one outcome (base or a bonus spin). Purely
 *  cosmetic — the FINAL symbols always come from the server's own already-computed grid; nothing
 *  here decides a game outcome, only how it's revealed. */
function buildReelPlans(grid, spinStartMs, anticipationExtraReels) {
  return grid.map((column, reelIndex) => {
    const finalSymbols = [column[0], column[1], column[2]]; // top, mid, bottom
    const settleTail = randomFiller(SETTLE_ROWS);
    const filler = randomFiller(6);
    const extra = anticipationExtraReels.has(reelIndex) ? ANTICIPATION_EXTRA_MS : 0;
    const stopAt = spinStartMs + BASE_SPIN_MS + reelIndex * REEL_STAGGER_MS + extra;
    return { finalSymbols, settleTail, filler, spinStart: spinStartMs, stopAt, landedAt: null, tickPlayed: false };
  });
}

function reelSymbolsAt(plan, now) {
  if (now >= plan.stopAt) return plan.finalSymbols;
  const settleStart = plan.stopAt - SETTLE_MS;
  if (now < settleStart) {
    const cyclePos = Math.floor((now - plan.spinStart) / (SETTLE_MS / SETTLE_ROWS));
    const idx = ((cyclePos % plan.filler.length) + plan.filler.length) % plan.filler.length;
    return [plan.filler[idx], plan.filler[(idx + 1) % plan.filler.length], plan.filler[(idx + 2) % plan.filler.length]];
  }
  const t = Math.min(1, Math.max(0, (now - settleStart) / SETTLE_MS));
  const eased = easeOutBounce(t);
  const rowsRemaining = Math.round((1 - eased) * SETTLE_ROWS);
  const combined = [...plan.settleTail, ...plan.finalSymbols];
  const baseIdx = Math.min(SETTLE_ROWS, SETTLE_ROWS - rowsRemaining);
  return [combined[baseIdx], combined[baseIdx + 1], combined[baseIdx + 2]];
}

function reelIsSpinning(plan, now) {
  return now < plan.stopAt - SETTLE_MS;
}

// ── scene building ──────────────────────────────────────────────────────────────────────────

function symbolEntity(id, reel, row, symbol, opts = {}) {
  return {
    id,
    kind: 'symbol',
    role: 'symbol',
    x: cellX(reel),
    y: cellY(row) + (opts.yOffset ?? 0),
    z: 0,
    yaw: 0,
    label: symbol,
    layer: 'board',
    sprite: symbol,
    spriteParams: {},
    scale: (SYMBOL_SCALE_BY_NAME[symbol] ?? 1) * (opts.scaleMul ?? 1),
    rotation: opts.rotation ?? 0,
    opacity: opts.opacity ?? 1,
  };
}

function buildGridEntities(plans, now, landedGlow) {
  const entities = [];
  for (let reel = 0; reel < plans.length; reel++) {
    const plan = plans[reel];
    const symbols = reelSymbolsAt(plan, now);
    const spinning = reelIsSpinning(plan, now);
    for (let row = 0; row < ROWS; row++) {
      const glow = landedGlow?.has(`${reel}:${row}`) ?? false;
      const settleAge = plan.landedAt !== null ? now - plan.landedAt : Infinity;
      const pop = plan.landedAt !== null && settleAge < 220 ? 1 + 0.22 * (1 - settleAge / 220) : 1;
      entities.push(symbolEntity(`cell-${reel}-${row}`, reel, row, symbols[row], { scaleMul: glow ? pop * 1.08 : pop, opacity: 1 }));
      if (spinning) {
        // trailing ghost sprites above/below for a velocity-blur read on the fast-spin phase.
        entities.push(symbolEntity(`cell-${reel}-${row}-ghostA`, reel, row, symbols[row], { yOffset: -CELL_H * 0.32, opacity: 0.22, scaleMul: 0.94 }));
        entities.push(symbolEntity(`cell-${reel}-${row}-ghostB`, reel, row, symbols[row], { yOffset: CELL_H * 0.32, opacity: 0.14, scaleMul: 0.9 }));
      }
    }
  }
  return entities;
}

// ── canvas / render loop wiring ──────────────────────────────────────────────────────────────

let backend = null;
let renderLoop = null;
let activeCelebrations = [];
let activeCameraSpec = null;
let activeParticleEffects = []; // ad-hoc effects (line-trace glow) outside the celebration system
let currentEntities = [];
let tickCounter = 0;

function setupRenderLoop() {
  const canvas = document.getElementById('slots-canvas');
  backend = createBackend({ mount: canvas, width: CANVAS_W, height: CANVAS_H, radius: 8 });
  const buffer = makeImmediateBuffer(() => currentEntities, () => tickCounter);
  renderLoop = createRenderLoop({
    backend,
    buffer,
    tweenOptions: { easing: 'easeOutBack' },
    getCameraSpec: () => activeCameraSpec,
    getCelebrations: () => activeCelebrations,
  });

  let lastFrame = performance.now();
  function frame(now) {
    lastFrame = now;
    tickCounter = Math.round(now / TICK_MS);
    currentEntities = mergeAdHocEntities(baseSceneEntities(now), now);
    renderLoop.tickOnce();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  void lastFrame;
}

let sceneEntitiesFn = () => [];

function baseSceneEntities(now) {
  return sceneEntitiesFn(now);
}

function mergeAdHocEntities(entities, now) {
  const extra = [];
  for (const effect of activeParticleEffects) {
    const { entries } = sampleEffect(effect, tickCounter);
    extra.push(...entries);
  }
  void now;
  return extra.length > 0 ? mergeSceneLayer({ tick: tickCounter, entries: entities, version: 2 }, extra).entries : entities;
}

let lastDisplayedGrid = null;

function idleGridEntities() {
  const grid = currentMachine?.lastResult?.base?.grid ?? lastDisplayedGrid ?? Array.from({ length: REELS }, () => ['wave', 'anchor', 'starfish']);
  const entities = [];
  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < ROWS; row++) {
      entities.push(symbolEntity(`cell-${reel}-${row}`, reel, row, grid[reel]?.[row] ?? 'wave', {}));
    }
  }
  return entities;
}

// ── choreography ────────────────────────────────────────────────────────────────────────────

function betTierFor(payout, totalBet) {
  if (payout <= 0) return 'none';
  if (payout >= totalBet * 20) return 'epic';
  if (payout >= totalBet * 8) return 'major';
  return 'minor';
}

function lineWinCells(lineWin, rules) {
  const pattern = rules.paylinesPatterns?.[lineWin.line];
  if (!pattern) return [];
  const cells = [];
  for (let reel = 0; reel < lineWin.count; reel++) cells.push({ reel, row: pattern[reel] });
  return cells;
}

/** Fire a sparkle-trail glow sweeping across a winning line's own cells, staggered so it reads as
 *  a trace rather than a simultaneous flash — the literal "line-trace glow via sparkle-trail"
 *  choreography this build calls for. */
function fireLineTraceGlow(cells, tint) {
  const positions = cells.map((c, i) => ({ tick: tickCounter + i * 4, x: cellX(c.reel), y: cellY(c.row) }));
  const spec = presetSpec('sparkle-trail', { positions, trailTicks: 60, tint, scale: 1.6 });
  activeParticleEffects.push(createEffect({ seed: tickCounter + cells.length, spec, startTick: tickCounter }));
}

function fireWinGlowAt(x, y, tint) {
  const spec = presetSpec('win-glow', { origin: { x, y }, periodTicks: 10, maxScale: 2.2, tint });
  activeParticleEffects.push(createEffect({ seed: Math.floor(x * 7 + y * 13), spec, startTick: tickCounter, }));
}

function fireCoinFountain(x, y, intensity) {
  const spec = presetSpec('coin-fountain', { origin: { x, y }, count: Math.round(14 * intensity), totalTicks: Math.round(40 * intensity) });
  activeParticleEffects.push(createEffect({ seed: tickCounter, spec, startTick: tickCounter }));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Play exactly one outcome (base or one bonus spin) to completion — spin-up, staggered stops
 *  with anticipation, then win presentation. Returns once the outcome's own display window has
 *  fully elapsed. */
async function playOutcome(outcome, rules, isBonus, betPerLineForRound, totalBetForRound) {
  spinCounter += 1;
  const spinId = `spin-${spinCounter}`;
  const spinStartMs = performance.now();

  // Anticipation: any reel whose FINAL symbol is a scatter gets flagged for extra dwell time on
  // whichever reel(s) land after the 2nd scatter is already visible — approximated here (the
  // full outcome is already known server-side) by extending every reel from the 3rd scatter
  // onward when 2+ scatters are present anywhere in the final grid.
  const scatterReels = outcome.grid.map((col, i) => (col.includes('scatter') ? i : -1)).filter((i) => i >= 0);
  const anticipationExtraReels = new Set();
  if (scatterReels.length >= 2) {
    for (let r = 0; r < REELS; r++) if (r > scatterReels[1]) anticipationExtraReels.add(r);
  }

  const plans = buildReelPlans(outcome.grid, spinStartMs, anticipationExtraReels);
  sceneEntitiesFn = (now) => buildGridEntities(plans, now, null);

  playSpinRiser(spinId, (BASE_SPIN_MS + REEL_STAGGER_MS * REELS + SETTLE_MS + ANTICIPATION_EXTRA_MS) / 1000);
  if (anticipationExtraReels.size > 0) {
    activeCameraSpec = { zoomTo: { from: 1, to: 1.08, startTick: tickCounter, durationTicks: 20, easing: 'easeOutBack' } };
    fireCue('anticipation');
  }

  // wait for every reel to land, firing a stop tick + camera settle as each one does
  for (let reel = 0; reel < REELS; reel++) {
    const plan = plans[reel];
    const waitMs = Math.max(0, plan.stopAt - performance.now());
    await sleep(waitMs);
    plan.landedAt = performance.now();
    playReelStopTick(spinId, reel);
    fireCue('reel-stop');
  }
  activeCameraSpec = null;

  // ── win presentation ──────────────────────────────────────────────────────────────────────
  const tier = betTierFor(outcome.totalPayout, totalBetForRound);
  if (outcome.lineWins.length > 0 && rules.paylinesPatterns) {
    const palette = ['#f2cf5b', '#7fe3d1', '#ff9f6b', '#c792ea', '#7fd4ff'];
    outcome.lineWins.forEach((lw, i) => {
      const cells = lineWinCells(lw, rules);
      fireLineTraceGlow(cells, palette[i % palette.length]);
    });
  }
  if (outcome.scatterCount >= rules.scatterTriggerCount) {
    for (let reel = 0; reel < REELS; reel++) {
      for (let row = 0; row < ROWS; row++) if (outcome.grid[reel][row] === 'scatter') fireWinGlowAt(cellX(reel), cellY(row), '#e6b74a');
    }
  }

  if (tier !== 'none') {
    // fireCue() forwards only {intensity, source} to the player, never a per-call seed (see
    // slots-audio.mjs's own header) — the win chime's actual seeded variety comes from
    // duckAmbientFor()'s own gameAudio.resolve() call right below, which does honor one.
    fireCue(`win-${tier}`);
    duckAmbientFor(`chime-${tier}`, { seed: spinId });
    fireCoinFountain(CANVAS_W / 2, CANVAS_H * 0.65, tier === 'epic' ? 2 : tier === 'major' ? 1.4 : 0.8);
    if (tier === 'major' || tier === 'epic') {
      activeCelebrations.push(celebrate('win', { tier: tier === 'epic' ? 'epic' : 'major', seed: spinCounter, startTick: tickCounter }));
      fireCue('coin-shower');
    }
  }
  if (outcome.freeSpinsAwarded > 0 && !isBonus) {
    fireCue('free-spins-triggered');
  }
  if (outcome.jackpotHit) {
    // celebrate('jackpot', ...) already carries its own zoom-punch + shake camera spec, and
    // composeFrame gives an active celebration's own camera pose priority over the caller's
    // baseline `getCameraSpec()` one every frame — no separate activeCameraSpec assignment needed.
    activeCelebrations.push(celebrate('jackpot', { tier: 'epic', seed: spinCounter + 1000, startTick: tickCounter, overrides: { text: 'JACKPOT!' } }));
    fireCue('jackpot');
  }

  showOutcomeBanner(outcome, betPerLineForRound, isBonus);
  lastDisplayedGrid = outcome.grid;
  await sleep(tier === 'none' ? OUTCOME_PAUSE_MS : WIN_DISPLAY_MS);
  hideOutcomeBanner();
  // Every ad-hoc particle effect and celebration plan pushed above is scoped to THIS outcome's
  // own display window — without clearing both here, `activeCelebrations` in particular would
  // grow unboundedly across a long session (sampleCelebration keeps returning cheap-but-nonzero
  // work for an expired plan forever; it never self-evicts, since qwzspace's own celebration
  // module is deliberately state-free and leaves lifecycle ownership to the caller).
  activeParticleEffects = [];
  activeCelebrations = [];
  activeCameraSpec = null;
}

function showOutcomeBanner(outcome, betPerLineForRound, isBonus) {
  const banner = document.getElementById('slots-banner');
  if (banner === null) return;
  if (outcome.jackpotHit) {
    banner.textContent = `JACKPOT! +${outcome.totalPayout} chips`;
  } else if (outcome.totalPayout > 0) {
    banner.textContent = `${isBonus ? 'Free spin' : 'Spin'} win: +${outcome.totalPayout} chips`;
  } else if (outcome.freeSpinsAwarded > 0) {
    banner.textContent = `${outcome.freeSpinsAwarded} free spins!`;
  } else {
    banner.hidden = true;
    void betPerLineForRound;
    return;
  }
  banner.hidden = false;
}

function hideOutcomeBanner() {
  const banner = document.getElementById('slots-banner');
  if (banner) banner.hidden = true;
}

// ── House Math panel ────────────────────────────────────────────────────────────────────────

function houseMathVisible() {
  return localStorage.getItem(HOUSE_MATH_STORAGE) === 'true';
}

function pct(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function renderHouseMath(machine) {
  const panel = document.getElementById('house-math-panel');
  const grid = document.getElementById('house-math-grid');
  if (panel === null || grid === null) return;
  const visible = houseMathVisible();
  panel.hidden = !visible;
  if (!visible) return;
  const math = machine.houseMath;
  const rows = [
    ['Reel RTP (exact enumeration)', pct(math.reelRTP)],
    ['Free-spin contribution (exact closed form)', `+${pct(math.freeSpinRTPContribution)}`],
    ['Overall RTP (pre-rake)', pct(math.overallRTP)],
    ['Effective RTP (jackpot-rake steady-state est.)', pct(math.effectiveRTPWithJackpotRecycling)],
    ['Scatter trigger probability', pct(math.scatterTriggerProbability)],
    ['Expected free spins per trigger', math.expectedFreeSpinsPerTrigger.toFixed(2)],
    ['Jackpot odds', `1 in ${math.jackpotOddsOneIn.toLocaleString('en-US')}`],
    ['Expected loss per 100 spins (default bet)', `${Math.round(math.expectedLossPer100SpinsAtDefaultBet)} chips`],
    ['Enumerated combinations (audit figure)', math.combinations.toLocaleString('en-US')],
  ];
  grid.innerHTML = rows.map(([label, value]) => `<div class="house-math-row"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function renderPaytable(machine) {
  const content = document.getElementById('paytable-content');
  if (content === null) return;
  const odds = machine.houseMath.perSymbolOdds
    .map((o) => `<li>${o.symbol}: ${(o.probability * 100).toFixed(1)}% per reel position</li>`)
    .join('');
  content.innerHTML = `
    <p>${machine.rules.reelCount} reels &times; ${machine.rules.rows} rows &middot; ${machine.rules.paylineCount} paylines &middot;
    wild substitutes for every paying symbol &middot; ${machine.rules.scatterTriggerCount}+ scatters trigger free spins at
    ${machine.rules.freeSpinMultiplier}x payouts, retriggerable.</p>
    <p>Bets ${machine.rules.minBetPerLine}&ndash;${machine.rules.maxBetPerLine} chips per line.</p>
    <p>Per-position symbol odds on the shared reel strip:</p>
    <ul>${odds}</ul>
  `;
}

// ── controls / rendering the DOM chrome ────────────────────────────────────────────────────────

function renderBalances(machine, status) {
  setText('slots-chip-balance', String(status.chips));
  setText('slots-jackpot-balance', String(status.jackpot));
  setText('slots-spins-played', String(machine.spinsPlayed));
}

function renderBetControls(machine) {
  setText('bet-per-line-amount', String(betPerLine));
  setText('total-bet-amount', String(betPerLine * machine.rules.paylineCount));
  const spinBtn = document.getElementById('spin-btn');
  if (spinBtn) spinBtn.disabled = spinBusy || !machine.actions.canSpin;
}

let cachedPaylinePatterns = null;
async function fetchPaylinePatterns() {
  if (cachedPaylinePatterns !== null) return cachedPaylinePatterns;
  try {
    const result = await api('/slots/paylines');
    cachedPaylinePatterns = result.paylines;
  } catch {
    cachedPaylinePatterns = null;
  }
  return cachedPaylinePatterns;
}

/** The server's own `rules` response doesn't carry payline row-patterns (gameplay never needed
 *  them — the server already resolved every line win server-side); the client's own line-trace
 *  glow choreography needs to know WHICH cells a given `lineWins[].line` index touches, so this
 *  attaches the (cached-after-first-fetch) pattern list onto every machine object this page
 *  receives, not just the ones `refreshFromResponse` renders — `runSpin` needs it too, on the
 *  raw `/slots/spin` response, before a single frame of that spin's own choreography plays. */
async function attachPaylinePatterns(machine) {
  machine.rules.paylinesPatterns = await fetchPaylinePatterns();
  return machine;
}

async function refreshFromResponse(response) {
  currentMachine = await attachPaylinePatterns(response.machine);
  renderBalances(currentMachine, response.status);
  renderBetControls(currentMachine);
  renderHouseMath(currentMachine);
  renderPaytable(currentMachine);
}

// ── spin lifecycle ──────────────────────────────────────────────────────────────────────────

async function runSpin() {
  if (spinBusy || currentMachine === null || !currentMachine.actions.canSpin) return;
  spinBusy = true;
  renderBetControls(currentMachine);
  announce('');
  try {
    ensureAudioStarted();
    const response = await api('/slots/spin', { method: 'POST', body: JSON.stringify({ betPerLine }) });
    const machine = await attachPaylinePatterns(response.machine);
    currentMachine = machine;
    renderBalances(machine, response.status);

    const result = machine.lastResult;
    const rules = machine.rules;
    await playOutcome(result.base, rules, false, result.betPerLine, result.totalBet);
    for (const bonus of result.bonusSpins) {
      showTransitionBanner(`Free spin ${result.bonusSpins.indexOf(bonus) + 1} / ${result.bonusSpins.length}`);
      await sleep(300);
      await playOutcome(bonus, rules, true, result.betPerLine, result.totalBet);
    }
    if (result.bonusSpins.length > 0) {
      showTransitionBanner(`Bonus complete: +${result.totalPayout} chips`, BONUS_TRANSITION_MS);
      await sleep(BONUS_TRANSITION_MS);
      hideOutcomeBanner();
    }

    const collected = await api('/slots/collect', { method: 'POST' });
    await refreshFromResponse(collected);
  } catch (err) {
    announce(err.message);
  } finally {
    sceneEntitiesFn = idleGridEntities;
    spinBusy = false;
    renderBetControls(currentMachine);
    if (autoSpinActive) await continueAutoSpin();
  }
}

function showTransitionBanner(text, holdMs = 900) {
  const banner = document.getElementById('slots-banner');
  if (banner === null) return;
  banner.hidden = false;
  banner.textContent = text;
  void holdMs;
}

async function continueAutoSpin() {
  if (autoSpinRemaining <= 0 || currentMachine === null || !currentMachine.actions.canSpin) {
    stopAutoSpin(); // out of spins, or out of chips — either way, don't leave the Stop button stuck showing
    return;
  }
  autoSpinRemaining -= 1;
  updateAutoSpinUi();
  await runSpin();
}

function updateAutoSpinUi() {
  const stopBtn = document.getElementById('autospin-stop-btn');
  const select = document.getElementById('autospin-count');
  if (stopBtn) stopBtn.hidden = !autoSpinActive;
  if (select) select.disabled = autoSpinActive;
}

function stopAutoSpin() {
  autoSpinActive = false;
  autoSpinRemaining = 0;
  updateAutoSpinUi();
  const select = document.getElementById('autospin-count');
  if (select) select.value = '0';
}

// ── boot ────────────────────────────────────────────────────────────────────────────────────

function wireControls() {
  document.getElementById('spin-btn')?.addEventListener('click', () => void runSpin());
  document.getElementById('bet-up-btn')?.addEventListener('click', () => {
    if (currentMachine === null) return;
    betPerLine = Math.min(currentMachine.rules.maxBetPerLine, betPerLine + 1);
    renderBetControls(currentMachine);
  });
  document.getElementById('bet-down-btn')?.addEventListener('click', () => {
    if (currentMachine === null) return;
    betPerLine = Math.max(currentMachine.rules.minBetPerLine, betPerLine - 1);
    renderBetControls(currentMachine);
  });
  document.getElementById('house-math-checkbox')?.addEventListener('change', (e) => {
    localStorage.setItem(HOUSE_MATH_STORAGE, e.target.checked ? 'true' : 'false');
    if (currentMachine) renderHouseMath(currentMachine);
  });
  document.getElementById('paytable-btn')?.addEventListener('click', () => {
    const panel = document.getElementById('paytable-panel');
    if (panel) panel.hidden = !panel.hidden;
  });
  document.getElementById('sound-toggle-btn')?.addEventListener('click', (e) => {
    const enabled = !isSoundEnabled();
    setSoundEnabled(enabled);
    e.target.textContent = enabled ? '\u{1F50A}' : '\u{1F507}';
    e.target.setAttribute('aria-pressed', String(enabled));
  });
  document.getElementById('autospin-count')?.addEventListener('change', (e) => {
    const n = Number(e.target.value);
    if (n > 0) {
      autoSpinActive = true;
      autoSpinRemaining = n;
      updateAutoSpinUi();
      if (!spinBusy) void runSpin();
    }
  });
  document.getElementById('autospin-stop-btn')?.addEventListener('click', () => stopAutoSpin());
}

async function boot() {
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.textContent = isSoundEnabled() ? '\u{1F50A}' : '\u{1F507}';
    soundBtn.setAttribute('aria-pressed', String(isSoundEnabled()));
  }
  const houseMathCheckbox = document.getElementById('house-math-checkbox');
  if (houseMathCheckbox) houseMathCheckbox.checked = houseMathVisible();

  sceneEntitiesFn = idleGridEntities;
  setupRenderLoop();
  wireControls();

  try {
    const session = await api('/session', { method: 'POST', body: JSON.stringify({ clientKey: clientKey() }) });
    token = session.token;
  } catch (err) {
    announce(`Could not reach the casino: ${err.message}`);
    return;
  }

  try {
    const existing = await api('/slots/state');
    await refreshFromResponse(existing);
    announce('Welcome back to Tideline Treasures.');
  } catch {
    try {
      const created = await api('/slots/new-machine', { method: 'POST', body: JSON.stringify({ seed: crypto.randomUUID() }) });
      await refreshFromResponse(created);
      betPerLine = created.machine.rules.defaultBetPerLine;
      renderBetControls(created.machine);
      announce('New machine — place your bet and spin.');
    } catch (err) {
      announce(err.message);
    }
  }
  sceneEntitiesFn = idleGridEntities;
}

boot();
