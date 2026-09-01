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
    const res = await fetch(`${base}/../../../../etc/passwd`);
    assert.notEqual(res.status, 200);
  });
});

test("an unknown path 404s rather than throwing a raw server error", async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/this/path/does/not/exist.txt`);
    assert.equal(res.status, 404);
  });
});
