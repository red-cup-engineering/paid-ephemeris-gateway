/**
 * `server` — native HTTP/SSE transport, ported from flickering-delve-service's server.mts.
 *
 * Two things differ from the sibling's shape on purpose:
 *
 * 1. **Dependency injection instead of top-level construction.** The sibling file builds its
 *    scene/ledger/payments at module load and starts listening immediately — fine for a lone
 *    service, but onestone's twelve sibling modules (`scene.mts`, `payments.mts`, `ledger.mts`,
 *    `economy.mts`, `client.mts`, ...) are being built by other agents in parallel and may not
 *    exist yet. `createServer(deps)` takes every collaborator as a small structural interface
 *    (`SceneLike`, `PaymentsLike`, `LedgerLike`) defined from the DESIGN.md contracts, so this
 *    file — and its tests — never need those modules to exist to be exercised. The concrete
 *    wiring (real `createScene`, real `Payments`, real `CLIENT_HTML`, ...) happens once, via
 *    `import()`, inside `main()`, which only runs when this file is the process entrypoint.
 * 2. **`import type` for the wire shapes.** `types.mts` is the one sibling module guaranteed
 *    to exist and be stable, so `ClientFrame`/`ClientInput`/`Sku` are imported for real — but
 *    as `import type`, which `node --experimental-strip-types`-style erasure (this repo's
 *    `erasableSyntaxOnly` + native .mts execution) deletes entirely at load time, so even a
 *    module that *did* go missing here couldn't break `node --check`/`node --test`.
 *
 * Route inventory mirrors DESIGN.md's src/server.mts contract 1:1: GET / (client HTML), POST
 * /session, GET /stream (SSE), POST /input (bounded body, per-account FIFO), GET /skus, POST
 * /pay, POST /webhook/stripe, GET /audit (hledger text), GET /healthz.
 */
import process from "node:process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import type { BoosterKind, ClientFrame, ClientInput, Sku } from "./types.mts";
import type { LedgerEntry } from "./ledger.mts";

export const DEFAULT_PORT = 18_796;
/** Per DESIGN.md: POST /input bodies are bounded to 32KB. Applied to all JSON-body routes. */
export const BODY_LIMIT = 32 * 1024;
/** Stripe webhook payloads run larger than a game input but must still be bounded upstream. */
export const WEBHOOK_BODY_LIMIT = 64 * 1024;
/** Max concurrent GET /stream (SSE) connections held open for one account at a time — an
 * unauthenticated caller must not be able to exhaust file descriptors/heartbeat timers by
 * opening unbounded long-lived responses over one session. */
export const MAX_STREAMS_PER_ACCOUNT = 4;
/** POST /session rate limit: new sessions allowed per remote address per window. Guards
 * against a caller scripting unbounded distinct account creation (each one permanently grows
 * the in-memory/persisted account map) — see server test coverage for the exact shape. */
export const SESSION_RATE_LIMIT = 20;
export const SESSION_RATE_WINDOW_MS = 60_000;

export const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store",
} as const;

// ── structural collaborator contracts ──────────────────────────────────────────────
// Kept local (not imported as values) so this file compiles and runs standalone against
// mocks. Shapes are read directly off DESIGN.md's module contracts for scene/payments/ledger.

export interface SceneLike {
  login(name: string): { token: string; account: string };
  frame(account: string): ClientFrame;
  input(account: string, input: ClientInput): ClientFrame;
  subscribe(account: string, fn: (frame: ClientFrame) => void): () => void;
  /** The settle-side hook payments calls into once an order clears, to grant the SKU. */
  grantSku(account: string, sku: Sku): void;
  snapshot(): unknown;
  persist(): Promise<void>;
}

/** What a cleared order resolves to: the order (carrying `.account`) plus the SKU it paid for. */
export interface ClearedPurchase {
  readonly order: { readonly account: string };
  readonly sku: Sku;
}

export interface PaymentIntentResult {
  readonly provider: string;
  readonly orderId: string;
  readonly instructions: Record<string, unknown>;
}

export interface PaymentsLike {
  available(): ReadonlyArray<{ id: string; configured: boolean }>;
  intent(account: string, skuId: string, provider?: string): Promise<PaymentIntentResult>;
  settle(orderId: string, evidence?: unknown): Promise<ClearedPurchase | null>;
  settleStripeWebhook(payload: string, signature: string): Promise<ClearedPurchase | null>;
}

export interface AuditReportLike {
  readonly journal: string;
}

export interface LedgerLike {
  audit(): AuditReportLike;
}

export interface ServerDeps {
  readonly scene: SceneLike;
  readonly payments: PaymentsLike;
  readonly ledger: LedgerLike;
  readonly skus: readonly Sku[];
  readonly clientHtml: string;
  readonly now?: () => number;
}

// ── small pure helpers (unit-testable without any network) ────────────────────────

export function configuredPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env["ONESTONE_PORT"] ?? env["PORT"];
  if (raw === undefined) return DEFAULT_PORT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65_535) throw new Error(`bad port ${raw}`);
  return n;
}

const BOOSTER_KINDS: ReadonlySet<BoosterKind> = new Set(["hammer", "shuffle", "extraMoves", "prismStart"]);

/** Structural check, not a full type validation — scene owns semantic legality of the move. */
export function isClientInput(value: unknown): value is ClientInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  switch (v["kind"]) {
    case "start":
      return typeof v["levelId"] === "number";
    case "swap":
      return typeof v["a"] === "number" && typeof v["b"] === "number";
    case "booster":
      return (
        typeof v["booster"] === "string" &&
        BOOSTER_KINDS.has(v["booster"] as BoosterKind) &&
        (v["cell"] === undefined || typeof v["cell"] === "number")
      );
    case "buy":
      return (
        typeof v["booster"] === "string" &&
        BOOSTER_KINDS.has(v["booster"] as BoosterKind) &&
        (v["count"] === undefined || typeof v["count"] === "number") &&
        (v["currency"] === undefined || v["currency"] === "shards" || v["currency"] === "prisms")
      );
    case "abandon":
      return true;
    default:
      return false;
  }
}

async function readBoundedBody(req: IncomingMessage, limit: number): Promise<string> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk as string;
    if (Buffer.byteLength(raw) > limit) throw new RangeError("request body too large");
  }
  return raw;
}

async function jsonBody(req: IncomingMessage, limit: number): Promise<unknown> {
  const raw = await readBoundedBody(req, limit);
  return raw === "" ? {} : JSON.parse(raw);
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { ...SECURITY_HEADERS, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function bearerToken(req: IncomingMessage): string | undefined {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  return value === "" ? undefined : value;
}

function sseWrite(res: ServerResponse, event: string, value: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
}

/**
 * Chains an operation after whatever is currently pending for `key`, regardless of whether the
 * prior operation succeeded — this is the per-account FIFO for POST /input: two concurrent
 * requests for the same account must apply to the (synchronous) scene in arrival order, not in
 * whichever order their bounded-body reads happen to resolve.
 */
function makeFifo(): <T>(key: string, task: () => T) => Promise<T> {
  const chains = new Map<string, Promise<void>>();
  return function enqueue<T>(key: string, task: () => T): Promise<T> {
    const prior = chains.get(key) ?? Promise.resolve();
    const settledPrior = prior.then(
      () => undefined,
      () => undefined,
    );
    const result = settledPrior.then(task);
    chains.set(
      key,
      result.then(
        () => undefined,
        () => undefined,
      ),
    );
    return result;
  };
}

// ── the factory ─────────────────────────────────────────────────────────────────────

/** Builds the HTTP server. Does not listen — callers `.listen(...)`, tests included. */
export function createServer(deps: ServerDeps): Server {
  const now = deps.now ?? Date.now;
  const sessions = new Map<string, string>(); // token -> account
  const enqueueInput = makeFifo();
  const streamCounts = new Map<string, number>(); // account -> live SSE connection count
  const sessionAttempts = new Map<string, { count: number; windowStart: number }>(); // remote addr -> rate window

  function accountFor(req: IncomingMessage, supplied?: unknown): string | undefined {
    const token = bearerToken(req) ?? (typeof supplied === "string" ? supplied : undefined);
    return token === undefined ? undefined : sessions.get(token);
  }

  /** Fixed-window rate limit for POST /session, keyed by remote address. Returns true when the
   * caller is within budget (and records the attempt); false when the window is exhausted. */
  function allowSessionAttempt(addr: string): boolean {
    const t = now();
    const entry = sessionAttempts.get(addr);
    if (entry === undefined || t - entry.windowStart >= SESSION_RATE_WINDOW_MS) {
      sessionAttempts.set(addr, { count: 1, windowStart: t });
      return true;
    }
    if (entry.count >= SESSION_RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  return createHttpServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const path = url.pathname;

      if (req.method === "GET" && (path === "/" || path === "/index.html")) {
        res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8" });
        res.end(deps.clientHtml);
        return;
      }

      if (req.method === "GET" && path === "/healthz") {
        json(res, 200, { status: "ok", now: now() });
        return;
      }

      if (req.method === "GET" && path === "/skus") {
        json(res, 200, { skus: deps.skus, providers: deps.payments.available() });
        return;
      }

      if (req.method === "GET" && path === "/audit") {
        const report = deps.ledger.audit();
        res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" });
        res.end(report.journal);
        return;
      }

      if (req.method === "GET" && path === "/stream") {
        const account = accountFor(req, url.searchParams.get("token"));
        if (account === undefined) {
          json(res, 401, { error: "not logged in" });
          return;
        }
        const live = streamCounts.get(account) ?? 0;
        if (live >= MAX_STREAMS_PER_ACCOUNT) {
          json(res, 429, { error: "too many open streams for this account" });
          return;
        }
        streamCounts.set(account, live + 1);
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "content-type": "text/event-stream; charset=utf-8",
        });
        res.write(": connected\n\n");
        sseWrite(res, "state", deps.scene.frame(account));
        const unsubscribe = deps.scene.subscribe(account, (frame) => sseWrite(res, "state", frame));
        const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 20_000);
        heartbeat.unref();
        req.once("close", () => {
          clearInterval(heartbeat);
          unsubscribe();
          const n = (streamCounts.get(account) ?? 1) - 1;
          if (n <= 0) streamCounts.delete(account);
          else streamCounts.set(account, n);
        });
        return;
      }

      if (req.method === "POST" && path === "/session") {
        const remoteAddr = req.socket.remoteAddress ?? "unknown";
        if (!allowSessionAttempt(remoteAddr)) {
          json(res, 429, { error: "too many session attempts, try again later" });
          return;
        }
        const value = (await jsonBody(req, BODY_LIMIT)) as { name?: unknown };
        if (typeof value.name !== "string" || value.name.trim() === "") {
          json(res, 400, { error: "missing name" });
          return;
        }
        try {
          const { token, account } = deps.scene.login(value.name);
          sessions.set(token, account);
          json(res, 200, { token, account });
        } catch (error) {
          json(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }

      if (req.method === "POST" && path === "/input") {
        const value = (await jsonBody(req, BODY_LIMIT)) as { token?: unknown; input?: unknown };
        const account = accountFor(req, value.token);
        if (account === undefined) {
          json(res, 401, { error: "not logged in" });
          return;
        }
        if (!isClientInput(value.input)) {
          json(res, 400, { error: "malformed input" });
          return;
        }
        const input = value.input;
        const frame = await enqueueInput(account, () => deps.scene.input(account, input));
        json(res, 200, frame);
        return;
      }

      if (req.method === "POST" && path === "/pay") {
        const value = (await jsonBody(req, BODY_LIMIT)) as { token?: unknown; skuId?: unknown; provider?: unknown };
        const account = accountFor(req, value.token);
        if (account === undefined) {
          json(res, 401, { error: "not logged in" });
          return;
        }
        if (typeof value.skuId !== "string") {
          json(res, 400, { error: "missing skuId" });
          return;
        }
        try {
          const provider = typeof value.provider === "string" ? value.provider : undefined;
          const intentResult = await deps.payments.intent(account, value.skuId, provider);
          // Providers that clear synchronously (mock) settle immediately; stripe/hive settle later
          // via /webhook/stripe or a polled confirm — settle() returning null here is normal for those.
          const grant = await deps.payments.settle(intentResult.orderId);
          if (grant !== null) deps.scene.grantSku(grant.order.account, grant.sku);
          json(res, 200, { ...intentResult, cleared: grant !== null });
        } catch (error) {
          json(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
        return;
      }

      if (req.method === "POST" && path === "/webhook/stripe") {
        const payload = await readBoundedBody(req, WEBHOOK_BODY_LIMIT);
        const signature = String(req.headers["stripe-signature"] ?? "");
        const grant = await deps.payments.settleStripeWebhook(payload, signature);
        if (grant !== null) deps.scene.grantSku(grant.order.account, grant.sku);
        json(res, 200, { received: true });
        return;
      }

      json(res, 404, { error: "not found" });
    } catch (error) {
      const status = error instanceof SyntaxError || error instanceof RangeError ? 400 : 500;
      json(res, status, { error: status === 400 ? (error instanceof Error ? error.message : String(error)) : "internal error" });
      if (status === 500) process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    }
  }
}

// ── atomic JSON persistence for the ledger (scene.mts owns its own per its contract) ─────────

export async function loadJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export async function saveJsonFileAtomic(path: string, value: unknown): Promise<void> {
  const dir = dirname(path);
  if (dir !== "" && dir !== ".") await mkdir(dir, { recursive: true });
  const tmp = `${path}.tmp-${randomUUID()}`;
  await writeFile(tmp, JSON.stringify(value), "utf8");
  await rename(tmp, path);
}

// ── process entrypoint (never runs on import — only when this file IS the process) ───────────

function isMain(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

async function main(): Promise<void> {
  const host = process.env["HOST"] ?? "127.0.0.1";
  const savePath = process.env["ONESTONE_SAVE"];
  const ledgerPath = process.env["ONESTONE_LEDGER"];

  // Concrete sibling modules, resolved only here so this file's own tests never need them built.
  const [{ createScene }, { AuditLedger }, { Payments }, { SKUS }, { CLIENT_HTML }] = await Promise.all([
    import("./scene.mts"),
    import("./ledger.mts"),
    import("./payments.mts"),
    import("./economy.mts"),
    import("./client.mts"),
  ]);

  const scene = createScene({ savePath });
  const initialLedger = ledgerPath === undefined ? [] : await loadJsonFile<readonly LedgerEntry[]>(ledgerPath, []);
  const ledger = new AuditLedger(initialLedger);
  const payments = new Payments(ledger, {
    stripeSecretKey: process.env["STRIPE_SECRET_KEY"],
    stripeWebhookSecret: process.env["STRIPE_WEBHOOK_SECRET"],
    hiveAccount: process.env["HIVE_ACCOUNT"],
    hiveNodes: process.env["HIVE_NODES"]?.split(",").map((s) => s.trim()).filter(Boolean),
  });

  const server = createServer({ scene, payments, ledger, skus: SKUS, clientHtml: CLIENT_HTML });

  async function persistAll(): Promise<void> {
    await Promise.all([
      scene.persist(),
      ledgerPath === undefined ? Promise.resolve() : saveJsonFileAtomic(ledgerPath, ledger.all()),
    ]);
  }

  const persistenceTimer = setInterval(() => {
    void persistAll().catch((error) => process.stderr.write(`checkpoint failed: ${String(error)}\n`));
  }, 30_000);
  persistenceTimer.unref();

  let closing = false;
  async function close(): Promise<void> {
    if (closing) return;
    closing = true;
    clearInterval(persistenceTimer);
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await persistAll();
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void close().then(
        () => process.exit(0),
        (error) => {
          process.stderr.write(`shutdown failed: ${String(error)}\n`);
          process.exit(1);
        },
      );
    });
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(configuredPort(), host, resolve);
  });
  const address = server.address();
  const boundPort = typeof address === "object" && address !== null ? address.port : configuredPort();
  const shown = host === "0.0.0.0" ? "127.0.0.1" : host;
  process.stdout.write(`onestone: the lattice is open on http://${shown}:${boundPort}/${savePath ? ` (saving to ${savePath})` : ""}\n`);
}

if (isMain()) {
  await main();
}
