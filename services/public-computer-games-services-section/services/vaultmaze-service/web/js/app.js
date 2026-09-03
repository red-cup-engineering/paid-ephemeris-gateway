/**
 * `app` — Lantern's face bootstrap. Wires the static compiled world + precomputed layout to
 * the live engine ports (`js/engine/*`), the localStorage save (`state.js`), the map
 * (`map.js`), and one shared review-modal component that drives gate passes, spaced reviews,
 * the daily lantern-walk, and kata runs alike (they differ only in what queue of cards they
 * feed it and what happens when it's done).
 */
import * as srs from './engine/srs.js';
import { computeLightCone, revealedTerritory } from './engine/lightcone.js';
import * as state from './state.js';
import { renderMap, roomCategory } from './map.js';
import { buildRoomQueue } from './gate.js';
import { dailyLanternWalk } from './dailywalk.js';
import { pickKataCards, kataIsAvailable, summarizeKataRun, awardedBelt } from './kata-ui.js';
import { initAnnouncer, announce, prefersReducedMotion, stageLabel } from './a11y.js';

// The wing/vault id is a runtime value (URL query string), not a compile-time literal — this is
// what lets one static face serve any compiled wing (house weiqi, or a VaultMaze-compiled
// foreign vault) without a rebuild: `index.html?wing=<id>` selects `data/<id>.json` +
// `data/<id>-layout.json`. Defaults to 'weiqi' so opening the page with no query string still
// works exactly as it always has.
const WING_ID = new URLSearchParams(location.search).get('wing') || 'weiqi';

const el = (id) => document.getElementById(id);
const svg = el('map');

let world = null;
let layout = null;
let saveState = null; // localStorage-backed player state, see state.js
let mapCtrl = null;
let session = null; // active review-modal session, see openSession()

function now() {
  return state.today();
}

function cardsByRoomMap(effCards) {
  const m = new Map();
  for (const c of effCards) {
    const list = m.get(c.roomId) ?? [];
    list.push(c);
    m.set(c.roomId, list);
  }
  return m;
}

function roomById(id) {
  return world.rooms.find((r) => r.id === id);
}

function hallById(id) {
  return world.halls.find((h) => h.id === id);
}

/** Recompute everything derived from `saveState` (effective cards, light cone, revealed
 * territory) — called after any state mutation and once at boot. */
function computeSnapshot() {
  const effCards = state.effectiveCards(saveState, world.cards);
  const t = now();
  const { states, reachable } = computeLightCone(world.rooms, world.doors, effCards, world.halls, t);
  const revealed = revealedTerritory(effCards);
  return { effCards, states, reachable, revealed, cardsByRoom: cardsByRoomMap(effCards), t };
}

let snapshot = null;

function persist() {
  state.saveState(saveState);
}

function applyReducedMotionClass() {
  const reduced = prefersReducedMotion(saveState.reducedMotion);
  document.documentElement.classList.toggle('reduce-motion', reduced);
  el('chk-reduced-motion').checked = saveState.reducedMotion === true;
}

// --- rendering ------------------------------------------------------------------------------

function renderAll(opts) {
  snapshot = computeSnapshot();
  applyReducedMotionClass();
  mapCtrl = renderMap(svg, world, layout, snapshot, {
    onActivate: (roomId) => onRoomActivate(roomId),
    onFocusRoom: (roomId) => onRoomFocus(roomId),
  });
  if (opts?.justLit && !prefersReducedMotion(saveState.reducedMotion)) {
    for (const roomId of opts.justLit) {
      const g = svg.querySelector(`[data-room-id="${cssEscape(roomId)}"]`);
      if (g) {
        g.classList.add('room-newly-lit');
        setTimeout(() => g.classList.remove('room-newly-lit'), 1600);
      }
    }
  }
  renderStreak();
  renderWalkTab();
  renderHallsTab();
  renderKataTab();
}

function cssEscape(s) {
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

function renderStreak() {
  const s = saveState.streak;
  const atRisk = state.streakAtRisk(s, snapshot.t);
  const frozen = '❄️'.repeat(s.freezeTokens);
  el('streak-display').innerHTML =
    `<strong>${s.current}</strong> day streak` +
    (s.longest > s.current ? ` (best ${s.longest})` : '') +
    (frozen ? ` <span title="${s.freezeTokens} freeze token(s) banked">${frozen}</span>` : '') +
    (atRisk && s.current > 0 ? ` <span class="streak-risk">— walk today to keep it</span>` : '');
}

function shortIntent(hall) {
  return hall.intent.map((v) => v.replace(/^[a-z]+:/, '')).join(' · ');
}

function renderHallsTab() {
  const container = el('tab-halls');
  container.innerHTML = '';
  const heading = document.createElement('h2');
  heading.textContent = `Halls (${world.halls.length})`;
  container.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'hall-list';
  const sorted = [...world.halls].sort((a, b) => (b.stable - a.stable) || b.rooms.length - a.rooms.length || (a.id < b.id ? -1 : 1));
  for (const hall of sorted) {
    const li = document.createElement('li');
    li.className = 'hall-row';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hall-row-btn';
    btn.innerHTML =
      `<span class="hall-intent">${escapeHtml(shortIntent(hall))}</span> ` +
      `<span class="hall-count">${hall.rooms.length} rooms</span>` +
      (hall.stable ? ' <span class="hall-stable-badge" title="Stable: intra-hall doors brace it (pebble-game check)">⚖ stable</span>' : '');
    btn.addEventListener('click', () => {
      mapCtrl.highlightHall(hall.id);
      renderHallDetail(hall);
      announce(`Highlighted hall: ${shortIntent(hall)}, ${hall.rooms.length} rooms.`);
    });
    li.appendChild(btn);
    list.appendChild(li);
  }
  container.appendChild(list);

  const detail = document.createElement('div');
  detail.id = 'hall-detail';
  container.appendChild(detail);
}

function renderHallDetail(hall) {
  const detail = el('hall-detail');
  detail.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = shortIntent(hall);
  detail.appendChild(h3);
  const ul = document.createElement('ul');
  for (const roomId of hall.rooms) {
    const room = roomById(roomId);
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = room ? room.title : roomId;
    btn.addEventListener('click', () => {
      mapCtrl.focusRoom(roomId);
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
  detail.appendChild(ul);
}

function renderWalkTab() {
  const container = el('tab-walk');
  container.innerHTML = '';
  const heading = document.createElement('h2');
  heading.textContent = 'Daily lantern-walk';
  container.appendChild(heading);

  const route = dailyLanternWalk(world.rooms, world.doors, snapshot.effCards, snapshot.states, snapshot.reachable, snapshot.t, saveState.walkPosition);
  const totalCards = route.reduce((sum, stop) => sum + stop.cards.length, 0);

  if (route.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Nothing due right now. The garden is holding steady — check back tomorrow, or gate a new frontier room on the map.';
    container.appendChild(p);
    return;
  }

  const p = document.createElement('p');
  p.textContent = `${totalCards} card${totalCards === 1 ? '' : 's'} due across ${route.length} room${route.length === 1 ? '' : 's'}.`;
  container.appendChild(p);

  const ol = document.createElement('ol');
  ol.className = 'walk-route';
  for (const stop of route) {
    const room = roomById(stop.roomId);
    const li = document.createElement('li');
    li.textContent = `${room ? room.title : stop.roomId} (${stop.cards.length})`;
    ol.appendChild(li);
  }
  container.appendChild(ol);

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.className = 'primary-action';
  startBtn.textContent = 'Start the walk';
  startBtn.addEventListener('click', () => {
    const queue = route.flatMap((stop) => stop.cards.map((card) => ({ roomId: stop.roomId, card })));
    openSession(queue, { kind: 'walk', title: 'Daily lantern-walk' });
  });
  container.appendChild(startBtn);
}

function renderKataTab() {
  const container = el('tab-kata');
  container.innerHTML = '';
  const heading = document.createElement('h2');
  heading.textContent = 'Kata';
  container.appendChild(heading);
  const intro = document.createElement('p');
  intro.textContent = 'Timed recall over a lit path. Available once every room on the path is currently reached.';
  container.appendChild(intro);

  const list = document.createElement('ul');
  list.className = 'kata-list';
  const sorted = [...layout.katas].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const kata of sorted) {
    const hall = hallById(kata.hallId);
    const available = kataIsAvailable(kata.path, snapshot.reachable);
    const kataState = state.effectiveKataState(saveState, kata.id);
    const belt = awardedBelt(kataState.recentRatios);

    const li = document.createElement('li');
    li.className = `kata-row${available ? '' : ' kata-row-locked'}`;
    const label = document.createElement('span');
    label.className = 'kata-label';
    label.textContent = `${hall ? shortIntent(hall) : kata.hallId} — ${kata.path.length} rooms`;
    li.appendChild(label);

    const beltBadge = document.createElement('span');
    beltBadge.className = `belt-badge belt-${belt}`;
    beltBadge.textContent = belt;
    li.appendChild(beltBadge);

    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.textContent = available ? 'Run kata' : 'Locked (light the path first)';
    runBtn.disabled = !available;
    runBtn.addEventListener('click', () => startKata(kata));
    li.appendChild(runBtn);

    list.appendChild(li);
  }
  container.appendChild(list);
}

function startKata(kata) {
  const picked = pickKataCards(kata.path, snapshot.cardsByRoom, snapshot.t);
  if (picked.length === 0) {
    announce('This kata path has no cards to run yet.');
    return;
  }
  openSession(
    picked.map((p) => ({ roomId: p.roomId, card: p.card })),
    { kind: 'kata', title: `Kata: ${hallById(kata.hallId) ? shortIntent(hallById(kata.hallId)) : kata.hallId}`, kataId: kata.id, results: [] },
  );
}

// --- room activation --------------------------------------------------------------------

function onRoomFocus(roomId) {
  const room = roomById(roomId);
  const cat = roomCategory(roomId, snapshot.states.get(roomId), snapshot.reachable, snapshot.revealed);
  if (cat === 'fog') return; // don't spoil undiscovered rooms via focus announcements
  announce(`${room.title}: ${stageLabel(snapshot.states.get(roomId))}, ${cat}.`);
}

function onRoomActivate(roomId) {
  const room = roomById(roomId);
  const cat = roomCategory(roomId, snapshot.states.get(roomId), snapshot.reachable, snapshot.revealed);

  if (cat === 'fog') {
    announce('This room has not been discovered yet.');
    return;
  }
  if (cat === 'ash') {
    announce(`${room.title} is out of reach right now — its territory is remembered, but the path to it has fogged. Relight the rooms leading here to restore it.`);
    return;
  }

  const roomCards = snapshot.cardsByRoom.get(roomId) ?? [];
  const { mode, cards, allowEarlyReview } = buildRoomQueue(roomCards, snapshot.t);

  if (mode === 'lit') {
    const worst = allowEarlyReview.reduce((a, c) => (a.stability < c.stability ? a : c));
    const daysLeft = Math.max(0, Math.round(srs.daysUntilRetention(worst.stability, 0.9) - (snapshot.t - (worst.lastReviewedAt ?? snapshot.t))));
    announce(`${room.title} is fully lit. Next due in about ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`);
    return;
  }

  const kind = mode === 'gate' ? 'gate' : 'review';
  openSession(
    cards.map((card) => ({ roomId, card })),
    { kind, title: room.title },
  );
}

// --- review-modal session, shared by gate / review / daily-walk / kata ---------------------

function openSession(queue, meta) {
  if (queue.length === 0) {
    closeSession(meta);
    return;
  }
  session = { queue, index: 0, meta, revealed: false, cardStart: performance.now() };
  el('review-overlay').hidden = false;
  el('review-close').focus();
  renderSessionCard();
}

function renderSessionCard() {
  const { queue, index, meta } = session;
  const item = queue[index];
  const room = roomById(item.roomId);
  el('review-room-title').textContent = meta.kind === 'walk' || meta.kind === 'kata' ? `${meta.title} — ${room.title}` : meta.title;
  el('review-progress').textContent = `Card ${index + 1} of ${queue.length}${meta.kind === 'gate' ? ' (gate pass — ungraded practice becomes your first review)' : ''}`;
  el('review-front').textContent = item.card.front;
  el('review-back').textContent = item.card.back;
  el('review-back').hidden = true;
  el('review-reveal').hidden = false;
  el('review-grades').hidden = true;
  el('review-result').textContent = '';
  el('review-kata-timer').hidden = meta.kind !== 'kata';
  session.revealed = false;
  session.responseTimeMs = undefined;
  session.cardStart = performance.now();
  stopKataTimer();
  if (meta.kind === 'kata') startKataTimer();
  announce(`${room.title}. ${item.card.kind} card. ${item.card.front}`);
}

let kataTimerHandle = null;

function startKataTimer() {
  const tick = () => {
    el('review-kata-timer').textContent = `${((performance.now() - session.cardStart) / 1000).toFixed(1)}s`;
  };
  tick();
  kataTimerHandle = setInterval(tick, 100);
}

function stopKataTimer() {
  if (kataTimerHandle !== null) {
    clearInterval(kataTimerHandle);
    kataTimerHandle = null;
  }
}

function revealCard() {
  if (!session || session.revealed) return;
  session.revealed = true;
  // Response time = time-to-reveal (the recall latency itself), not time-to-grade — grading is
  // a self-assessment made *after* recall and shouldn't inflate the kata's speed measurement.
  session.responseTimeMs = Math.round(performance.now() - session.cardStart);
  stopKataTimer();
  if (session.meta.kind === 'kata') {
    el('review-kata-timer').textContent = `${(session.responseTimeMs / 1000).toFixed(1)}s — recorded`;
  }
  el('review-back').hidden = false;
  el('review-reveal').hidden = true;
  el('review-grades').hidden = false;
  el('review-grades').querySelector('.grade').focus();
}

const GRADE_WORD = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' };
const GRADE_LABEL = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

function gradeCard(grade) {
  if (!session || !session.revealed) return;
  const { queue, index, meta } = session;
  const item = queue[index];
  const responseTimeMs = session.responseTimeMs ?? Math.round(performance.now() - session.cardStart);
  const outcome = GRADE_WORD[grade];

  if (meta.kind === 'kata') {
    const tFastMs = state.getTFast(saveState, item.card.id);
    meta.results.push({ outcome, responseTimeMs, tFastMs });
    saveState = state.recordKataTime(saveState, item.card.id, responseTimeMs, outcome);
  } else {
    const prior = { stability: item.card.stability, difficulty: item.card.difficulty, lastReviewedAt: item.card.lastReviewedAt };
    const next = srs.reviewCard(prior, grade, snapshot.t);
    saveState = state.recordCardReview(saveState, item.card.id, next);
    saveState = { ...saveState, streak: state.touchStreak(saveState.streak, snapshot.t) };
  }
  persist();

  el('review-result').textContent = `Graded: ${GRADE_LABEL[grade]}.`;
  session.index += 1;
  if (session.index < queue.length) {
    setTimeout(renderSessionCard, 220);
  } else {
    setTimeout(() => closeSession(meta), 260);
  }
}

function closeSession(meta) {
  el('review-overlay').hidden = true;
  stopKataTimer();
  const finishedMeta = meta ?? session?.meta;
  const finishedQueue = session?.queue ?? [];
  session = null;

  // Kata sessions never touch individual card SRS state (only the kata's own schedule, below),
  // so there is nothing to visually "just light" for them — only gate/review/walk sessions do.
  const justLitRoomIds = finishedMeta?.kind === 'kata' ? new Set() : new Set(finishedQueue.map((q) => q.roomId));

  // A kata abandoned partway through (closed early) is not scored — a partial run's ratio
  // would misrepresent the player's actual recall and could wrongly cost them a belt streak.
  const kataFullyRun = finishedMeta?.kind === 'kata' && finishedMeta.results?.length === finishedQueue.length && finishedQueue.length > 0;

  if (kataFullyRun) {
    const { ratio, grade } = summarizeKataRun(finishedMeta.results);
    const priorKataState = state.effectiveKataState(saveState, finishedMeta.kataId);
    const nextKataState = srs.reviewCard(
      { stability: priorKataState.stability, difficulty: priorKataState.difficulty, lastReviewedAt: priorKataState.lastRunAt },
      grade,
      now(),
    );
    saveState = state.recordKataRun(saveState, finishedMeta.kataId, { ...nextKataState, lastRunAt: now() }, ratio);
    persist();
    const kataState = state.effectiveKataState(saveState, finishedMeta.kataId);
    const belt = awardedBelt(kataState.recentRatios);
    announce(`Kata complete. Score ${Math.round(ratio * 100)} percent. Current belt: ${belt}.`);
  } else if (finishedMeta?.kind === 'kata') {
    announce('Kata abandoned — not scored.');
  } else if (finishedMeta) {
    announce(`${finishedMeta.title} complete.`);
  }

  if (finishedMeta?.kind === 'walk' && finishedQueue.length > 0) {
    saveState = { ...saveState, walkPosition: finishedQueue[finishedQueue.length - 1].roomId };
    persist();
  }

  renderAll({ justLit: [...justLitRoomIds] });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// --- tabs ------------------------------------------------------------------------------

function wireTabs() {
  const tabs = [
    ['tab-btn-walk', 'tab-walk'],
    ['tab-btn-halls', 'tab-halls'],
    ['tab-btn-kata', 'tab-kata'],
    ['tab-btn-legend', 'tab-legend'],
  ];
  function select(idx) {
    tabs.forEach(([btnId, panelId], i) => {
      el(btnId).setAttribute('aria-selected', String(i === idx));
      el(panelId).hidden = i !== idx;
    });
    tabs[idx][0] && el(tabs[idx][0]).focus();
  }
  tabs.forEach(([btnId], i) => {
    el(btnId).addEventListener('click', () => select(i));
    el(btnId).addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight') select((i + 1) % tabs.length);
      if (ev.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length);
    });
  });
}

// --- header actions --------------------------------------------------------------------

function wireHeader() {
  el('btn-export').addEventListener('click', () => {
    const json = state.exportStateJson(saveState);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultmaze-${WING_ID}-save.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    announce('Save exported.');
  });

  el('btn-import').addEventListener('click', () => el('file-import').click());
  el('file-import').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      saveState = state.importStateJson(text);
      persist();
      renderAll();
      announce('Save imported.');
    } catch {
      announce('Import failed: not a valid VaultMaze save file.');
    } finally {
      ev.target.value = '';
    }
  });

  el('chk-reduced-motion').addEventListener('change', (ev) => {
    saveState = { ...saveState, reducedMotion: ev.target.checked ? true : null };
    persist();
    applyReducedMotionClass();
  });
}

function wireReviewModal() {
  el('review-reveal').addEventListener('click', revealCard);
  el('review-close').addEventListener('click', () => closeSession(session?.meta));
  el('review-overlay').addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeSession(session?.meta);
  });
  for (const btn of el('review-grades').querySelectorAll('.grade')) {
    btn.addEventListener('click', () => gradeCard(Number(btn.dataset.grade)));
  }
}

// --- boot ------------------------------------------------------------------------------

async function boot() {
  initAnnouncer(el('announcer-mount'));
  try {
    const [worldRes, layoutRes] = await Promise.all([fetch(`data/${WING_ID}.json`), fetch(`data/${WING_ID}-layout.json`)]);
    if (!worldRes.ok || !layoutRes.ok) throw new Error('fetch failed');
    world = await worldRes.json();
    layout = await layoutRes.json();
  } catch (err) {
    el('load-status').textContent = 'Could not load VaultMaze data. Serve this directory with web/server.mjs rather than opening index.html directly (fetch of local files is blocked by the browser).';
    return;
  }

  saveState = state.loadState(WING_ID);
  el('wing-label').textContent = `Wing: ${world.wingId} — ${world.rooms.length} rooms, ${world.halls.length} halls`;
  svg.setAttribute('aria-label', `${world.wingId} vault map`);
  await renderVaultMeta();

  wireTabs();
  wireHeader();
  wireReviewModal();
  renderAll();
}

/** Honest-degradation disclosure, face-spec-adjacent: a wing compiled by the `vaultmaze` bin
 * from a foreign vault (Obsidian/org) writes an additional `data/<wing>-meta.json` alongside
 * the World/layout artifacts, naming its dialect and any degradations from the house baseline
 * (e.g. "no hard-door convention found — every door comes from links"). House wings (weiqi's
 * own `compile:weiqi`/`build:web` pipeline, untouched by VaultMaze) never produce this file —
 * its absence is silently and correctly treated as "nothing to disclose," never as an error,
 * so this never breaks the original house path. */
async function renderVaultMeta() {
  const mount = el('vault-meta');
  if (!mount) return;
  try {
    const res = await fetch(`data/${WING_ID}-meta.json`);
    if (!res.ok) return;
    const meta = await res.json();
    if (!Array.isArray(meta.degradations) || meta.degradations.length === 0) return;
    mount.hidden = false;
    mount.innerHTML =
      `<strong>Compiled as a${/^[aeiou]/i.test(meta.dialect ?? '') ? 'n' : ''} ${escapeHtml(meta.dialect ?? 'foreign')} vault.</strong> ` +
      meta.degradations.map((d) => `<span class="vault-meta-note">${escapeHtml(d)}</span>`).join(' ');
  } catch {
    // No meta file for this wing (the common case) — nothing to disclose, and that is not an
    // error: fail silently here rather than surface a spurious warning for every house wing.
  }
}

boot();
