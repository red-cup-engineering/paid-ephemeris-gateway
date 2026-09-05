/**
 * `app-yacht` — the Yacht face: pure DOM glue over `kernel-yacht.mjs`. Two-player pass-and-play
 * (no bot — the wave asked for a bot on Pig and Farkle only). Every category's "score now" and
 * "reroll EV" figure is the kernel's own, recomputed on every render. Keyboard-complete: digits
 * 1–5 toggle a die hold, Space rolls, and every category "Score" button is a real focusable
 * `<button>`.
 */
import { createEngine, applyIntent, categoryLiveEVs, dailySeed, YACHT_RULES } from './kernel-yacht.mjs';

const DIE_GLYPHS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const CATEGORY_LABELS = {
  ones: 'Ones', twos: 'Twos', threes: 'Threes', fours: 'Fours', fives: 'Fives', sixes: 'Sixes',
  'full-house': 'Full house', 'four-of-a-kind': 'Four of a kind',
  'little-straight': 'Little straight (1-2-3-4-5)', 'big-straight': 'Big straight (2-3-4-5-6)',
  choice: 'Choice', yacht: 'Yacht (all five match)',
};

const el = (id) => document.getElementById(id);
const els = {
  seedLabel: el('seed-label'),
  turnBanner: el('turn-banner'),
  rollsNote: el('rolls-note'),
  diceRow: el('dice-row'),
  btnRoll: el('btn-roll'),
  btnDaily: el('btn-new-daily'),
  btnRandom: el('btn-new-random'),
  status: el('status-panel'),
  log: el('log-list'),
  categoryBody: document.querySelector('#category-table tbody'),
  totalsBody: document.querySelector('#totals-table tbody'),
  ariaLive: el('aria-live'),
  categoryCount: el('category-count'),
};
els.categoryCount.textContent = String(YACHT_RULES.categories.length);

let state = null;

function randomSeed() {
  return `yacht-random-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function announce(text) {
  els.ariaLive.textContent = text;
}

function logLine(text) {
  const li = document.createElement('li');
  li.textContent = text;
  els.log.insertBefore(li, els.log.firstChild);
}

function describeEvents(events, actor) {
  for (const ev of events) {
    if (ev.kind === 'dice-roll') logLine(`${actor} rolled ${ev.dice.join(', ')}`);
    else if (ev.kind === 'scored') logLine(`${actor} scored ${CATEGORY_LABELS[ev.category]}: ${ev.points}`);
    else if (ev.kind === 'won') logLine(`${ev.player} won with ${ev.totals[ev.player]}!`);
  }
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function totalScore(scores) {
  return Object.values(scores).reduce((s, v) => s + (v ?? 0), 0);
}

function render() {
  els.seedLabel.textContent = state.data.seed;
  const active = state.players[state.activePlayerIndex];
  const won = state.phase === 'won';
  const hasRolled = state.data.rollsUsed > 0;

  els.turnBanner.innerHTML = won ? `<strong>${state.data.winner}</strong> won the game!` : `<strong>${active}</strong>'s turn`;
  els.rollsNote.textContent = won ? '' : `Roll ${state.data.rollsUsed} of ${YACHT_RULES.maxRolls} used this turn.`;

  els.diceRow.innerHTML = '';
  state.data.dice.forEach((pip, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'die';
    const held = state.data.held[i];
    if (held) btn.classList.add('die--held');
    if (pip === 0) btn.classList.add('die--pending');
    btn.textContent = pip === 0 ? '—' : DIE_GLYPHS[pip];
    btn.setAttribute('aria-pressed', String(held));
    btn.setAttribute('aria-label', `Die ${i + 1}${pip === 0 ? '' : `: ${pip}`}${held ? ', held' : ''}`);
    btn.disabled = won || !hasRolled || state.data.rollsUsed >= YACHT_RULES.maxRolls;
    btn.addEventListener('click', () => applyPlayerIntent({ kind: 'toggleHold', index: i }));
    els.diceRow.appendChild(btn);
  });

  els.btnRoll.disabled = won || state.data.rollsUsed >= YACHT_RULES.maxRolls;

  els.status.textContent = won ? `Game over — ${state.data.winner} wins.` : '';
  els.status.classList.toggle('won', won);

  const scoredCategories = new Set(Object.keys(state.data.scores[active] ?? {}));
  const evs = hasRolled
    ? categoryLiveEVs(state.data.dice, state.data.held, state.data.rollsUsed, scoredCategories)
    : YACHT_RULES.categories.map((category) => ({ category, scoreIfCommitNow: 0, rerollEV: null, alreadyScored: scoredCategories.has(category) }));

  els.categoryBody.innerHTML = '';
  for (const ev of evs) {
    const tr = document.createElement('tr');
    if (ev.alreadyScored) tr.classList.add('filled');
    const nameTd = document.createElement('td');
    nameTd.textContent = CATEGORY_LABELS[ev.category];
    const nowTd = document.createElement('td');
    nowTd.className = 'num';
    const evTd = document.createElement('td');
    evTd.className = 'num';
    const actionTd = document.createElement('td');

    if (ev.alreadyScored) {
      nowTd.textContent = String(state.data.scores[active][ev.category]);
      evTd.textContent = '—';
    } else if (!hasRolled) {
      nowTd.textContent = '—';
      evTd.textContent = '—';
    } else {
      nowTd.textContent = String(ev.scoreIfCommitNow);
      evTd.textContent = ev.rerollEV === null ? '—' : fmt(ev.rerollEV);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'category-pick';
      btn.textContent = `Score ${ev.scoreIfCommitNow}`;
      btn.disabled = won;
      btn.addEventListener('click', () => applyPlayerIntent({ kind: 'score', category: ev.category }));
      actionTd.appendChild(btn);
    }
    tr.append(nameTd, nowTd, evTd, actionTd);
    els.categoryBody.appendChild(tr);
  }

  els.totalsBody.innerHTML = '';
  for (const player of state.players) {
    const tr = document.createElement('tr');
    const isActive = !won && player === active;
    tr.innerHTML = `<td>${isActive ? '▶ ' : ''}${player}</td><td class="num">${totalScore(state.data.scores[player] ?? {})}</td>`;
    els.totalsBody.appendChild(tr);
  }
}

function startGame(seed) {
  state = createEngine(seed, 'you,friend');
  els.log.innerHTML = '';
  render();
  announce(`New game started, seed ${seed}`);
}

function applyPlayerIntent(intent) {
  if (state.phase === 'won') return;
  const actor = state.players[state.activePlayerIndex];
  let result;
  try {
    result = applyIntent(state, intent);
  } catch (err) {
    announce(err instanceof Error ? err.message : String(err));
    return;
  }
  state = result.state;
  describeEvents(result.events, actor);
  render();
}

els.btnRoll.addEventListener('click', () => applyPlayerIntent({ kind: 'roll' }));
els.btnDaily.addEventListener('click', () => startGame(dailySeed(new Date())));
els.btnRandom.addEventListener('click', () => startGame(randomSeed()));

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^[1-5]$/.test(event.key)) {
    const i = Number(event.key) - 1;
    applyPlayerIntent({ kind: 'toggleHold', index: i });
    event.preventDefault();
    return;
  }
  if (event.key === ' ') {
    if (!els.btnRoll.disabled) els.btnRoll.click();
    event.preventDefault();
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 't') { els.btnDaily.click(); event.preventDefault(); }
  else if (key === 'n') { els.btnRandom.click(); event.preventDefault(); }
});

startGame(dailySeed(new Date()));
