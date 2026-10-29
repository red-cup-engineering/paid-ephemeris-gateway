import assert from "node:assert/strict";
import test from "node:test";

import { createWorkerHandler, PRECISION_PROXY_ROUTES, proxyToPrecisionOrigin } from "../src/worker.mjs";

function decodeChallenge(response) {
  return JSON.parse(Buffer.from(response.headers.get("payment-required"), "base64").toString("utf8"));
}

test("PRECISION_PROXY_ROUTES names exactly the two subprocess-only routes", () => {
  assert.deepEqual(PRECISION_PROXY_ROUTES, [
    "/v1/ephemeris/precision-moment/{date}",
    "/v1/astronomy/precision-positions/{date}",
  ]);
});

test("proxyToPrecisionOrigin(): rewrites resource.url to the public origin, leaves everything else untouched", async () => {
  const originChallenge = {
    x402Version: 2,
    resource: { url: "http://45.76.19.133:8086/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z", mimeType: "application/json" },
    accepts: [{ scheme: "exact", network: "eip155:8453", amount: "320000", payTo: "0x32886F6F361C1d570255c2762967A2e41D0E9B1a" }],
  };
  const header = Buffer.from(JSON.stringify(originChallenge)).toString("base64");
  let fetchedUrl;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    fetchedUrl = url.toString();
    return new Response("{}", { status: 402, headers: { "payment-required": header } });
  };
  try {
    const request = new Request("https://ephemeris.561.group/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z");
    const response = await proxyToPrecisionOrigin(request, "http://45.76.19.133:8086");
    assert.equal(fetchedUrl, "http://45.76.19.133:8086/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z");
    assert.equal(response.status, 402);
    const challenge = decodeChallenge(response);
    assert.equal(challenge.resource.url, "https://ephemeris.561.group/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z");
    assert.deepEqual(challenge.accepts, originChallenge.accepts);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxyToPrecisionOrigin(): a settled 200 response passes through unchanged", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ tier: "precision-moment" }, { headers: { "payment-response": "abc" } });
  try {
    const request = new Request("https://ephemeris.561.group/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z", {
      headers: { "payment-signature": "sig" },
    });
    const response = await proxyToPrecisionOrigin(request, "http://45.76.19.133:8086");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("payment-response"), "abc");
    assert.deepEqual(await response.json(), { tier: "precision-moment" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createWorkerHandler(): with PRECISION_ORIGIN set, proxies the precision routes instead of 404ing locally", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ status: "ok", service: "precision-origin-stub" });
  try {
    const worker = createWorkerHandler();
    const response = await worker.fetch(
      new Request("https://ephemeris.561.group/v1/ephemeris/precision-moment/2026-07-21T00:00:00Z"),
      { PRECISION_ORIGIN: "http://45.76.19.133:8086" },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "precision-origin-stub" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
