/**
 * `app` — Kelly's Wager's browser controller: the one file that owns `BankrollState` in memory
 * and wires DOM events to `engine.mts#applyIntent`, re-rendering after every intent.
 *
 * It owns UI state only (the current pending `BankrollState`, which offer is on screen, the
 * staged stake fraction) and delegates every rule decision to `kernel.mjs`'s re-exports — it
 * invents no game logic of its own, the same "presentation only" discipline
 * `render-disclosure.mjs`/`render-paths.mjs` follow.
 *
 * One deliberate pedagogy choice made here, because nothing upstream decided it: `offer.framing`
 * ('value' | 'trap') is never shown on the LIVE pending offer — showing "this one is a trap"
 * before the player prices it themselves would hand them the answer to the exact lesson the game
 * is testing (read the true probability/cost, not the pitch). The `.offer-tag--trap`/`--value`
 * CSS classes exist for the wager-history log instead, shown only after a wager resolves, so a
 * player can review afterward which pitches were honest and which were hyped — never in advance.
 */
import {
  createEngine,
  applyIntent,
  currentOffer,
  gradeStake,
  gradeRun,
  computePaths,
  trueEdge,
  dailySeed,
  DEFAULT_WAGER_CONFIG_ID,
} from './kernel.mjs';
import { renderDisclosurePanel } from './render-disclosure.mjs';
import { renderPathsChart, renderPathsLegend } from './render-paths.mjs';

const CONFIG_ID = DEFAULT_WAGER_CONFIG_ID;

const el = {
  seedLabel: document.getElementById('seed-label'),
  offerPanel: document.getElementById('offer-panel'),
  disclosurePanel: document.getElementById('disclosure-panel'),
  stakeSlider: document.getElementById('stake-slider'),
  stakeOutput: document.getElementById('stake-output'),
  gradePanel: document.getElementById('grade-panel'),
  btnReroll: document.getElementById('btn-reroll'),
  btnCommit: document.getElementById('btn-commit'),
  btnNewRun: document.getElementById('btn-new-run'),
  statusPanel: document.getElementById('status-panel'),
  balanceLabel: document.getElementById('balance-label'),
  pathsChart: document.getElementById('paths-chart'),
  pathsLegend: document.getElementById('paths-legend'),
  summaryPanel: document.getElementById('summary-panel'),
  ariaLive: document.getElementById('aria-live'),
};

const seed = dailySeed(new Date(), CONFIG_ID);
let state = createEngine(seed, CONFIG_ID);
let pendingFraction = 0;

function announce(text) {
  el.ariaLive.textContent = text;
}

function fmtCoins(n) {
  return `${n.toFixed(2)} coins`;
}
function fmtPct(x) {
  return `${(100 * x).toFixed(1)}%`;
}

function renderOffer() {
  const offer = currentOffer(state);
  el.offerPanel.innerHTML = '';
  if (state.finished || offer === undefined) {
    const p = document.createElement('p');
    p.className = 'offer-empty';
    p.textContent = state.ruined
      ? "This run is ruined — the bankroll fell below the ruin threshold. Start a new run to try again."
      : "Today's sequence is finished — every offer has been resolved or skipped.";
    el.offerPanel.appendChild(p);
    return;
  }
  const label = document.createElement('p');
  label.className = 'offer-label';
  label.textContent = `${offer.label} (offer ${offer.index + 1} of ${state.offers.length})`;
  const pitch = document.createElement('p');
  pitch.className = 'offer-pitch';
  pitch.textContent = offer.pitch;
  const numbers = document.createElement('div');
  numbers.className = 'offer-numbers';
  numbers.innerHTML = `
    <span>True probability: <strong>${fmtPct(offer.probability)}</strong></span>
    <span>True cost: <strong>${fmtPct(offer.cost)}</strong></span>
    <span>True edge: <strong>${(100 * trueEdge(offer)).toFixed(1)}%</strong></span>
  `;
  el.offerPanel.append(label, pitch, numbers);
}

function renderGrade() {
  const offer = currentOffer(state);
  if (state.finished || offer === undefined) {
    el.gradePanel.innerHTML = '';
    return;
  }
  const grade = gradeStake(state, pendingFraction);
  const devWord = Math.abs(grade.deviation) < 1e-9
    ? 'exactly at the Kelly optimum'
    : grade.deviation > 0
      ? `over-staked by ${fmtPct(grade.deviation)} vs Kelly`
      : `under-staked by ${fmtPct(-grade.deviation)} vs Kelly`;
  el.gradePanel.innerHTML = `
    <div>Kelly optimum for this offer: <strong>${fmtPct(grade.kellyOptimalFraction)}</strong></div>
    <div>Your staged stake: <strong>${fmtPct(pendingFraction)}</strong> — ${devWord}</div>
    <div>Expected value of your stake: <strong>${(grade.expectedValue * state.balance).toFixed(2)} coins</strong></div>
  `;
}

function renderActions() {
  const offer = currentOffer(state);
  const finished = state.finished || offer === undefined;
  el.stakeSlider.disabled = finished;
  el.btnCommit.disabled = finished || pendingFraction <= 0;
  el.btnReroll.disabled = finished;
}

function renderBalanceAndSeed() {
  el.seedLabel.textContent = state.seed;
  el.balanceLabel.textContent = fmtCoins(state.balance);
}

function renderPaths() {
  const paths = computePaths(state);
  renderPathsChart(el.pathsChart, paths, state.offers.length);
  renderPathsLegend(el.pathsLegend);
}

function renderSummary() {
  const grade = gradeRun(state);
  if (grade.wagersCommitted === 0) {
    el.summaryPanel.innerHTML = '<p>No wagers committed yet this run.</p>';
    return;
  }
  const rows = state.resolutions.map((r) => {
    const offer = state.offers[r.offerIndex];
    const tagClass = offer.framing === 'trap' ? 'offer-tag--trap' : 'offer-tag--value';
    return `<li>
      #${r.offerIndex + 1} ${offer.label}
      <span class="offer-tag ${tagClass}">${offer.framing}</span>
      — staked ${fmtPct(r.stakeFraction)} (Kelly said ${fmtPct(r.kellyOptimalFraction)}),
      ${r.outcome.toUpperCase()}, balance ${r.balanceBefore.toFixed(2)} &rarr; ${r.balanceAfter.toFixed(2)}
    </li>`;
  }).join('');
  el.summaryPanel.innerHTML = `
    <div>Wagers committed: <strong>${grade.wagersCommitted}</strong></div>
    <div>Mean |deviation| from Kelly: <strong>${fmtPct(grade.meanAbsoluteDeviation)}</strong></div>
    <div>Your mean expected log-growth: <strong>${grade.meanPlayerExpectedLogGrowth.toFixed(4)}</strong></div>
    <div>Kelly's mean expected log-growth: <strong>${grade.meanKellyExpectedLogGrowth.toFixed(4)}</strong></div>
    <ul class="wager-history">${rows}</ul>
    <p class="chart-note">The chart's Kelly line plays full, unfractional Kelly on this exact
      seeded sequence — the mathematically optimal <em>long-run growth rate</em>, not a guarantee
      for any single short run. Over a 6-10 wager day, flat betting sometimes finishes ahead of
      Kelly purely from variance; Kelly's edge is a property of many repeated days, not this one
      alone. Play more days to see it separate from flat on average.</p>
  `;
}

function renderStatus() {
  el.statusPanel.classList.toggle('ruined', state.ruined);
  if (state.ruined) {
    el.statusPanel.textContent = `Ruined at offer ${state.resolutions.length}. This run is over — start a new run when ready.`;
  } else if (state.finished) {
    el.statusPanel.textContent = `Run complete. Final balance: ${fmtCoins(state.balance)}.`;
  } else {
    el.statusPanel.textContent = '';
  }
}

function render() {
  renderBalanceAndSeed();
  renderOffer();
  const offer = currentOffer(state);
  renderDisclosurePanel(el.disclosurePanel, { state, offer, stakeFraction: pendingFraction });
  renderGrade();
  renderActions();
  renderStatus();
  renderPaths();
  renderSummary();
}

el.stakeSlider.addEventListener('input', () => {
  const fraction = Number(el.stakeSlider.value);
  el.stakeOutput.textContent = fmtPct(fraction);
  const result = applyIntent(state, { kind: 'adjust-stake', fraction });
  state = result.state;
  pendingFraction = fraction;
  renderGrade();
  renderDisclosurePanel(el.disclosurePanel, { state, offer: currentOffer(state), stakeFraction: pendingFraction });
  renderActions();
});

el.btnReroll.addEventListener('click', () => {
  const offer = currentOffer(state);
  const result = applyIntent(state, { kind: 'reroll-offer' });
  state = result.state;
  pendingFraction = 0;
  el.stakeSlider.value = '0';
  el.stakeOutput.textContent = '0%';
  announce(offer ? `Skipped "${offer.label}" for a fee.` : 'Nothing to reroll.');
  render();
});

el.btnCommit.addEventListener('click', () => {
  const result = applyIntent(state, { kind: 'commit-stake' });
  state = result.state;
  pendingFraction = 0;
  el.stakeSlider.value = '0';
  el.stakeOutput.textContent = '0%';
  const resolved = result.events.find((e) => e.kind === 'wager-resolved');
  if (resolved) announce(`Wager resolved: ${resolved.outcome}. Balance now ${fmtCoins(state.balance)}.`);
  if (result.events.some((e) => e.kind === 'ruin')) announce('Ruined — this run has ended.');
  render();
});

el.btnNewRun.addEventListener('click', () => {
  const result = applyIntent(state, { kind: 'new-run' });
  state = result.state;
  pendingFraction = 0;
  el.stakeSlider.value = '0';
  el.stakeOutput.textContent = '0%';
  announce('New run started.');
  render();
});

el.stakeOutput.textContent = '0%';
render();
