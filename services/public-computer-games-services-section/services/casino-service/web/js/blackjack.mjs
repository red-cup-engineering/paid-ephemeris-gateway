// blackjack.mjs — Cowrie Casino's first table game client. Talks to server.mts's /blackjack/*
// JSON API only; every card/chip pixel on the page comes from the real, shared
// @red-cup-engineering/card-table renderer (served at /vendor/card-table/svg.mjs — see
// server.mts's header for why that one file is vendored straight out of node_modules rather than
// hand-copied), never a bespoke image asset. Session bootstrap mirrors app.mjs's own clientKey
// scheme exactly, so a player's tickets/chips/table are the same identity across both pages.
//
// ── The celebrate()/data-fx seam ─────────────────────────────────────────────────────────────
// This pass is pre-spectacle-engine: every animation here is plain CSS (transitions/keyframes in
// css/blackjack.css), driven by toggling `data-fx` attributes and a couple of transient CSS
// classes. `celebrate(tier)` below is the one seam a later, concurrently-built qwzspace fx layer
// is meant to plug into — replace or wrap this function (or listen for the `data-fx`/
// `data-fx-tier` attribute changes it makes on #bj-table and #bj-outcome) to upgrade a "push a
// class for a few hundred ms" celebration into real fireworks, without touching any of the game
// logic around it. Nothing else in this file assumes qwzspace exists.

const CLIENT_KEY_STORAGE = 'cowrie-casino-client-key';
const HOUSE_MATH_STORAGE = 'cowrie-casino-housemath-visible';
const BACK_VARIANT = 'diamonds';

let token = null;
let currentTable = null; // last /blackjack/* response's `table` field
let currentBet = 25;

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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `request to ${path} failed (${res.status})`);
  return body;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function announce(message) {
  setText('bj-message', message);
}

// ── card-table's real renderer, loaded from the vendored path — see server.mts's header ──────
const { cardFaceMarkup, cardBackMarkup, chipStackMarkup } = await import('/vendor/card-table/svg.mjs');

function cardEl(card, extraFx) {
  const wrapper = document.createElement('span');
  wrapper.className = 'bj-card';
  wrapper.dataset.fx = extraFx ?? 'card-deal';
  wrapper.innerHTML = card === null ? cardBackMarkup(BACK_VARIANT) : cardFaceMarkup(card);
  return wrapper;
}

// ── the celebrate()/data-fx seam (see file header) ────────────────────────────────────────────
function celebrate(tier) {
  const table = document.getElementById('bj-table');
  const outcome = document.getElementById('bj-outcome');
  if (table === null || outcome === null) return;
  table.dataset.fx = `table-${tier}`;
  outcome.dataset.fx = 'outcome';
  outcome.dataset.fxTier = tier;
  outcome.classList.remove('bj-celebrate'); // restart the CSS animation even for a repeat tier
  void outcome.offsetWidth; // force a reflow so re-adding the class below replays the keyframes
  outcome.classList.add('bj-celebrate');
}

const RESULT_TIER = {
  blackjack: 'blackjack',
  win: 'win',
  push: 'push',
  loss: 'loss',
  surrender: 'loss',
};

const RESULT_LABEL = {
  blackjack: 'Blackjack!',
  win: 'You win',
  push: 'Push',
  loss: 'Dealer wins',
  surrender: 'Surrendered',
};

// ── House Math panel ──────────────────────────────────────────────────────────────────────────

function houseMathVisible() {
  return localStorage.getItem(HOUSE_MATH_STORAGE) === 'true';
}

function evLabel(value) {
  if (value === null || value === undefined) return '&mdash;';
  const pct = (value * 100).toFixed(1);
  return `${value >= 0 ? '+' : ''}${pct}%`;
}

function renderHouseMath(table) {
  const panel = document.getElementById('house-math-panel');
  const grid = document.getElementById('house-math-grid');
  if (panel === null || grid === null) return;
  const visible = houseMathVisible();
  const math = table.houseMath;
  panel.hidden = !visible || math === null;
  if (math === null) return;
  const rows = [
    ['Stand', math.ev.stand, 'stand'],
    ['Hit', math.ev.hit, 'hit'],
    ['Double', math.ev.double, 'double'],
    ['Split', math.ev.split, 'split'],
  ];
  grid.innerHTML = rows
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value, key]) => {
      const best = key === math.bestAction ? ' bj-house-math-best' : '';
      return `<div class="bj-house-math-row${best}"><dt>${label}</dt><dd>${evLabel(value)}</dd></div>`;
    })
    .join('');
}

// ── rendering ─────────────────────────────────────────────────────────────────────────────────

function handTotalLabel(cards) {
  if (cards.length === 0 || cards.some((c) => c === null)) return '';
  let hard = 0;
  let aces = 0;
  for (const c of cards) {
    hard += c.rank === 1 ? 1 : Math.min(c.rank, 10);
    if (c.rank === 1) aces += 1;
  }
  const best = aces > 0 && hard + 10 <= 21 ? hard + 10 : hard;
  return best > 21 ? `${best} (bust)` : String(best);
}

function renderDealer(round) {
  const container = document.getElementById('dealer-cards');
  if (container === null) return;
  container.innerHTML = '';
  const cards = round?.dealerCards ?? [];
  for (const card of cards) container.appendChild(cardEl(card));
  setText('dealer-total', cards.length > 0 ? ` — ${handTotalLabel(cards)}` : '');
}

function statusLabel(status) {
  return { active: '', stood: 'stood', bust: 'bust', blackjack: 'blackjack!', surrendered: 'surrendered' }[status] ?? status;
}

function renderHands(table) {
  const container = document.getElementById('player-hands');
  if (container === null) return;
  container.innerHTML = '';
  const round = table.round;
  if (round === null) return;
  round.playerHands.forEach((hand, i) => {
    const seat = document.createElement('div');
    seat.className = 'bj-seat bj-seat-player';
    if (round.phase === 'player-turn' && i === round.activeHandIndex) seat.classList.add('bj-seat-active');

    const label = document.createElement('div');
    label.className = 'bj-seat-label';
    const outcome = round.outcomes?.find((o) => o.handIndex === i);
    const suffix = outcome ? ` — ${RESULT_LABEL[outcome.result] ?? outcome.result}` : hand.status !== 'active' ? ` — ${statusLabel(hand.status)}` : '';
    label.innerHTML = `Hand ${i + 1} <span class="bj-hand-total">(${handTotalLabel(hand.cards)})</span>${suffix}`;
    seat.appendChild(label);

    const cardsRow = document.createElement('div');
    cardsRow.className = 'bj-cards';
    for (const card of hand.cards) cardsRow.appendChild(cardEl(card));
    seat.appendChild(cardsRow);

    const betRow = document.createElement('div');
    betRow.className = 'bj-hand-bet';
    betRow.innerHTML = `<span class="bj-chip-stack" data-fx="chip-stack">${chipStackMarkup(hand.bet, 1, { maxRendered: 6 })}</span><span>${hand.bet} chips</span>`;
    seat.appendChild(betRow);

    container.appendChild(seat);
  });
}

function renderOutcomeBanner(table) {
  const banner = document.getElementById('bj-outcome');
  if (banner === null) return;
  const round = table.round;
  if (round === null || round.phase !== 'round-over' || !round.outcomes || round.outcomes.length === 0) {
    banner.hidden = true;
    return;
  }
  const totalBet = round.outcomes.reduce((sum, o) => sum + o.bet, 0);
  const totalPayout = round.outcomes.reduce((sum, o) => sum + o.payout, 0);
  const net = totalPayout - totalBet;
  const primary = round.outcomes.find((o) => o.result === 'blackjack') ?? round.outcomes[0];
  const label = round.outcomes.length > 1 ? (net > 0 ? 'You win' : net < 0 ? 'Dealer wins' : 'Push') : RESULT_LABEL[primary.result] ?? primary.result;
  banner.hidden = false;
  banner.textContent = `${label} — ${net >= 0 ? '+' : ''}${net} chips`;

  let tier = RESULT_TIER[primary.result] ?? (net > 0 ? 'win' : net < 0 ? 'loss' : 'push');
  if (tier === 'win' && net >= totalBet * 2) tier = 'bigwin'; // a double-or-better single swing reads as a big win
  celebrate(tier);
}

function renderActions(table) {
  const betControls = document.getElementById('bj-bet-controls');
  const actionControls = document.getElementById('bj-action-controls');
  if (betControls === null || actionControls === null) return;
  const inRound = table.round !== null;
  betControls.hidden = inRound; // reappears once next-hand clears the round back to null
  actionControls.hidden = !inRound;

  const dealBtn = document.getElementById('bj-deal-btn');
  if (dealBtn) dealBtn.disabled = !table.actions.canDeal;

  const setDisabled = (id, enabled) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  };
  setDisabled('bj-hit-btn', table.actions.canHit);
  setDisabled('bj-stand-btn', table.actions.canStand);
  setDisabled('bj-double-btn', table.actions.canDouble);
  setDisabled('bj-split-btn', table.actions.canSplit);
  setDisabled('bj-surrender-btn', table.actions.canSurrender);
  setDisabled('bj-next-hand-btn', table.actions.canNextHand);
}

function renderRules(table) {
  const rules = table.rules;
  setText(
    'bj-rules-text',
    `${rules.decks}-deck shoe · dealer ${rules.hitSoft17 ? 'hits' : 'stands on'} soft 17 · ` +
      `blackjack pays ${rules.blackjackPayoutNum}:${rules.blackjackPayoutDen} · double & split & late surrender available · ` +
      `bets ${rules.minBet}–${rules.maxBet} chips · ${table.cardsRemaining} cards left in the shoe`,
  );
}

function renderChipPicker(table) {
  const picker = document.getElementById('bj-chip-picker');
  if (picker === null || picker.childElementCount > 0) return; // build once
  const rules = table.rules;
  const denominations = [...new Set([rules.minBet, rules.defaultBet, rules.defaultBet * 2, rules.defaultBet * 4, rules.maxBet])].filter(
    (v) => v >= rules.minBet && v <= rules.maxBet,
  );
  currentBet = rules.defaultBet;
  setText('bj-bet-amount', String(currentBet));
  for (const value of denominations) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bj-chip-btn';
    btn.dataset.fx = 'chip-stack';
    btn.innerHTML = chipStackMarkup(value, 1, { maxRendered: 1 });
    btn.setAttribute('aria-label', `bet ${value} chips`);
    btn.addEventListener('click', () => {
      currentBet = value;
      setText('bj-bet-amount', String(currentBet));
    });
    picker.appendChild(btn);
  }
}

function render(response) {
  const { table, status } = response;
  currentTable = table;
  setText('bj-chip-balance', String(status.chips));
  setText('bj-jackpot-balance', String(status.jackpot));
  setText('bj-hands-played', String(table.handsPlayed));
  renderChipPicker(table);
  renderDealer(table.round);
  renderHands(table);
  renderOutcomeBanner(table);
  renderActions(table);
  renderRules(table);
  renderHouseMath(table);
}

// ── intents ───────────────────────────────────────────────────────────────────────────────────

async function sendIntent(kind, extra = {}) {
  try {
    const result = await api('/blackjack/intent', { method: 'POST', body: JSON.stringify({ kind, ...extra }) });
    render(result);
    announce('');
  } catch (err) {
    announce(err.message);
  }
}

document.getElementById('bj-deal-btn')?.addEventListener('click', () => sendIntent('deal', { bet: currentBet }));
document.getElementById('bj-hit-btn')?.addEventListener('click', () => sendIntent('hit'));
document.getElementById('bj-stand-btn')?.addEventListener('click', () => sendIntent('stand'));
document.getElementById('bj-double-btn')?.addEventListener('click', () => sendIntent('double'));
document.getElementById('bj-split-btn')?.addEventListener('click', () => sendIntent('split'));
document.getElementById('bj-surrender-btn')?.addEventListener('click', () => sendIntent('surrender'));
document.getElementById('bj-next-hand-btn')?.addEventListener('click', () => sendIntent('next-hand'));

document.getElementById('house-math-checkbox')?.addEventListener('change', (e) => {
  localStorage.setItem(HOUSE_MATH_STORAGE, e.target.checked ? 'true' : 'false');
  if (currentTable) renderHouseMath(currentTable);
});

// ── boot ──────────────────────────────────────────────────────────────────────────────────────

async function boot() {
  const checkbox = document.getElementById('house-math-checkbox');
  if (checkbox) checkbox.checked = houseMathVisible();

  try {
    const session = await api('/session', { method: 'POST', body: JSON.stringify({ clientKey: clientKey() }) });
    token = session.token;
  } catch (err) {
    announce(`Could not reach the casino: ${err.message}`);
    return;
  }

  try {
    const existing = await api('/blackjack/state');
    render(existing);
    announce('Welcome back to the table.');
  } catch {
    try {
      const created = await api('/blackjack/new-table', { method: 'POST', body: JSON.stringify({ seed: crypto.randomUUID() }) });
      render(created);
      announce('New table — place your bet.');
    } catch (err) {
      announce(err.message);
    }
  }
}

boot();
