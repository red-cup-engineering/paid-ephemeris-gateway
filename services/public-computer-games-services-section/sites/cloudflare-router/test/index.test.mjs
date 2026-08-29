import test from "node:test";
import assert from "node:assert/strict";
import { ORIGIN_BY_HOST, upstreamRequestFor } from "../src/index.mjs";
import worker from "../src/index.mjs";

test("rewrites Host and URL to the matching Cloud Run origin", () => {
  for (const [host, origin] of ORIGIN_BY_HOST) {
    const request = new Request(`https://${host}/some/path?x=1`, {
      method: "POST",
      headers: { "x-test": "yes" },
      body: "payload",
    });
    const upstream = upstreamRequestFor(request);
    assert.ok(upstream, `expected an upstream request for ${host}`);
    assert.equal(new URL(upstream.url).hostname, origin);
    assert.equal(new URL(upstream.url).pathname, "/some/path");
    assert.equal(new URL(upstream.url).search, "?x=1");
    assert.equal(upstream.headers.get("Host"), origin);
    assert.equal(upstream.method, "POST");
    assert.equal(upstream.headers.get("x-test"), "yes");
  }
});

test("returns null for a hostname with no mapping", () => {
  const request = new Request("https://unknown.561.group/");
  assert.equal(upstreamRequestFor(request), null);
});

test("a plain-object prototype key is not mistaken for a mapped host", () => {
  const request = new Request("https://__proto__/");
  assert.equal(upstreamRequestFor(request), null);
});

test("worker.fetch returns 404 for an unmapped host", async () => {
  const request = new Request("https://unknown.561.group/");
  const response = await worker.fetch(request);
  assert.equal(response.status, 404);
});

test("worker.fetch proxies to the rewritten origin for a mapped host", async (t) => {
  const originalFetch = globalThis.fetch;
  let seenRequest = null;
  globalThis.fetch = async (request) => {
    seenRequest = request;
    return new Response("ok", { status: 200 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const request = new Request("https://play.561.group/lobby");
  const response = await worker.fetch(request);

  assert.equal(response.status, 200);
  assert.equal(
    new URL(seenRequest.url).hostname,
    "play-561-group-1019481907460.us-central1.run.app",
  );
});
