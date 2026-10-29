// bucket-store — exercises the GCS-backed store against the fake-gcs in-memory HTTP double
// (helpers/fake-gcs.mts): @red-cup-engineering/footing's run/score/scored-lock half (re-verified
// here under REAL concurrent HTTP requests, a stronger double than footing's own mocked-fetch
// suite -- kept deliberately redundant, not wasteful, given how safety-critical the
// exactly-one-winner guarantee is) plus ruinfold's OWN remaining ledger/boon GCS extension
// (store.mts/bucket-store.mts), and this app's composed store-factory.mts backend selection.
// Also covers createGoogleApiRequest's in-memory expiry-aware token caching directly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { createGcsClient, createGoogleApiRequest, openBucketDailyStore } from "@red-cup-engineering/footing/bucket-store";
import type { RunRecord, ScoreRecord } from "@red-cup-engineering/footing/store";
import { openBucketLedgerBoonStore } from "#server/bucket-store.mts";
import type { LedgerEntry, BoonRecord } from "#server/store.mts";
import { openStoreAuto } from "#server/store-factory.mts";
import type { FakeGcs } from "./helpers/fake-gcs.mts";
import { localFetch, startFakeGcs, startFakeMetadataServer } from "./helpers/fake-gcs.mts";

// The fake-gcs double never checks the Authorization header, so tests talk to it with plain,
// unauthenticated `localFetch` (see its own header — absorbs a sandbox-local loopback quirk, not a
// production concern) rather than routing through createGoogleApiRequest()/the real metadata server
// — token-fetching itself gets its own dedicated coverage further down.
function bucketOpts(fake: FakeGcs, root: string) {
  return { bucket: fake.bucket, apiBase: fake.url, root, request: localFetch };
}

function run(over: Partial<RunRecord> = {}): RunRecord {
  return {
    runId: `2026-08-19__alice__${randomUUID()}`,
    date: "2026-08-19",
    actor: "alice",
    mode: "scored",
    seed: "0x00000001",
    moves: [{ tick: 0, seq: 0, intent: { kind: "wait" } }],
    endedAt: { tick: 10, reason: "tick-cap" },
    score: 42,
    submittedAt: "2026-08-19T12:00:00.000Z",
    ...over,
  } as RunRecord;
}

function score(over: Partial<ScoreRecord> = {}): ScoreRecord {
  return {
    runId: "2026-08-19__alice__fixture",
    date: "2026-08-19",
    actor: "alice",
    score: 42,
    endedAtTick: 10,
    reason: "tick-cap",
    submittedAt: "2026-08-19T12:00:00.000Z",
    ...over,
  } as ScoreRecord;
}

function ledgerEntry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    wouldPay: true,
    date: "2026-08-19",
    ref: "accrue-ruinfold-20260819",
    actor: "alice",
    amountUsd: 0.01,
    postings: [],
    reason: "test",
    gates: { note: "test" },
    recordedAt: "2026-08-19T12:00:00.000Z",
    ...over,
  };
}

function boon(over: Partial<BoonRecord> = {}): BoonRecord {
  return {
    actor: "alice",
    weeklyScore: 100,
    rank: 1,
    boonName: "Ashfall Coronet",
    edge: { armor: 1 },
    sourceWeekStart: "2026-08-10",
    appliesWeekStart: "2026-08-17",
    computedAt: "2026-08-19T12:00:00.000Z",
    ...over,
  };
}

// ---- footing's run/score/scored-lock surface, re-verified under real concurrent HTTP ----------

test("footing openBucketDailyStore: appendRun/readRunsForDate/readRunById round-trip", async () => {
  const fake = await startFakeGcs();
  try {
    const store = openBucketDailyStore(bucketOpts(fake, `t-${randomUUID()}`));
    const r1 = run({ runId: `2026-08-19__alice__${randomUUID()}` });
    const r2 = run({ runId: `2026-08-19__bob__${randomUUID()}`, actor: "bob" });
    await store.appendRun(r1);
    await store.appendRun(r2);

    const runs = await store.readRunsForDate("2026-08-19");
    assert.equal(runs.length, 2);
    assert.deepEqual(runs.map((r: RunRecord) => r.runId).sort(), [r1.runId, r2.runId].sort());

    const found = await store.readRunById("2026-08-19", r1.runId);
    assert.deepEqual(found, r1);
    assert.equal(await store.readRunById("2026-08-19", "no-such-run"), null);
    assert.deepEqual(await store.readRunsForDate("2026-08-20"), []); // untouched date -> empty, no 404 leaking
  } finally {
    await fake.close();
  }
});

test("footing openBucketDailyStore: concurrent appendRun to the SAME date retries through 412 and loses no line", async () => {
  const fake = await startFakeGcs();
  try {
    const root = `t-${randomUUID()}`;
    const store = openBucketDailyStore(bucketOpts(fake, root));

    const N = 12;
    const records = Array.from({ length: N }, (_, i) => run({ runId: `2026-08-19__actor${i}__${randomUUID()}`, actor: `actor${i}` }));
    await Promise.all(records.map((r) => store.appendRun(r)));

    const stored = await store.readRunsForDate("2026-08-19");
    assert.equal(stored.length, N); // every concurrent append survived — none were clobbered
    assert.deepEqual(
      stored.map((r: RunRecord) => r.runId).sort(),
      records.map((r) => r.runId).sort(),
    );

    // Prove the retry path was actually exercised, not just luckily serialized.
    assert.ok(fake.preconditionFailures > 0, `expected at least one 412 under ${N}-way contention, got 0`);
  } finally {
    await fake.close();
  }
});

test("footing openBucketDailyStore: writeScoredLock — exactly one winner under 10 concurrent attempts", async () => {
  const fake = await startFakeGcs();
  try {
    const root = `t-${randomUUID()}`;
    const store = openBucketDailyStore(bucketOpts(fake, root));

    const N = 10;
    const attempts = Array.from({ length: N }, (_, i) => `run-${i}`);
    const results = await Promise.allSettled(attempts.map((runId) => store.writeScoredLock("2026-08-19", "racer", runId)));

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    assert.equal(fulfilled.length, 1, `expected exactly 1 winner, got ${fulfilled.length}`);
    assert.equal(rejected.length, N - 1, `expected ${N - 1} losers, got ${rejected.length}`);
    assert.equal(await store.hasScoredLock("2026-08-19", "racer"), true);

    const client = createGcsClient(bucketOpts(fake, root));
    const obj = await client.getObject(`${root}/scored-attempts/2026-08-19/racer.json`);
    assert.ok(obj, "lock object should exist");
    const persisted = JSON.parse(obj!.text) as { runId: string };
    assert.ok(attempts.includes(persisted.runId));
  } finally {
    await fake.close();
  }
});

// ---- ruinfold's OWN remaining ledger/boon GCS extension ----------------------------------------

test("openBucketLedgerBoonStore: appendLedger/hasLedgerRef and appendBoon/readBoonsForWeek/hasBoonsForWeek", async () => {
  const fake = await startFakeGcs();
  try {
    const root = `t-${randomUUID()}`;
    const store = openBucketLedgerBoonStore(bucketOpts(fake, root));

    assert.equal(await store.hasLedgerRef("accrue-ruinfold-20260819"), false);
    await store.appendLedger(ledgerEntry());
    assert.equal(await store.hasLedgerRef("accrue-ruinfold-20260819"), true);
    assert.equal(await store.hasLedgerRef("no-such-ref"), false);

    assert.equal(await store.hasBoonsForWeek("2026-08-17"), false);
    await store.appendBoon(boon());
    await store.appendBoon(boon({ actor: "bob", rank: 2, boonName: "Cinderveil Cloak", appliesWeekStart: "2026-08-24" }));
    assert.equal(await store.hasBoonsForWeek("2026-08-17"), true);
    const week17 = await store.readBoonsForWeek("2026-08-17");
    assert.equal(week17.length, 1);
    assert.equal(week17[0]?.actor, "alice");
    const week24 = await store.readBoonsForWeek("2026-08-24");
    assert.equal(week24.length, 1);
    assert.equal(week24[0]?.actor, "bob");
  } finally {
    await fake.close();
  }
});

// ---- createGoogleApiRequest: in-memory expiry-aware token caching (footing's export) ----------

test("createGoogleApiRequest: caches the token until near expiry, then refreshes", async () => {
  const meta = await startFakeMetadataServer({ token: "tok-1", expiresIn: 3600 });
  try {
    let clock = 1_000_000; // arbitrary epoch-ms start
    const request = createGoogleApiRequest({ metadataUrl: meta.url, now: () => clock });

    const echoServer = await startEchoServer();
    try {
      const res1 = await request(`${echoServer.url}/ping`);
      assert.equal((await res1.json()).headers.authorization, "Bearer tok-1");
      assert.equal(meta.requestCount, 1);

      clock += 60_000; // +1 minute — well within lifetime, cached
      await request(`${echoServer.url}/ping`);
      assert.equal(meta.requestCount, 1);

      clock += 3600_000; // well past expiry — must refetch
      await request(`${echoServer.url}/ping`);
      assert.equal(meta.requestCount, 2);
    } finally {
      await echoServer.close();
    }
  } finally {
    await meta.close();
  }
});

test("createGoogleApiRequest: surfaces a clear error when the metadata server rejects the request", async () => {
  const request = createGoogleApiRequest({ metadataUrl: "http://127.0.0.1:1", now: () => Date.now() });
  await assert.rejects(() => request("http://127.0.0.1:1/whatever"));
});

// ---- ruinfold's own composed store-factory: backend selection for the FULL surface -------------

test("store-factory: openStoreAuto composes footing's file-store + ruinfold's ledger/boon extension when RUINFOLD_BUCKET is unset", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ruinfold-factory-"));
  try {
    const store = openStoreAuto(dir, {});
    await store.appendRun(run());
    await store.appendLedger(ledgerEntry());
    assert.equal((await store.readRunsForDate("2026-08-19")).length, 1);
    assert.equal(await store.hasLedgerRef("accrue-ruinfold-20260819"), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("store-factory: openStoreAuto composes footing's bucket-store + ruinfold's ledger/boon extension when RUINFOLD_BUCKET is set", async () => {
  const fake = await startFakeGcs();
  try {
    const root = `t-${randomUUID()}`;
    const store = openStoreAuto(root, { RUINFOLD_BUCKET: fake.bucket }, { apiBase: fake.url, request: localFetch });
    await store.appendRun(run());
    await store.appendBoon(boon());
    assert.equal((await store.readRunsForDate("2026-08-19")).length, 1);
    assert.equal((await store.readBoonsForWeek("2026-08-17")).length, 1);
  } finally {
    await fake.close();
  }
});

// ---- tiny echo server used only by the token-caching test -----------------------------------

async function startEchoServer(): Promise<{ url: string; close(): Promise<void> }> {
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ headers: req.headers }));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}
