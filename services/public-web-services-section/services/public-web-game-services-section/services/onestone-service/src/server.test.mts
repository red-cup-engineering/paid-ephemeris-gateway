/**
 * `server.test` — exercises the HTTP/SSE transport entirely against mock collaborators.
 *
 * server.mts is deliberately a dependency-injected factory (see its module header) precisely
 * so these tests never need scene.mts/payments.mts/ledger.mts/economy.mts/client.mts to exist
 * or compile — every one of them is being built by a different agent in parallel right now.
 * Nothing here is blocked.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "node:http";
import {
  BODY_LIMIT,
  configuredPort,
  createServer,
  isClientInput,
  type ClearedPurchase,
  type LedgerLike,
  type PaymentsLike,
  type SceneLike,
  type ServerDeps,
} from "./server.mts";
import type { ClientFrame, PlayerMeta, Sku } from "./types.mts";

// ── mock collaborators, shaped exactly to the structural interfaces server.mts declares ──────

function freshMeta(): PlayerMeta {
  return {
    unlocked: 1,
    stars: {},
    wallet: { shards: 0, prisms: 0 },
    boosters: { hammer: 0, shuffle: 0, extraMoves: 0, prismStart: 0 },
    lives: 5,
    nextLifeAt: 0,
    streak: 0,
    garden: [],
    passUntil: 0,
  };
}

function freshFrame(): ClientFrame {
  return {
    kind: "state",
    levelId: 0,
    geometry: { tiling: "square", cells: [], rails: [], railsAt: [], width: 0, height: 0, paletteSize: 5 },
    tiles: [],
    movesLeft: 0,
    goals: [],
    score: 0,
    lastSteps: [],
    chaosSix: false,
    finished: null,
    meta: freshMeta(),
  };
}

interface MockScene extends SceneLike {
  readonly grants: { account: string; sku: Sku }[];
  readonly pushed: Map<string, ClientFrame[]>;
}

function makeMockScene(): MockScene {
  const frames = new Map<string, ClientFrame>();
  const subscribers = new Map<string, Set<(frame: ClientFrame) => void>>();
  const pushed = new Map<string, ClientFrame[]>();
  const grants: { account: string; sku: Sku }[] = [];
  let counter = 0;
  return {
    grants,
    pushed,
    login(name) {
      counter += 1;
      const account = `acct-${name}`;
      const token = `tok-${counter}`;
      if (!frames.has(account)) frames.set(account, freshFrame());
      return { token, account };
    },
    frame(account) {
      return frames.get(account) ?? freshFrame();
    },
    input(account, input) {
      const current = frames.get(account) ?? freshFrame();
      const next: ClientFrame = { ...current, score: current.score + (input.kind === "swap" ? 10 : 0), lastSteps: [] };
      frames.set(account, next);
      for (const fn of subscribers.get(account) ?? []) fn(next);
      const log = pushed.get(account) ?? [];
      log.push(next);
      pushed.set(account, log);
      return next;
    },
    subscribe(account, fn) {
      const set = subscribers.get(account) ?? new Set();
      set.add(fn);
      subscribers.set(account, set);
      return () => set.delete(fn);
    },
    grantSku(account, sku) {
      grants.push({ account, sku });
    },
    snapshot() {
      return { frames: [...frames.entries()] };
    },
    async persist() {
      /* no-op in tests */
    },
  };
}

const TEST_SKUS: readonly Sku[] = [{ id: "prisms-small", title: "Handful of Prisms", cents: 99, grant: { kind: "prisms", amount: 10 } }];

function makeMockPayments(skus: readonly Sku[]): PaymentsLike {
  const orders = new Map<string, { account: string; sku: Sku }>();
  let counter = 0;
  return {
    available() {
      return [{ id: "mock", configured: true }];
    },
    async intent(account, skuId, provider) {
      const sku = skus.find((s) => s.id === skuId);
      if (sku === undefined) throw new Error(`unknown sku ${skuId}`);
      counter += 1;
      const orderId = `ord-${counter}`;
      orders.set(orderId, { account, sku });
      return { provider: provider ?? "mock", orderId, instructions: { kind: "mock" } };
    },
    async settle(orderId): Promise<ClearedPurchase | null> {
      const order = orders.get(orderId);
      return order === undefined ? null : { order: { account: order.account }, sku: order.sku };
    },
    async settleStripeWebhook() {
      return null;
    },
  };
}

function makeMockLedger(): LedgerLike {
  return {
    audit() {
      return { journal: "2026-08-12 * test purchase  ; ref:ord-1\n    assets:cash:mock  0.99 USD\n    income:premium  -0.99 USD\n" };
    },
  };
}

function makeDeps(overrides: Partial<ServerDeps> = {}): ServerDeps & { scene: MockScene } {
  const scene = makeMockScene();
  return {
    scene,
    payments: makeMockPayments(TEST_SKUS),
    ledger: makeMockLedger(),
    skus: TEST_SKUS,
    clientHtml: "<!doctype html><title>onestone test</title>",
    now: () => 1_000,
    ...overrides,
  };
}

/**
 * Some loopback network stacks (observed in this sandbox under WSL2) don't accept connections
 * on a just-bound ephemeral port for a few milliseconds after the 'listening' event fires — the
 * very first connect can spuriously ECONNREFUSED. Retry briefly rather than let that flake tests.
 */
async function waitUntilAcceptingConnections(port: number): Promise<void> {
  const deadline = Date.now() + 2_000;
  for (;;) {
    try {
      await fetch(`http://127.0.0.1:${port}/healthz`);
      return;
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

async function withServer<T>(deps: ServerDeps, fn: (baseUrl: string, server: Server) => Promise<T>): Promise<T> {
  const server = createServer(deps);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await waitUntilAcceptingConnections(port);
  try {
    return await fn(`http://127.0.0.1:${port}`, server);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

// ── pure helper unit tests (no network) ───────────────────────────────────────────────

test("configuredPort: default, override, and rejects garbage", () => {
  assert.equal(configuredPort({}), 18_796);
  assert.equal(configuredPort({ ONESTONE_PORT: "4000" }), 4_000);
  assert.equal(configuredPort({ PORT: "5000" }), 5_000);
  assert.equal(configuredPort({ ONESTONE_PORT: "4000", PORT: "5000" }), 4_000);
  assert.throws(() => configuredPort({ ONESTONE_PORT: "not-a-port" }));
  assert.throws(() => configuredPort({ ONESTONE_PORT: "99999" }));
});

test("isClientInput: accepts the four wire shapes and rejects junk", () => {
  assert.equal(isClientInput({ kind: "start", levelId: 3 }), true);
  assert.equal(isClientInput({ kind: "swap", a: 1, b: 2 }), true);
  assert.equal(isClientInput({ kind: "booster", booster: "hammer", cell: 4 }), true);
  assert.equal(isClientInput({ kind: "booster", booster: "hammer" }), true);
  assert.equal(isClientInput({ kind: "abandon" }), true);
  assert.equal(isClientInput({ kind: "booster", booster: "not-a-booster" }), false);
  assert.equal(isClientInput({ kind: "swap", a: 1 }), false);
  assert.equal(isClientInput({ kind: "mystery" }), false);
  assert.equal(isClientInput(null), false);
  assert.equal(isClientInput("start"), false);
});

// ── HTTP integration tests ─────────────────────────────────────────────────────────────

test("GET /healthz returns ok with security headers", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, "ok");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.ok(res.headers.get("content-security-policy")?.includes("default-src 'self'"));
  });
});

test("GET / serves the client HTML with security headers", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    const text = await res.text();
    assert.match(text, /onestone test/);
  });
});

test("session -> input -> frame round trip over real HTTP", async () => {
  await withServer(makeDeps(), async (base) => {
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    });
    assert.equal(sessionRes.status, 200);
    const { token, account } = (await sessionRes.json()) as { token: string; account: string };
    assert.equal(account, "acct-Ada");
    assert.ok(token.length > 0);

    const startRes = await fetch(`${base}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, input: { kind: "start", levelId: 1 } }),
    });
    assert.equal(startRes.status, 200);
    const startFrame = (await startRes.json()) as ClientFrame;
    assert.equal(startFrame.kind, "state");
    assert.equal(startFrame.score, 0);

    const swapRes = await fetch(`${base}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, input: { kind: "swap", a: 0, b: 1 } }),
    });
    assert.equal(swapRes.status, 200);
    const swapFrame = (await swapRes.json()) as ClientFrame;
    assert.equal(swapFrame.score, 10);
  });
});

test("POST /input without a valid token is rejected", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "nonsense", input: { kind: "abandon" } }),
    });
    assert.equal(res.status, 401);
  });
});

test("POST /input with a malformed input body is rejected", async () => {
  await withServer(makeDeps(), async (base) => {
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bea" }),
    });
    const { token } = (await sessionRes.json()) as { token: string };
    const res = await fetch(`${base}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, input: { kind: "not-a-real-kind" } }),
    });
    assert.equal(res.status, 400);
  });
});

test("POST /input rejects an oversized body (32KB bound)", async () => {
  await withServer(makeDeps(), async (base) => {
    const oversized = "x".repeat(BODY_LIMIT + 1024);
    const res = await fetch(`${base}/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "whatever", input: { kind: "abandon" }, padding: oversized }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /too large/);
  });
});

test("GET /skus lists the injected catalog and provider availability", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/skus`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { skus: Sku[]; providers: { id: string; configured: boolean }[] };
    assert.equal(body.skus.length, 1);
    assert.equal(body.skus[0]?.id, "prisms-small");
    assert.ok(body.providers.some((p) => p.id === "mock" && p.configured));
  });
});

test("POST /pay clears via the mock provider and grants the SKU through the scene", async () => {
  const deps = makeDeps();
  await withServer(deps, async (base) => {
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Cy" }),
    });
    const { token, account } = (await sessionRes.json()) as { token: string; account: string };

    const payRes = await fetch(`${base}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, skuId: "prisms-small" }),
    });
    assert.equal(payRes.status, 200);
    const payBody = (await payRes.json()) as { cleared: boolean; orderId: string };
    assert.equal(payBody.cleared, true);

    assert.equal(deps.scene.grants.length, 1);
    assert.equal(deps.scene.grants[0]?.account, account);
    assert.equal(deps.scene.grants[0]?.sku.id, "prisms-small");
  });
});

test("POST /pay with an unknown SKU is rejected", async () => {
  await withServer(makeDeps(), async (base) => {
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Dee" }),
    });
    const { token } = (await sessionRes.json()) as { token: string };
    const res = await fetch(`${base}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, skuId: "does-not-exist" }),
    });
    assert.equal(res.status, 400);
  });
});

test("GET /audit returns the ledger's hledger journal as plain text", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/audit`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/plain/);
    const text = await res.text();
    assert.match(text, /assets:cash:mock/);
  });
});

test("GET /stream requires a valid session and then streams the current + pushed frames", async () => {
  await withServer(makeDeps(), async (base) => {
    const sessionRes = await fetch(`${base}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Eve" }),
    });
    const { token } = (await sessionRes.json()) as { token: string };

    const unauthorized = await fetch(`${base}/stream`);
    assert.equal(unauthorized.status, 401);

    const streamRes = await fetch(`${base}/stream?token=${token}`);
    assert.equal(streamRes.status, 200);
    assert.match(streamRes.headers.get("content-type") ?? "", /text\/event-stream/);
    assert.ok(streamRes.body !== null);
    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    // Read until we see the initial "state" frame the handler writes synchronously on connect.
    while (!text.includes("event: state")) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    assert.match(text, /event: state/);
    await reader.cancel();
  });
});

test("unknown route returns 404", async () => {
  await withServer(makeDeps(), async (base) => {
    const res = await fetch(`${base}/not-a-real-route`);
    assert.equal(res.status, 404);
  });
});
