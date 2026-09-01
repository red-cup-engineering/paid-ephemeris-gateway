/**
 * `app-reels` — Fair Spin's browser controller. Owns UI state only (the current engine `state`)
 * and delegates every rule/odds decision to `kernel-reels.mjs`'s re-exports, matching
 * `gambling-trainer-service/web/js/app.mjs`'s "presentation only" discipline. The disclosure
 * panel is rendered from `slotDisclosure()`'s live return value on every render pass — it is
 * never computed once and cached, so it can never go stale relative to the actual machine data.
 */
import {
  createEngine, applyIntent, classify, MIN_BET, MAX_BET, STARTING_BANKROLL,
  slotDisclosure, spinRuinDisclosure, sessionSummary, dailySeed,
} from './kernel-reels.mjs';
import { renderReelWindow, renderDisclosurePanel, renderSessionSummary } from './render-reels.mjs';
import { renderSpendBadge } from './render-badges.mjs';

const el = {
  seedLabel: document.getElementById('seed-label'),
  disclosurePanel: document.getElementById('disclosure-panel'),
  reelWindowRow: document.getElementById('reel-window-row'),
  badgeRow: document.getElementById('badge-row'),
  betSelect: document.getElementById('bet-select'),
  bankrollLabel: document.getElementById('bankroll-label'),
  ruinDisclosure: document.getElementById('ruin-disclosure'),
  btnSpin: document.getElementById('btn-spin'),
  btnNewSession: document.getElementById('btn-new-session'),
  statusPanel: document.getElementById('status-panel'),
  summaryPanel: document.getElementById('summary-panel'),
  ariaLive: document.getElementById('aria-live'),
};

const seed = dailySeed(new Date());
let state = createEngine(seed);

function announce(text) {
  el.ariaLive.textContent = text;
}

function fmt(n) {
  return `${n.toFixed(2)} credits`;
}

for (let bet = MIN_BET; bet <= MAX_BET; bet++) {
  const opt = document.createElement('option');
  opt.value = String(bet);
  opt.textContent = String(bet);
  el.betSelect.appendChild(opt);
}
el.betSelect.value = String(MIN_BET);

function renderBadges() {
  el.badgeRow.innerHTML = '';
  el.badgeRow.appendChild(renderSpendBadge(classify, 'adjust-bet'));
  el.badgeRow.appendChild(renderSpendBadge(classify, 'spin'));
  el.badgeRow.appendChild(renderSpendBadge(classify, 'new-session'));
}

function renderDisclosure() {
  // Always computed fresh from the current bet — this panel is PERMANENTLY on screen,
  // never hidden behind a click.
  renderDisclosurePanel(el.disclosurePanel, slotDisclosure(state.bet));
}

function renderRuinDisclosure() {
  if (state.ruined) { el.ruinDisclosure.textContent = ''; return; }
  const disclosure = spinRuinDisclosure(state.bankroll, state.bet);
  el.ruinDisclosure.textContent = disclosure.text;
  el.ruinDisclosure.classList.toggle('disclosure-text--terminal', disclosure.probability > 0);
}

function renderStatus() {
  el.statusPanel.classList.toggle('ruined', state.ruined);
  el.statusPanel.textContent = state.ruined
    ? `Ruined at spin ${state.spinCount}. This practice session is over — start a new one when ready.`
    : '';
}

function render() {
  el.seedLabel.textContent = state.seed;
  el.bankrollLabel.textContent = `Practice bankroll: ${fmt(state.bankroll)}`;
  el.betSelect.value = String(state.bet);
  el.betSelect.disabled = state.ruined;
  el.btnSpin.disabled = state.ruined || state.bet > state.bankroll;
  const lastSpin = state.history[state.history.length - 1];
  renderReelWindow(el.reelWindowRow, lastSpin?.symbols);
  renderBadges();
  renderDisclosure();
  renderRuinDisclosure();
  renderStatus();
  renderSessionSummary(el.summaryPanel, sessionSummary(state.history, state.bet));
}

el.betSelect.addEventListener('change', () => {
  const bet = Number(el.betSelect.value);
  state = applyIntent(state, { kind: 'adjust-bet', bet }).state;
  render();
});

el.btnSpin.addEventListener('click', () => {
  const result = applyIntent(state, { kind: 'spin' });
  state = result.state;
  const spun = result.events.find((e) => e.kind === 'spin-resolved');
  announce(spun.payout > 0 ? `Landed a win: ${spun.payout} credits.` : 'No win this spin.');
  if (result.events.some((e) => e.kind === 'ruin')) announce('Bankroll below the minimum bet — this session is ruined.');
  render();
});

el.btnNewSession.addEventListener('click', () => {
  state = applyIntent(state, { kind: 'new-session' }).state;
  announce(`New practice session started. Bankroll reset to ${STARTING_BANKROLL} credits.`);
  render();
});

render();
