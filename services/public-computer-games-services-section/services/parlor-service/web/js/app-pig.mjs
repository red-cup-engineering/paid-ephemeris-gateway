/**
 * `app-pig` — the Pig face: pure DOM glue over `kernel-pig.mjs`. Every rules/odds/bot decision
 * is the kernel's own — this file only renders `state` and turns clicks/keypresses into
 * intents. Keyboard-complete: every action is a real `<button>` (reachable by Tab, activated by
 * Enter/Space) plus documented single-key shortcuts (`R`/`H`/`T`/`N`) for fast play.
 */
import { createEngine, applyIntent, pigOddsForDecision, pigBotDecision, dailySeed, PIG_RULES } from './kernel-pig.mjs';

const DIE_GLYPHS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const HUMAN = 'you';
const BOT = 'bot';
const BOT_DELAY_MS = 550;

const el = (id) => document.getElementById(id);
const els = {
  seedLabel: el('seed-label'),
  turnBanner: el('turn-banner'),
  die: el('die'),
  turnTotal: el('turn-total-value'),
  oddsBust: el('odds-bust'),
  oddsContinue: el('odds-continue'),
  oddsEv: el('odds-ev'),
  oddsHold: el('odds-hold'),
  btnRoll: el('btn-roll'),
  btnHold: el('btn-hold'),
  btnDaily: el('btn-new-daily'),
  btnRandom: el('btn-new-random'),
  status: el('status-panel'),
  log: el('log-list'),
  scoreBody: document.querySelector('#score-table tbody'),
  ariaLive: el('aria-live'),
  target: el('target-value'),
};
els.target.textContent = String(PIG_RULES.target);

let state = null;
let lastPip = null;

function randomSeed() {
  return `pig-random-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
    else if (ev.kind === 'bust') logLine(`${actor} busted — turn total lost`);
    else if (ev.kind === 'banked') logLine(`${actor} held, banking ${ev.amount} (total ${ev.total})`);
    else if (ev.kind === 'won') logLine(`${ev.player} won!`);
  }
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function render() {
  els.seedLabel.textContent = state.data.seed;
  const active = state.players[state.activePlayerIndex];
  const won = state.phase === 'won';

  els.turnBanner.innerHTML = won
    ? `<strong>${state.data.winner}</strong> won the game!`
    : `<strong>${active}</strong>'s turn`;

  els.die.textContent = lastPip ? DIE_GLYPHS[lastPip] : '—';
  els.die.classList.toggle('die--pending', lastPip === null);
  els.turnTotal.textContent = String(state.data.turnTotal);

  const odds = pigOddsForDecision(state.data.turnTotal, PIG_RULES.sides);
  els.oddsBust.textContent = `${(odds.bustProbability * 100).toFixed(1)}%`;
  els.oddsContinue.textContent = `+${fmt(odds.expectedPipIfContinue)}`;
  els.oddsEv.textContent = `${odds.rollAgainEV >= 0 ? '+' : ''}${fmt(odds.rollAgainEV)}`;
  els.oddsEv.classList.toggle('ev-positive', odds.rollAgainEV > 0);
  els.oddsEv.classList.toggle('ev-negative', odds.rollAgainEV < 0);
  els.oddsHold.textContent = fmt(odds.holdValue);

  const yourTurn = !won && active === HUMAN;
  els.btnRoll.disabled = !yourTurn;
  els.btnHold.disabled = !yourTurn || state.data.turnTotal === 0;
  els.die.disabled = !yourTurn;

  els.status.textContent = won ? `Game over — ${state.data.winner} reached ${PIG_RULES.target}.` : '';
  els.status.classList.toggle('won', won);

  els.scoreBody.innerHTML = '';
  for (const player of state.players) {
    const tr = document.createElement('tr');
    const isActive = !won && player === active;
    tr.innerHTML = `<td>${isActive ? '▶ ' : ''}${player}</td><td class="num">${state.data.scores[player]}</td>`;
    els.scoreBody.appendChild(tr);
  }
}

function startGame(seed) {
  state = createEngine(seed, `${HUMAN},${BOT}`);
  lastPip = null;
  els.log.innerHTML = '';
  render();
  announce(`New game started, seed ${seed}`);
  maybeBotMove();
}

function applyPlayerIntent(intent) {
  if (state.phase === 'won') return;
  const actor = state.players[state.activePlayerIndex];
  const result = applyIntent(state, intent);
  state = result.state;
  const rollEvent = result.events.find((e) => e.kind === 'dice-roll');
  if (rollEvent) lastPip = rollEvent.dice[0];
  if (result.events.some((e) => e.kind === 'banked')) lastPip = null;
  describeEvents(result.events, actor);
  announce(result.events.map((e) => e.kind).join(', '));
  render();
  maybeBotMove();
}

function maybeBotMove() {
  if (state.phase === 'won') return;
  if (state.players[state.activePlayerIndex] !== BOT) return;
  els.btnRoll.disabled = true;
  els.btnHold.disabled = true;
  setTimeout(() => {
    if (state.phase === 'won' || state.players[state.activePlayerIndex] !== BOT) return;
    const decision = pigBotDecision(state);
    applyPlayerIntent({ kind: decision });
  }, BOT_DELAY_MS);
}

els.btnRoll.addEventListener('click', () => applyPlayerIntent({ kind: 'roll' }));
els.btnHold.addEventListener('click', () => applyPlayerIntent({ kind: 'hold' }));
els.die.addEventListener('click', () => applyPlayerIntent({ kind: 'roll' }));
els.btnDaily.addEventListener('click', () => startGame(dailySeed(new Date())));
els.btnRandom.addEventListener('click', () => startGame(randomSeed()));

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  switch (event.key.toLowerCase()) {
    case 'r':
      if (!els.btnRoll.disabled) els.btnRoll.click();
      break;
    case 'h':
      if (!els.btnHold.disabled) els.btnHold.click();
      break;
    case 't':
      els.btnDaily.click();
      break;
    case 'n':
      els.btnRandom.click();
      break;
    default:
      return;
  }
  event.preventDefault();
});

startGame(dailySeed(new Date()));
