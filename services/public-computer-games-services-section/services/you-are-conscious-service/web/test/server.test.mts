import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../server.mjs";

async function waitUntilReachable(base: string, attempts = 20, delayMs = 50): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(`${base}/`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitUntilReachable(base);
    await fn(base);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("GET / serves index.html", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /<title>You Are Conscious/);
  });
});

test("GET /web/index.html serves the real web asset", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/web/index.html`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<title>You Are Conscious/);
  });
});

test("ordinary static files preserve ETag revalidation, cache policy, ranges, and methods", async () => {
  await withServer(async (base) => {
    const first = await fetch(`${base}/web/index.html`);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "no-cache");
    const etag = first.headers.get("etag");
    assert.ok(etag);

    const revalidated = await fetch(`${base}/web/index.html`, { headers: { "If-None-Match": etag } });
    assert.equal(revalidated.status, 304);
    assert.equal(await revalidated.text(), "");
    const full = new Uint8Array(await (await fetch(`${base}/web/css/style.css`)).arrayBuffer());
    const ranged = await fetch(`${base}/web/css/style.css`, { headers: { Range: "bytes=0-9" } });
    assert.equal(ranged.status, 206);
    assert.equal(ranged.headers.get("accept-ranges"), "bytes");
    assert.equal(ranged.headers.get("content-range"), `bytes 0-9/${full.byteLength}`);
    assert.deepEqual(new Uint8Array(await ranged.arrayBuffer()), full.slice(0, 10));
    assert.equal((await fetch(`${base}/web/index.html`, { method: "POST" })).status, 200);
  });
});

test("GET /src/graph.mts serves stripped, valid JavaScript (no TypeScript syntax survives)", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/src/graph.mts`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /javascript/);
    const text = await res.text();
    assert.doesNotMatch(text, /: ProductionGraph/, "type annotations must be stripped");
    assert.match(text, /export function toMatrix/);
  });
});

test("GET /vendor/red-cup-engineering-cartridge/replay.mjs serves the real vendored cartridge package", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/vendor/red-cup-engineering-cartridge/replay.mjs`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /defaultReplay/);
  });
});

test("GET /api/manifest returns the real CartridgeManifest as JSON, matching cartridge.manifest.mts", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/manifest`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.id, "you-are-conscious");
    assert.equal(json.replayVerifier, "src/cartridge.manifest.mts#verify");
  });
});

test("a path-traversal attempt is rejected, not served", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/..%2f..%2f..%2f..%2fetc%2fpasswd`);
    assert.notEqual(res.status, 200);
  });
});

test("an unknown path 404s rather than throwing a raw server error", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/this/path/does/not/exist.txt`);
    assert.equal(res.status, 404);
  });
});
