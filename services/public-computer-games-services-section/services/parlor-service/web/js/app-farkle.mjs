/**
 * `app-farkle` — the Farkle face: pure DOM glue over `kernel-farkle.mjs`. Every rules/odds/bot
 * decision is the kernel's own. Keyboard-complete: digits 1–6 toggle a die on the table, plus
 * plain focusable buttons for every action.
 */
import {
  createEngine,
  applyIntent,
  farkleOddsForDecision,
  farkleBotDecision,
  dailySeed,
  FARKLE_RULES,
} from './kernel-farkle.mjs';

const DIE_GLYPHS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const HUMAN = 'you';
const BOT = 'bot';
const BOT_DELAY_MS = 650;

const el = (id) => document.getElementById(id);
const els = {
  seedLabel: el('seed-label'),
  turnBanner: el('turn-banner'),
  diceRemainingNote: el('dice-remaining-note'),
  diceRow: el('dice-row'),
  turnPoints: el('turn-points-value'),
  oddsBust: el('odds-bust'),
  oddsAvg: el('odds-avg'),
  oddsEv: el('odds-ev'),
  btnRoll: el('btn-roll'),
  btnSetAside: el('btn-set-aside'),
  btnBank: el('btn-bank'),
  btnDaily: el('btn-new-daily'),
  btnRandom: el('btn-new-random'),
  status: el('status-panel'),
  log: el('log-list'),
  scoreBody: document.querySelector('#score-table tbody'),
  ariaLive: el('aria-live'),
  entryValue: el('entry-value'),
  targetValue: el('target-value'),
};
els.entryValue.textContent = String(FARKLE_RULES.entryThreshold);
els.targetValue.textContent = String(FARKLE_RULES.targetScore);

let state = null;
let selected = new Set();

function randomSeed() {
  return `farkle-random-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
    else if (ev.kind === 'bust') logLine(`${actor} busted — turn points lost`);
    else if (ev.kind === 'set-aside') logLine(`${actor} set aside ${ev.dice.join(', ')} for ${ev.points}`);
    else if (ev.kind === 'hot-dice') logLine(`${actor} cleared the pool — hot dice, six back in play`);
    else if (ev.kind === 'banked') logLine(`${actor} banked ${ev.amount} (total ${ev.total})`);
    else if (ev.kind === 'won') logLine(`${ev.player} won!`);
  }
}

function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function render() {
  els.seedLabel.textContent = state.data.seed;
  const active = state.players[state.activePlayerIndex];
  const won = state.phase === 'won';
  const yourTurn = !won && active === HUMAN;
  const dice = state.data.currentRoll;

  els.turnBanner.innerHTML = won ? `<strong>${state.data.winner}</strong> won the game!` : `<strong>${active}</strong>'s turn`;
  els.turnPoints.textContent = String(state.data.turnPoints);

  els.diceRow.innerHTML = '';
  if (dice) {
    els.diceRemainingNote.textContent = 'Select the dice you want to set aside, then set them aside.';
    dice.forEach((pip, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'die';
      btn.textContent = DIE_GLYPHS[pip];
      btn.setAttribute('aria-pressed', String(selected.has(i)));
      btn.setAttribute('aria-label', `Die ${i + 1}: ${pip}${selected.has(i) ? ', selected' : ''}`);
      btn.disabled = !yourTurn;
      if (selected.has(i)) btn.classList.add('die--held');
      btn.addEventListener('click', () => {
        if (selected.has(i)) selected.delete(i);
        else selected.add(i);
        render();
      });
      els.diceRow.appendChild(btn);
    });
  } else {
    els.diceRemainingNote.textContent = `${state.data.diceRemaining} ${state.data.diceRemaining === 1 ? 'die' : 'dice'} ready to roll.`;
    for (let i = 0; i < state.data.diceRemaining; i++) {
      const span = document.createElement('span');
      span.className = 'die die--pending';
      span.textContent = '—';
      els.diceRow.appendChild(span);
    }
  }

  const odds = farkleOddsForDecision(state.data.diceRemaining, state.data.turnPoints);
  els.oddsBust.textContent = `${(odds.bustProbability * 100).toFixed(1)}%`;
  els.oddsAvg.textContent = `+${fmt(odds.averageScore)}`;
  els.oddsEv.textContent = `${odds.rollAgainEV >= 0 ? '+' : ''}${fmt(odds.rollAgainEV)}`;
  els.oddsEv.classList.toggle('ev-positive', odds.rollAgainEV > 0);
  els.oddsEv.classList.toggle('ev-negative', odds.rollAgainEV < 0);

  els.btnRoll.disabled = !yourTurn || dice !== null;
  els.btnSetAside.disabled = !yourTurn || dice === null || selected.size === 0;
  const bankedScore = state.data.scores[active] ?? 0;
  const onBoard = bankedScore > 0;
  const canBank = state.data.turnPoints > 0 && (onBoard || state.data.turnPoints >= FARKLE_RULES.entryThreshold);
  els.btnBank.disabled = !yourTurn || dice !== null || !canBank;

  els.status.textContent = won ? `Game over — ${state.data.winner} reached ${FARKLE_RULES.targetScore}.` : '';
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
  selected = new Set();
  els.log.innerHTML = '';
  render();
  announce(`New game started, seed ${seed}`);
  maybeBotMove();
}

function tryApply(intent) {
  try {
    return applyIntent(state, intent);
  } catch (err) {
    announce(err instanceof Error ? err.message : String(err));
    logLine(`(rejected) ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

function applyPlayerIntent(intent) {
  if (state.phase === 'won') return;
  const actor = state.players[state.activePlayerIndex];
  const result = tryApply(intent);
  if (!result) {
    render();
    return;
  }
  state = result.state;
  selected = new Set();
  describeEvents(result.events, actor);
  render();
  maybeBotMove();
}

function maybeBotMove() {
  if (state.phase === 'won') return;
  if (state.players[state.activePlayerIndex] !== BOT) return;
  els.btnRoll.disabled = true;
  els.btnSetAside.disabled = true;
  els.btnBank.disabled = true;
  setTimeout(() => {
    if (state.phase === 'won' || state.players[state.activePlayerIndex] !== BOT) return;
    const decision = farkleBotDecision(state);
    const intent = decision.action === 'choose' ? { kind: 'choose', indices: decision.indices } : { kind: decision.action };
    applyPlayerIntent(intent);
  }, BOT_DELAY_MS);
}

els.btnRoll.addEventListener('click', () => applyPlayerIntent({ kind: 'roll' }));
els.btnSetAside.addEventListener('click', () => applyPlayerIntent({ kind: 'choose', indices: [...selected] }));
els.btnBank.addEventListener('click', () => applyPlayerIntent({ kind: 'bank' }));
els.btnDaily.addEventListener('click', () => startGame(dailySeed(new Date())));
els.btnRandom.addEventListener('click', () => startGame(randomSeed()));

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (/^[1-6]$/.test(key)) {
    const i = Number(key) - 1;
    if (state.data.currentRoll && i < state.data.currentRoll.length) {
      if (selected.has(i)) selected.delete(i);
      else selected.add(i);
      render();
      event.preventDefault();
    }
    return;
  }
  switch (key) {
    case 'a':
      if (!els.btnSetAside.disabled) els.btnSetAside.click();
      break;
    case 'r':
      if (!els.btnRoll.disabled) els.btnRoll.click();
      break;
    case 'b':
      if (!els.btnBank.disabled) els.btnBank.click();
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
