/**
 * login-friends.test.mts — real HTTP round-trips against the durable-account login
 * (`POST /login`), guest-migration (`POST /claim-account`), and friends-list routes
 * server.mts wires. Same in-process `PORT=0` harness as server.test.mts (see that file's
 * header) — `node --test` runs each matched file in its own process, so this file's `import`
 * of server.mts binds its own fresh ephemeral port, independent of server.test.mts's.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // casino-service/

process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
delete process.env.CASINO_SNAPSHOT;

const { server, floor, castResidency } = await import(pathToFileURL(path.join(ROOT, 'src', 'server.mts')).href);

await new Promise((resolve) => {
  if (server.listening) return resolve(undefined);
  server.once('listening', () => resolve(undefined));
});

const address = server.address();
const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;

after(async () => {
  await castResidency.stop();
  floor.room.stop();
  floor.room.destroy();
  server.close();
});

async function fetchWithRetry(url: string, init?: RequestInit, attempts = 10): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw lastErr;
}

async function login(handle: string, secret: string): Promise<{ token: string; accountId: string; created: boolean }> {
  const res = await fetchWithRetry(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle, secret }),
  });
  assert.equal(res.status, 200);
  return res.json();
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

// ── POST /login ──────────────────────────────────────────────────────────────────────────

test('POST /login without a handle is a 400', async () => {
  const res = await fetchWithRetry(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: 'whatever' }),
  });
  assert.equal(res.status, 400);
});

test('POST /login with an empty secret is a 401 (AuthError, not a 500)', async () => {
  const handle = `login-empty-${randomUUID()}`;
  const res = await fetchWithRetry(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle, secret: '' }),
  });
  assert.equal(res.status, 401);
});

test('POST /login first call for a fresh handle claims it (created:true) and mints a session token', async () => {
  const handle = `login-first-${randomUUID()}`;
  const result = await login(handle, 'a real passphrase');
  assert.equal(result.created, true);
  assert.ok(result.token);
  assert.ok(result.accountId.includes('account-'));
});

test('POST /login: a second session reconnecting with the same handle+passphrase gets the same durable account, balances matching — the wedge assay', async () => {
  const handle = `login-reconnect-${randomUUID()}`;
  const secret = 'correct horse battery staple';

  // "session one": create the account and accrue a balance.
  const sessionOne = await login(handle, secret);
  assert.equal(sessionOne.created, true);
  const bonus = await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers: authHeaders(sessionOne.token) });
  assert.equal(bonus.status, 200);
  const balancesOne = await (await fetchWithRetry(`${base}/balances`, { headers: authHeaders(sessionOne.token) })).json();
  assert.ok(balancesOne.tickets > 0);

  // "session two": an entirely separate login call (a fresh token, no shared client state)
  // presenting the same claim code (the passphrase) reconnects to the identical account.
  const sessionTwo = await login(handle, secret);
  assert.equal(sessionTwo.created, false);
  assert.equal(sessionTwo.accountId, sessionOne.accountId);
  assert.notEqual(sessionTwo.token, sessionOne.token);
  const balancesTwo = await (await fetchWithRetry(`${base}/balances`, { headers: authHeaders(sessionTwo.token) })).json();
  assert.equal(balancesTwo.tickets, balancesOne.tickets);
  assert.equal(balancesTwo.accountId, balancesOne.accountId);
});

test('POST /login: reconnecting with the wrong passphrase is a 401, the account untouched', async () => {
  const handle = `login-wrong-${randomUUID()}`;
  await login(handle, 'the real one');
  const res = await fetchWithRetry(`${base}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handle, secret: 'a guess' }),
  });
  assert.equal(res.status, 401);
});

// ── POST /claim-account (guest -> durable migration) ────────────────────────────────────

test('POST /claim-account without a session is a 401', async () => {
  const res = await fetchWithRetry(`${base}/claim-account`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientKey: 'whatever' }),
  });
  assert.equal(res.status, 401);
});

test('POST /claim-account while still a guest session is a 401 — must log into a durable account first', async () => {
  const guestSession = await (await fetchWithRetry(`${base}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientKey: `guest-claim-${randomUUID()}` }),
  })).json();
  const res = await fetchWithRetry(`${base}/claim-account`, {
    method: 'POST',
    headers: authHeaders(guestSession.token),
    body: JSON.stringify({ clientKey: 'irrelevant' }),
  });
  assert.equal(res.status, 401);
});

test('POST /claim-account folds a guest\'s tickets into the durable account, ledger balanced throughout', async () => {
  const guestKey = `guest-migrate-${randomUUID()}`;
  const guestSession = await (await fetchWithRetry(`${base}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientKey: guestKey }),
  })).json();
  const guestBonus = await (await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers: authHeaders(guestSession.token) })).json();
  assert.ok(guestBonus.ticketsGranted > 0);

  const handle = `login-migrate-${randomUUID()}`;
  const durable = await login(handle, 'a passphrase for migration');
  const claim = await fetchWithRetry(`${base}/claim-account`, {
    method: 'POST',
    headers: authHeaders(durable.token),
    body: JSON.stringify({ clientKey: guestKey }),
  });
  assert.equal(claim.status, 200);
  const claimBody = await claim.json();
  assert.equal(claimBody.migrated, true);
  assert.equal(claimBody.status.tickets, guestBonus.ticketsGranted);

  const audit = await (await fetchWithRetry(`${base}/audit`)).json();
  assert.deepEqual(audit.invariants, []);
});

// ── friends list + gift-a-ticket ────────────────────────────────────────────────────────

test('GET /friends without a session is a 401', async () => {
  const res = await fetchWithRetry(`${base}/friends`);
  assert.equal(res.status, 401);
});

test('POST /friends/add refuses an unclaimed handle with a 400', async () => {
  const handle = `friends-a-${randomUUID()}`;
  const me = await login(handle, 'secret-one');
  const res = await fetchWithRetry(`${base}/friends/add`, {
    method: 'POST',
    headers: authHeaders(me.token),
    body: JSON.stringify({ handle: `nobody-${randomUUID()}` }),
  });
  assert.equal(res.status, 400);
});

test('POST /friends/add links two durable accounts, each side sees the other in GET /friends', async () => {
  const handleA = `friends-b-a-${randomUUID()}`;
  const handleB = `friends-b-b-${randomUUID()}`;
  const a = await login(handleA, 'secret-a');
  const b = await login(handleB, 'secret-b');

  const added = await fetchWithRetry(`${base}/friends/add`, { method: 'POST', headers: authHeaders(a.token), body: JSON.stringify({ handle: handleB }) });
  assert.equal(added.status, 200);
  const addedBody = await added.json();
  assert.deepEqual(addedBody.friends, [b.accountId]);

  const bFriends = await (await fetchWithRetry(`${base}/friends`, { headers: authHeaders(b.token) })).json();
  assert.deepEqual(bFriends.friends, [a.accountId]);
});

test('POST /friends/gift: the whole assay — two durable accounts, a friend link, a ticket gift that moves the balance', async () => {
  const handleA = `friends-gift-a-${randomUUID()}`;
  const handleB = `friends-gift-b-${randomUUID()}`;
  const a = await login(handleA, 'secret-a');
  const b = await login(handleB, 'secret-b');
  await fetchWithRetry(`${base}/friends/add`, { method: 'POST', headers: authHeaders(a.token), body: JSON.stringify({ handle: handleB }) });
  await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers: authHeaders(a.token) });
  const beforeA = await (await fetchWithRetry(`${base}/balances`, { headers: authHeaders(a.token) })).json();
  assert.ok(beforeA.tickets > 0);

  const gift = await fetchWithRetry(`${base}/friends/gift`, {
    method: 'POST',
    headers: authHeaders(a.token),
    body: JSON.stringify({ handle: handleB, amount: 1 }),
  });
  assert.equal(gift.status, 200);
  const giftBody = await gift.json();
  assert.equal(giftBody.ticketsGifted, 1);

  const afterA = await (await fetchWithRetry(`${base}/balances`, { headers: authHeaders(a.token) })).json();
  const afterB = await (await fetchWithRetry(`${base}/balances`, { headers: authHeaders(b.token) })).json();
  assert.equal(afterA.tickets, beforeA.tickets - 1);
  assert.equal(afterB.tickets, 1);

  const audit = await (await fetchWithRetry(`${base}/audit`)).json();
  assert.deepEqual(audit.invariants, []);
});

test('POST /friends/gift refuses a gift between accounts that are not friends, 400 not 500', async () => {
  const handleA = `friends-nogift-a-${randomUUID()}`;
  const handleB = `friends-nogift-b-${randomUUID()}`;
  const a = await login(handleA, 'secret-a');
  await login(handleB, 'secret-b');
  const res = await fetchWithRetry(`${base}/friends/gift`, {
    method: 'POST',
    headers: authHeaders(a.token),
    body: JSON.stringify({ handle: handleB, amount: 1 }),
  });
  assert.equal(res.status, 400);
});
