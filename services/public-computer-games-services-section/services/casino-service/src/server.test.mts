/**
 * server.test.mts — real HTTP round-trips against `server.mts`, imported in-process with
 * `PORT=0` (an ephemeral port, real `node:http`, no mocking), matching parlor-service's own
 * `web/test/smoke.test.mts` precedent exactly.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Unlike parlor-service's own smoke suite, close the listening socket once every test in this
// file has run — otherwise the open handle keeps `node --test`'s process alive indefinitely
// past a passing run, which is exactly the hang this house's own sibling test suite is known
// to have (confirmed by hand against parlor-service's `npm test` while building this file).
// The floor room's own tick `setInterval` (qwzspace's `room.start()`, not `unref()`'d — a real
// server process is SUPPOSED to stay alive on it) and the cast residency's supervisor loops (whose
// own dormancy-poll/cooldown timers ARE `unref()`'d, see cast-residency.mts's `defaultSleep`, but
// are still stopped explicitly here rather than relied on) are the identical hazard for the exact
// same reason `server.close()` alone already was.
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

async function newSession(clientKey: string): Promise<{ token: string; accountId: string }> {
  const res = await fetchWithRetry(`${base}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientKey }),
  });
  assert.equal(res.status, 200);
  return res.json();
}

test('GET /health reports ok with a balanced ledger', async () => {
  const res = await fetchWithRetry(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.deepEqual(body.invariants, []);
});

test('GET / serves the placeholder lobby page with the Cowrie Casino masthead and an honesty note', async () => {
  const res = await fetchWithRetry(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const text = await res.text();
  assert.match(text, /Cowrie Casino/);
  assert.match(text, /no real-money/i);
});

test('GET /balances without a session is 401', async () => {
  const res = await fetchWithRetry(`${base}/balances`);
  assert.equal(res.status, 401);
});

test('POST /session mints a guest account deterministically from a clientKey', async () => {
  const a = await newSession('device-server-test-1');
  const b = await newSession('device-server-test-1');
  assert.equal(a.accountId, b.accountId);
  assert.notEqual(a.token, b.token); // a fresh token every session call, same underlying account
});

test('GET /balances with a session token reports a fresh guest at zero', async () => {
  const { token } = await newSession('device-server-test-2');
  const res = await fetchWithRetry(`${base}/balances`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.tickets, 0);
  assert.equal(body.chips, 0);
});

test('POST /claim-daily-bonus grants tickets once, then reports already-claimed', async () => {
  const { token } = await newSession('device-server-test-3');
  const headers = { authorization: `Bearer ${token}` };
  const first = await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers });
  const firstBody = await first.json();
  assert.equal(firstBody.claimed, true);
  assert.ok(firstBody.ticketsGranted > 0);

  const second = await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers });
  const secondBody = await second.json();
  assert.equal(secondBody.claimed, false);
});

test('POST /claim-tickets is safe to call with no tickets owed yet (starts the accrual clock)', async () => {
  const { token } = await newSession('device-server-test-4');
  const res = await fetchWithRetry(`${base}/claim-tickets`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ticketsGranted, 0);
});

test('POST /buy-in without tickets is refused with 400, not a 500', async () => {
  const { token } = await newSession('device-server-test-5');
  const res = await fetchWithRetry(`${base}/buy-in`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 400);
});

test('full loop: claim daily bonus, then buy into a table with the granted ticket', async () => {
  const { token } = await newSession('device-server-test-6');
  const headers = { authorization: `Bearer ${token}` };
  await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers });
  const buyIn = await fetchWithRetry(`${base}/buy-in`, { method: 'POST', headers });
  assert.equal(buyIn.status, 200);
  const buyInBody = await buyIn.json();
  assert.ok(buyInBody.chipsGranted > 0);
});

test('GET /bundles lists the SKU catalog with no session required', async () => {
  const res = await fetchWithRetry(`${base}/bundles`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.bundles) && body.bundles.length > 0);
});

test('POST /purchase-bundle settles instantly against the mock backend and credits the account', async () => {
  const { token } = await newSession('device-server-test-7');
  const res = await fetchWithRetry(`${base}/purchase-bundle`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ skuId: 'tickets-handful' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.cleared, true);
  assert.ok(body.status.tickets >= body.granted.quantity);
});

test('POST /purchase-bundle with an unknown sku is a 400, not a 500', async () => {
  const { token } = await newSession('device-server-test-8');
  const res = await fetchWithRetry(`${base}/purchase-bundle`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ skuId: 'not-a-real-sku' }),
  });
  assert.equal(res.status, 400);
});

test('GET /audit returns a well-formed hledger journal and a currently-balanced invariant report', async () => {
  const res = await fetchWithRetry(`${base}/audit`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.journal, 'string');
  assert.match(body.journal, /liabilities:energy:/);
  assert.deepEqual(body.invariants, []);
});

test('GET /floor/summary reports presence/jackpot/feed with no session required, and updates once a cast persona sits down', async () => {
  const before = await fetchWithRetry(`${base}/floor/summary`);
  assert.equal(before.status, 200);
  const beforeBody = await before.json();
  assert.equal(typeof beforeBody.presenceCount, 'number');
  assert.equal(typeof beforeBody.jackpot, 'number');
  assert.ok(Array.isArray(beforeBody.players));
  assert.ok(Array.isArray(beforeBody.recentEvents));
  assert.equal(beforeBody.presenceCount, 0); // dormant: no floor WS client has connected yet

  // Fake a live connection the same way the residency's own dormancy check reads it
  // (`room.hub.size()`), then poll /floor/summary (no WS needed on THIS side either) until an
  // on-duty persona sits down — bounded, so a real regression fails the test instead of hanging.
  const remove = floor.room.hub.add({ send: () => true, heartbeat: () => true });
  try {
    let sawPresence = false;
    for (let i = 0; i < 60 && !sawPresence; i++) {
      const res = await fetchWithRetry(`${base}/floor/summary`);
      const body = await res.json();
      if (body.presenceCount > 0) {
        sawPresence = true;
        assert.ok(body.players.every((p) => p.role === 'cast'));
        assert.ok(body.recentEvents.some((e) => e.type === 'sit-down'));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.ok(sawPresence, 'expected an on-duty cast persona to sit down once the floor had a connection');
  } finally {
    remove();
  }
});

test('an unknown route is a 404, not a 500', async () => {
  const res = await fetchWithRetry(`${base}/no-such-route`);
  assert.equal(res.status, 404);
});

test('a path-traversal attempt against the static file server is refused, not served', async () => {
  // %2e%2e survives the URL parser's own dot-segment normalization (which only acts on a
  // literal ".."), reaching resolveStaticFile's decodeURIComponent as "..\/.." — exercising the
  // resolveInside guard for real rather than being normalized away before the request is sent.
  const res = await fetchWithRetry(`${base}/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd`);
  assert.notEqual(res.status, 200);
});

test('GET /vendor/card-table/svg.mjs serves the real card-table renderer as executable JS', async () => {
  const res = await fetchWithRetry(`${base}/vendor/card-table/svg.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
  const text = await res.text();
  assert.match(text, /export function cardFaceMarkup/);
});

// ── Blackjack — Cowrie Casino's first table game ──────────────────────────────────────────

async function grantChips(headers: Record<string, string>): Promise<void> {
  await fetchWithRetry(`${base}/claim-daily-bonus`, { method: 'POST', headers });
  await fetchWithRetry(`${base}/buy-in`, { method: 'POST', headers });
}

test('GET /blackjack/state without a session is 401', async () => {
  const res = await fetchWithRetry(`${base}/blackjack/state`);
  assert.equal(res.status, 401);
});

test('GET /blackjack/state before a table exists is a 404, not a 500', async () => {
  const { token } = await newSession('device-bj-1');
  const res = await fetchWithRetry(`${base}/blackjack/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 404);
});

test('POST /blackjack/intent before a table exists is a 404, not a 500', async () => {
  const { token } = await newSession('device-bj-2');
  const res = await fetchWithRetry(`${base}/blackjack/intent`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'deal', bet: 25 }),
  });
  assert.equal(res.status, 404);
});

test('POST /blackjack/new-table creates a table with the default ruleset and no round in progress', async () => {
  const { token } = await newSession('device-bj-3');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const res = await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-bj-3' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.table.rules.id, 'default');
  assert.equal(body.table.round, null);
  assert.equal(body.table.actions.canDeal, true);
});

test('POST /blackjack/intent deal with a bet the player cannot cover is a 400, not a 500', async () => {
  const { token } = await newSession('device-bj-4');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-bj-4' }) });
  const res = await fetchWithRetry(`${base}/blackjack/intent`, { method: 'POST', headers, body: JSON.stringify({ kind: 'deal', bet: 25 }) });
  assert.equal(res.status, 400);
});

test('POST /blackjack/intent with an unrecognized kind is a 400, not a 500', async () => {
  const { token } = await newSession('device-bj-5');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-bj-5' }) });
  const res = await fetchWithRetry(`${base}/blackjack/intent`, { method: 'POST', headers, body: JSON.stringify({ kind: 'spin' }) });
  assert.equal(res.status, 400);
});

test('a real chip-funded deal round-trips through new-table -> intent(deal) -> GET /state, with a balanced ledger throughout', async () => {
  const { token } = await newSession('device-bj-6');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await grantChips(headers);

  const created = await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-bj-6' }) });
  assert.equal(created.status, 200);

  const dealt = await fetchWithRetry(`${base}/blackjack/intent`, { method: 'POST', headers, body: JSON.stringify({ kind: 'deal', bet: 25 }) });
  assert.equal(dealt.status, 200);
  const dealtBody = await dealt.json();
  assert.ok(dealtBody.table.round !== null);
  assert.ok(dealtBody.status.chips <= 500 - 25); // the buy-in grant minus at least the bet

  const state = await fetchWithRetry(`${base}/blackjack/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(state.status, 200);
  const stateBody = await state.json();
  assert.equal(stateBody.table.round?.phase, dealtBody.table.round?.phase);

  const audit = await fetchWithRetry(`${base}/audit`);
  const auditBody = await audit.json();
  assert.deepEqual(auditBody.invariants, []);
});

test('the House Math panel: a hand awaiting a decision reports numeric EV for every currently-legal action', async () => {
  // Blackjack naturals settle immediately with no decision to price (houseMath is null there
  // by design — see ev.mts), so this loops over a few seeds to reliably land on an ordinary
  // player-turn round rather than asserting on a specific hand.
  let sawPlayerTurn = false;
  for (let i = 0; i < 30 && !sawPlayerTurn; i += 1) {
    const { token } = await newSession(`device-bj-housemath-${i}`);
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    await grantChips(headers);
    await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: `server-test-housemath-${i}` }) });
    const res = await fetchWithRetry(`${base}/blackjack/intent`, { method: 'POST', headers, body: JSON.stringify({ kind: 'deal', bet: 25 }) });
    const body = await res.json();
    if (body.table.round?.phase === 'player-turn') {
      sawPlayerTurn = true;
      assert.equal(typeof body.table.houseMath.ev.stand, 'number');
      assert.equal(typeof body.table.houseMath.ev.hit, 'number');
      assert.ok(['stand', 'hit', 'double', 'split'].includes(body.table.houseMath.bestAction));
    }
  }
  assert.equal(sawPlayerTurn, true, 'expected at least one of 30 seeds to reach an ordinary player-turn round');
});

test('GET /blackjack/state never leaks the dealer\'s hidden hole card', async () => {
  let sawHiddenHole = false;
  for (let i = 0; i < 15 && !sawHiddenHole; i += 1) {
    const { token } = await newSession(`device-bj-hole-${i}`);
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    await grantChips(headers);
    await fetchWithRetry(`${base}/blackjack/new-table`, { method: 'POST', headers, body: JSON.stringify({ seed: `server-test-hole-${i}` }) });
    const res = await fetchWithRetry(`${base}/blackjack/intent`, { method: 'POST', headers, body: JSON.stringify({ kind: 'deal', bet: 25 }) });
    const body = await res.json();
    if (body.table.round?.phase === 'player-turn') {
      sawHiddenHole = true;
      assert.equal(body.table.round.dealerCards[1], null);
      assert.notEqual(body.table.round.dealerCards[0], null);
    }
  }
  assert.equal(sawHiddenHole, true);
});

// ── Tideline Treasures — Cowrie Casino's second game (src/games/slots/) ────────────────────────

test('GET /slots/state without a session is 401', async () => {
  const res = await fetchWithRetry(`${base}/slots/state`);
  assert.equal(res.status, 401);
});

test('GET /slots/state before a machine exists is a 404, not a 500', async () => {
  const { token } = await newSession('device-slots-1');
  const res = await fetchWithRetry(`${base}/slots/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(res.status, 404);
});

test('POST /slots/spin before a machine exists is a 404, not a 500', async () => {
  const { token } = await newSession('device-slots-2');
  const res = await fetchWithRetry(`${base}/slots/spin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ betPerLine: 5 }),
  });
  assert.equal(res.status, 404);
});

test('GET /slots/paylines returns the 20 published payline patterns with no session required', async () => {
  const res = await fetchWithRetry(`${base}/slots/paylines`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.paylines.length, 20);
  assert.equal(body.paylines[0].length, 5); // one row index per reel
});

test('POST /slots/new-machine creates a machine with the default ruleset, ready to spin, and real House Math figures', { timeout: 20_000 }, async () => {
  const { token } = await newSession('device-slots-3');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const res = await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-3' }) });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.machine.rules.id, 'default');
  assert.equal(body.machine.phase, 'ready');
  assert.equal(body.machine.actions.canSpin, true);
  assert.equal(body.machine.lastResult, null);
  assert.ok(body.machine.houseMath.overallRTP > 0.9 && body.machine.houseMath.overallRTP < 0.97);
  assert.ok(body.machine.houseMath.jackpotOddsOneIn > 0);
});

test('POST /slots/spin with a bet the player cannot cover is a 400, not a 500', async () => {
  const { token } = await newSession('device-slots-4');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-4' }) });
  const res = await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine: 5 }) });
  assert.equal(res.status, 400);
});

test('POST /slots/collect with nothing to collect is a 400, not a 500', async () => {
  const { token } = await newSession('device-slots-5');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-5' }) });
  const res = await fetchWithRetry(`${base}/slots/collect`, { method: 'POST', headers });
  assert.equal(res.status, 400);
});

test('a real chip-funded spin round-trips through new-machine -> spin -> collect -> GET /state, with a balanced ledger throughout', { timeout: 20_000 }, async () => {
  const { token } = await newSession('device-slots-6');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await grantChips(headers); // 1 daily-bonus ticket -> one buy-in -> 500 chips

  const created = await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-6' }) });
  assert.equal(created.status, 200);
  const createdBody = await created.json();
  const totalBet = createdBody.machine.rules.defaultBetPerLine * createdBody.machine.rules.paylineCount;
  assert.ok(createdBody.status.chips >= totalBet, 'expected the buy-in grant to cover at least one spin');

  const spun = await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine: createdBody.machine.rules.defaultBetPerLine }) });
  assert.equal(spun.status, 200);
  const spunBody = await spun.json();
  assert.equal(spunBody.machine.phase, 'result');
  assert.equal(spunBody.machine.actions.canCollect, true);
  assert.equal(spunBody.machine.lastResult.base.grid.length, 5);
  assert.equal(spunBody.machine.lastResult.base.grid[0].length, 3);
  assert.equal(
    spunBody.machine.lastResult.totalPayout,
    spunBody.machine.lastResult.base.totalPayout + spunBody.machine.lastResult.bonusSpins.reduce((s: number, o: { totalPayout: number }) => s + o.totalPayout, 0),
  );

  const auditMid = await (await fetchWithRetry(`${base}/audit`)).json();
  assert.deepEqual(auditMid.invariants, []);

  const collected = await fetchWithRetry(`${base}/slots/collect`, { method: 'POST', headers });
  assert.equal(collected.status, 200);
  const collectedBody = await collected.json();
  assert.equal(collectedBody.machine.phase, 'ready');
  assert.equal(collectedBody.machine.actions.canSpin, true);
  assert.equal(collectedBody.machine.lastResult, null);

  const state = await fetchWithRetry(`${base}/slots/state`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(state.status, 200);
  const stateBody = await state.json();
  assert.equal(stateBody.machine.spinsPlayed, 1);

  const audit = await fetchWithRetry(`${base}/audit`);
  const auditBody = await audit.json();
  assert.deepEqual(auditBody.invariants, []);
});

test('POST /slots/spin with an out-of-range bet is a 400, not a 500', async () => {
  const { token } = await newSession('device-slots-7');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await grantChips(headers);
  await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-7' }) });
  const res = await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine: 0 }) });
  assert.equal(res.status, 400);
});

test('spinning twice without collecting is a 400, not a 500', async () => {
  const { token } = await newSession('device-slots-8');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await grantChips(headers);
  const created = await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-8' }) });
  const createdBody = await created.json();
  const betPerLine = createdBody.machine.rules.defaultBetPerLine;
  await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine }) });
  const res = await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine }) });
  assert.equal(res.status, 400);
});

test('a jackpot hit, if one lands within a bounded sample of spins, pays the live pool and never leaves the books unbalanced', async () => {
  // Jackpot odds are exactly 1-in-1,048,576 (see ev.test.mts) — far too rare to hit within a fast
  // test's own budget. This test instead proves the SHAPE of the response is always well-formed
  // (jackpotHit/jackpotPayout present and consistent) across a real run of spins, which is the
  // part every spin actually exercises, win or not.
  const { token } = await newSession('device-slots-9');
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  await grantChips(headers);
  const created = await fetchWithRetry(`${base}/slots/new-machine`, { method: 'POST', headers, body: JSON.stringify({ seed: 'server-test-slots-9' }) });
  const createdBody = await created.json();
  const betPerLine = createdBody.machine.rules.minBetPerLine;
  const totalBet = betPerLine * createdBody.machine.rules.paylineCount;
  let spins = 0;
  while (spins < 15) {
    const stateRes = await fetchWithRetry(`${base}/slots/state`, { headers: { authorization: `Bearer ${token}` } });
    const stateBody = await stateRes.json();
    if (stateBody.status.chips < totalBet) break;
    const spun = await fetchWithRetry(`${base}/slots/spin`, { method: 'POST', headers, body: JSON.stringify({ betPerLine }) });
    assert.equal(spun.status, 200);
    const spunBody = await spun.json();
    assert.equal(typeof spunBody.machine.lastResult.jackpotHit, 'boolean');
    assert.equal(typeof spunBody.machine.lastResult.jackpotPayout, 'number');
    if (!spunBody.machine.lastResult.jackpotHit) assert.equal(spunBody.machine.lastResult.jackpotPayout, 0);
    await fetchWithRetry(`${base}/slots/collect`, { method: 'POST', headers });
    spins += 1;
  }
  const audit = await fetchWithRetry(`${base}/audit`);
  const auditBody = await audit.json();
  assert.deepEqual(auditBody.invariants, []);
});

// ── qwzspace/resonator vendor passthrough ───────────────────────────────────────────────────────

test('GET /vendor/qwzspace/drawables.mjs serves the real qwzspace module as executable JS', async () => {
  const res = await fetchWithRetry(`${base}/vendor/qwzspace/drawables.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
  const text = await res.text();
  assert.match(text, /export function registerDrawable/);
});

test('GET /vendor/qwzspace/render-loop.mjs resolves its own sibling relative import (project.mjs) through the same vendor root', async () => {
  const res = await fetchWithRetry(`${base}/vendor/qwzspace/render-loop.mjs`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /from ".\/project\.mjs"/);
  const sibling = await fetchWithRetry(`${base}/vendor/qwzspace/project.mjs`);
  assert.equal(sibling.status, 200);
});

test('GET /vendor/resonator/web/webaudio-adapter.mjs serves the real resonator module as executable JS', async () => {
  const res = await fetchWithRetry(`${base}/vendor/resonator/web/webaudio-adapter.mjs`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /javascript/);
  const text = await res.text();
  assert.match(text, /export \{ createAudioEngine \}/);
});

test('GET /vendor/resonator/game/index.mjs resolves a cross-directory relative import (../voice/presets.mjs) through the same vendor root', async () => {
  const res = await fetchWithRetry(`${base}/vendor/resonator/game/index.mjs`);
  assert.equal(res.status, 200);
  const sibling = await fetchWithRetry(`${base}/vendor/resonator/voice/presets.mjs`);
  assert.equal(sibling.status, 200);
});

test('a vendor path outside a known package root is refused, not served', async () => {
  const res = await fetchWithRetry(`${base}/vendor/unknown-package/whatever.mjs`);
  assert.equal(res.status, 404);
});

test('a vendor traversal attempt against a real package root is refused, not served', async () => {
  // A real, existing .mjs file (card-table/src/svg.mjs) three directories up from qwzspace's own
  // vendored root — .mjs so this actually exercises resolveInside's guard, not just the ".mjs
  // only" extension check the vendor route also applies.
  const res = await fetchWithRetry(`${base}/vendor/qwzspace/%2e%2e/%2e%2e/%2e%2e/card-table/src/svg.mjs`);
  assert.notEqual(res.status, 200);
});

test('GET /slots.html serves the spectacle client page', async () => {
  const res = await fetchWithRetry(`${base}/slots.html`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /Tideline Treasures/);
});
