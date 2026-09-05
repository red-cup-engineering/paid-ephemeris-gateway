// app.mjs — the placeholder lobby's client script. Talks to server.mts's JSON API only; carries
// no game logic of its own (there is no game to play yet — see index.html's "what's coming"
// panel). A real client-side kernel/renderer arrives with the graphically-rich game pass.

const CLIENT_KEY_STORAGE = 'cowrie-casino-client-key';
let token = null;
let accountId = null;
let isDurableAccount = false;

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

function accountMessage(message) {
  setText('account-message', message);
}

function showAccountPanels(showLinkGuest) {
  document.getElementById('link-guest-btn')?.toggleAttribute('hidden', !showLinkGuest);
  document.getElementById('friends-panel')?.removeAttribute('hidden');
}

async function renderFriends() {
  const list = document.getElementById('friends-list');
  if (!list || !isDurableAccount) return;
  const { friends } = await api('/friends');
  list.innerHTML = '';
  if (friends.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No friends yet — add one by handle above.';
    list.appendChild(li);
    return;
  }
  for (const friendAccountId of friends) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = friendAccountId;
    const gift = document.createElement('button');
    gift.type = 'button';
    gift.textContent = 'Gift 1 ticket';
    gift.addEventListener('click', async () => {
      gift.disabled = true;
      try {
        // account ids are "casino:account-<handle-slug>" — the slug after the last "-" split
        // is close enough for a v1 gift button (a full handle registry is later-pass work).
        const handle = friendAccountId.replace(/^casino:account-/, '');
        const result = await api('/friends/gift', { method: 'POST', body: JSON.stringify({ handle, amount: 1 }) });
        accountMessage(`Gifted 1 ticket to ${friendAccountId}.`);
        renderBalances(result.status);
      } catch (err) {
        accountMessage(err.message);
      } finally {
        gift.disabled = false;
      }
    });
    li.append(name, gift);
    list.appendChild(li);
  }
}

async function boot() {
  try {
    const session = await api('/session', { method: 'POST', body: JSON.stringify({ clientKey: clientKey() }) });
    token = session.token;
    accountId = session.accountId;
    setText('identity-status', `Playing as guest ${session.accountId}.`);
    await refreshBalances();
    await renderBundles();
  } catch (err) {
    setText('identity-status', `Could not reach the casino: ${err.message}`);
  }
}

document.getElementById('login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const handle = document.getElementById('login-handle')?.value.trim();
  const secret = document.getElementById('login-secret')?.value ?? '';
  if (!handle) { accountMessage('Enter a handle first.'); return; }
  try {
    const login = await api('/login', { method: 'POST', body: JSON.stringify({ handle, secret }) });
    token = login.token;
    accountId = login.accountId;
    isDurableAccount = true;
    setText('identity-status', `Logged in as ${login.accountId}${login.created ? ' (just claimed)' : ''}.`);
    accountMessage(login.created ? 'Handle claimed — remember your passphrase, it is your claim code.' : 'Welcome back.');
    showAccountPanels(true);
    renderBalances(login.status);
    await renderFriends();
  } catch (err) {
    accountMessage(err.message);
  }
});

document.getElementById('link-guest-btn')?.addEventListener('click', async () => {
  try {
    const result = await api('/claim-account', { method: 'POST', body: JSON.stringify({ clientKey: clientKey() }) });
    accountMessage(result.migrated ? 'Guest tickets/chips linked into this account.' : 'Nothing to link (no guest progress found).');
    renderBalances(result.status);
    document.getElementById('link-guest-btn')?.setAttribute('hidden', '');
  } catch (err) {
    accountMessage(err.message);
  }
});

document.getElementById('add-friend-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const handle = document.getElementById('friend-handle')?.value.trim();
  if (!handle) { accountMessage('Enter a friend\'s handle first.'); return; }
  try {
    await api('/friends/add', { method: 'POST', body: JSON.stringify({ handle }) });
    accountMessage(`Added ${handle} as a friend.`);
    document.getElementById('friend-handle').value = '';
    await renderFriends();
  } catch (err) {
    accountMessage(err.message);
  }
});

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
