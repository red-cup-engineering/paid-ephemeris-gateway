/**
 * `app-chutes` — Chutes & Ladders' browser controller. Owns UI state only (the current engine
 * `state`, the setup form's player list) and delegates every rule decision to `kernel-chutes.mjs`'s
 * re-exports, matching `gambling-trainer-service/web/js/app.mjs`'s "presentation only" discipline.
 *
 * The one deliberate UI choice worth naming: there is exactly one "Roll" button, used identically
 * for every player's turn including a bot's. Nothing here auto-plays a bot's turn on a timer or
 * routes it through different code — the whole joke ("the bot is a die") only lands if the UI
 * itself never treats a bot's turn as special, so it doesn't.
 */
import {
  createEngine, applyIntent, activePlayer,
  createChutesBoard, finishTurnDistribution, expectedTurnsToFinish,
  dailySeed, MIN_PLAYERS, MAX_PLAYERS,
} from './kernel-chutes.mjs';
import { renderBoard } from './render-board.mjs';
import { renderDistributionChart } from './render-distribution.mjs';

const el = {
  seedLabel: document.getElementById('seed-label'),
  setupPanel: document.getElementById('setup-panel'),
  playerRows: document.getElementById('player-rows'),
  btnAddPlayer: document.getElementById('btn-add-player'),
  btnRemovePlayer: document.getElementById('btn-remove-player'),
  btnStartDaily: document.getElementById('btn-start-daily'),
  btnStartPractice: document.getElementById('btn-start-practice'),
  racePanel: document.getElementById('race-panel'),
  boardSvg: document.getElementById('board-svg'),
  rollBanner: document.getElementById('roll-banner'),
  btnRoll: document.getElementById('btn-roll'),
  btnNewRace: document.getElementById('btn-new-race'),
  standingsPanel: document.getElementById('standings-panel'),
  standingsList: document.getElementById('standings-list'),
  distributionSvg: document.getElementById('distribution-svg'),
  distributionCaption: document.getElementById('distribution-caption'),
  playerStatusList: document.getElementById('player-status-list'),
  ariaLive: document.getElementById('aria-live'),
};

let playerKinds = ['human', 'bot'];
let state = null;
const board = createChutesBoard();

function announce(text) {
  el.ariaLive.textContent = text;
}

function renderSetup() {
  el.playerRows.innerHTML = '';
  playerKinds.forEach((kind, i) => {
    const row = document.createElement('div');
    row.className = 'player-row';
    const label = document.createElement('span');
    label.textContent = `Player ${i + 1}: `;
    const select = document.createElement('select');
    select.className = 'player-select';
    for (const k of ['human', 'bot']) {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k === 'human' ? 'You' : 'Bot';
      opt.selected = k === kind;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => { playerKinds[i] = select.value; });
    row.append(label, select);
    el.playerRows.appendChild(row);
  });
  el.btnAddPlayer.disabled = playerKinds.length >= MAX_PLAYERS;
  el.btnRemovePlayer.disabled = playerKinds.length <= MIN_PLAYERS;
}

el.btnAddPlayer.addEventListener('click', () => {
  if (playerKinds.length < MAX_PLAYERS) { playerKinds.push('bot'); renderSetup(); }
});
el.btnRemovePlayer.addEventListener('click', () => {
  if (playerKinds.length > MIN_PLAYERS) { playerKinds.pop(); renderSetup(); }
});

function startRace(seed) {
  state = createEngine(seed, playerKinds.join(','));
  el.seedLabel.textContent = seed;
  el.setupPanel.hidden = true;
  el.standingsPanel.hidden = true;
  el.racePanel.hidden = false;
  render();
}

el.btnStartDaily.addEventListener('click', () => startRace(dailySeed(new Date(), playerKinds.join(','))));
el.btnStartPractice.addEventListener('click', () => startRace(`practice:${Date.now()}`));
el.btnNewRace.addEventListener('click', () => {
  el.racePanel.hidden = true;
  el.standingsPanel.hidden = true;
  el.setupPanel.hidden = false;
  state = null;
});

el.btnRoll.addEventListener('click', () => {
  if (!state || state.gameOver) return;
  const roller = activePlayer(state);
  const result = applyIntent(state, { kind: 'roll' });
  state = result.state;
  const moveEvent = result.events.find((e) => e.kind === 'move');
  const finishedEvent = result.events.find((e) => e.kind === 'finished');
  let msg = `${roller.label} rolled and moved to square ${moveEvent.to}${moveEvent.jumped ? ` (${moveEvent.jumpKind}!)` : ''}.`;
  if (finishedEvent) msg += ` ${roller.label} finished in ${finishedEvent.turn} turns, place ${finishedEvent.place}.`;
  announce(msg);
  render();
});

function renderPlayerStatus() {
  el.playerStatusList.innerHTML = '';
  state.players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = `${p.label}: square ${p.position}${p.finished ? ` — finished in ${p.finishTurn} turns` : ''}`;
    if (p === activePlayer(state) && !state.gameOver) li.style.fontWeight = '700';
    el.playerStatusList.appendChild(li);
  });
}

function renderDistribution() {
  if (state.gameOver) {
    el.distributionCaption.textContent = 'The race is over — no one is still rolling.';
    while (el.distributionSvg.firstChild) el.distributionSvg.removeChild(el.distributionSvg.firstChild);
    return;
  }
  const roller = activePlayer(state);
  const distribution = finishTurnDistribution(board, roller.position);
  const { omittedTurns } = renderDistributionChart(el.distributionSvg, distribution);
  const expected = expectedTurnsToFinish(distribution);
  el.distributionCaption.textContent =
    `${roller.label}, rolling next: expected ${expected.toFixed(2)} more turns to finish. ` +
    (omittedTurns > 0.0005 ? `(chart shows the next 30 turns; ${(100 * omittedTurns).toFixed(2)}% of the mass falls beyond that, mostly far out on the tail)` : '(chart shows essentially the whole distribution)');
}

function renderStandings() {
  if (!state.gameOver) { el.standingsPanel.hidden = true; return; }
  el.standingsPanel.hidden = false;
  el.standingsList.innerHTML = '';
  state.finishedOrder.forEach((id) => {
    const player = state.players.find((p) => p.id === id);
    const li = document.createElement('li');
    li.textContent = `${player.label} — finished in ${player.finishTurn} turns`;
    el.standingsList.appendChild(li);
  });
}

function render() {
  renderBoard(el.boardSvg, board, state.players);
  const roller = activePlayer(state);
  el.rollBanner.innerHTML = state.gameOver
    ? '<strong>Race over.</strong>'
    : `Up next: <strong>${roller.label}</strong> (square ${roller.position})`;
  el.btnRoll.disabled = state.gameOver;
  renderPlayerStatus();
  renderDistribution();
  renderStandings();
}

renderSetup();
