// app.mjs — the placeholder lobby's client script. Talks to server.mts's JSON API only; carries
// no game logic of its own (there is no game to play yet — see index.html's "what's coming"
// panel). A real client-side kernel/renderer arrives with the graphically-rich game pass.

const CLIENT_KEY_STORAGE = 'cowrie-casino-client-key';
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
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `request to ${path} failed (${res.status})`);
  return body;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderBalances(status) {
  setText('ticket-balance', String(status.tickets));
  setText('ticket-cap', `cap ${status.ticketCap}`);
  setText('chip-balance', String(status.chips));
  setText('jackpot-balance', String(status.jackpot));
  const claimDailyBtn = document.getElementById('claim-daily-btn');
  if (claimDailyBtn) {
    claimDailyBtn.disabled = !status.dailyBonus.availableToday;
    claimDailyBtn.textContent = status.dailyBonus.availableToday
      ? 'Claim daily bonus'
      : `Daily bonus claimed (streak ${status.dailyBonus.streak})`;
  }
}

async function refreshBalances() {
  const status = await api('/balances');
  renderBalances(status);
}

function announce(message) {
  setText('action-message', message);
}

async function renderBundles() {
  const list = document.getElementById('bundle-list');
  if (!list) return;
  const { bundles } = await api('/bundles');
  list.innerHTML = '';
  for (const sku of bundles) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'bundle-name';
    name.textContent = `${sku.displayName} — ${sku.quantity} ${sku.commodity.toLowerCase()}s`;
    if (sku.bestValue) {
      const badge = document.createElement('span');
      badge.className = 'best-value';
      badge.textContent = 'BEST VALUE';
      name.appendChild(badge);
    }
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.textContent = `$${(sku.priceUsdCents / 100).toFixed(2)}`;
    buy.addEventListener('click', async () => {
      buy.disabled = true;
      try {
        const result = await api('/purchase-bundle', { method: 'POST', body: JSON.stringify({ skuId: sku.id }) });
        announce(`Purchased ${sku.displayName} — +${result.granted.quantity} ${result.granted.commodity.toLowerCase()}s.`);
        await refreshBalances();
      } catch (err) {
        announce(err.message);
      } finally {
        buy.disabled = false;
      }
    });
    li.append(name, buy);
    list.appendChild(li);
  }
}

async function boot() {
  try {
    const session = await api('/session', { method: 'POST', body: JSON.stringify({ clientKey: clientKey() }) });
    token = session.token;
    setText('identity-status', `Playing as guest ${session.accountId}.`);
    await refreshBalances();
    await renderBundles();
  } catch (err) {
    setText('identity-status', `Could not reach the casino: ${err.message}`);
  }
}

document.getElementById('claim-tickets-btn')?.addEventListener('click', async () => {
  try {
    const result = await api('/claim-tickets', { method: 'POST' });
    announce(result.ticketsGranted > 0 ? `+${result.ticketsGranted} ticket(s) regenerated.` : 'No tickets have regenerated yet.');
    renderBalances(result.status);
  } catch (err) {
    announce(err.message);
  }
});

document.getElementById('claim-daily-btn')?.addEventListener('click', async () => {
  try {
    const result = await api('/claim-daily-bonus', { method: 'POST' });
    announce(result.claimed ? `Daily bonus: +${result.ticketsGranted} ticket(s), streak ${result.streak}.` : 'Already claimed today — come back tomorrow.');
    renderBalances(result.status);
  } catch (err) {
    announce(err.message);
  }
});

document.getElementById('buy-in-btn')?.addEventListener('click', async () => {
  try {
    const result = await api('/buy-in', { method: 'POST' });
    announce(`Bought in: -${result.ticketsSpent} ticket, +${result.chipsGranted} chips.`);
    renderBalances(result.status);
  } catch (err) {
    announce(err.message);
  }
});

boot();
