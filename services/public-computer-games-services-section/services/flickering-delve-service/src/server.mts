/** Native HTTP/SSE transport for Flickering Delve's sole-writer scene. */
import process from "node:process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { loadJsonSnapshot, saveJsonSnapshot } from "@red-cup-engineering/feltos/persistence";
import { DelveScene, type DelveSnapshot, TICK_SECONDS } from "./scene.mts";
import { type DungeonConfig, DEFAULT_DUNGEON } from "./dungeon.mts";
import { type LedgerEntry, Ledger } from "./ledger.mts";
import { Payments, SKUS } from "./payments.mts";
import { Accounts, AuthError, guestActorId, isGuest } from "./accounts.mts";
import { CLIENT_HTML } from "./client.mts";

interface Intent { readonly actor: string; readonly line: string; }

const DEFAULT_PORT = 18_795;
const FLOOD_CAP = 8;
const BODY_LIMIT = 64 * 1024;
const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
} as const;

function configuredPort(): number {
  const raw = process.env["FLICKERING_PORT"] ?? process.env["PORT"];
  if (raw === undefined) return DEFAULT_PORT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65_535) throw new Error(`bad port ${raw}`);
  return n;
}

function loadConfig(): DungeonConfig {
  try {
    const raw = readFileSync(fileURLToPath(new URL("../world/dungeon.json", import.meta.url)), "utf8");
    return { ...DEFAULT_DUNGEON, ...(JSON.parse(raw) as Partial<DungeonConfig>) };
  } catch {
    return DEFAULT_DUNGEON;
  }
}

function admitFairly(intents: readonly Intent[], perActor: number): readonly Intent[] {
  const counts = new Map<string, number>();
  return intents.filter(({ actor }) => {
    const count = counts.get(actor) ?? 0;
    if (count >= perActor) return false;
    counts.set(actor, count + 1);
    return true;
  });
}

async function body(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > BODY_LIMIT) throw new RangeError("request body too large");
  }
  return raw === "" ? {} : JSON.parse(raw);
}

function json(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { ...SECURITY_HEADERS, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function bearer(req: IncomingMessage): string | undefined {
  const value = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  return value === "" ? undefined : value;
}

function sse(res: ServerResponse, event: string, value: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
}

const host = process.env["HOST"] ?? "127.0.0.1";
const savePath = process.env["FLICKERING_SAVE"];
const ledgerPath = process.env["FLICKERING_LEDGER"];
const restored = savePath === undefined
  ? null
  : await loadJsonSnapshot(savePath, { fallback: null }) as DelveSnapshot | null;
const scene = new DelveScene(loadConfig(), restored ?? undefined);
const restoredLedger = ledgerPath === undefined
  ? []
  : await loadJsonSnapshot(ledgerPath, { fallback: [] }) as LedgerEntry[];
const ledger = new Ledger(restoredLedger);
const payments = new Payments(ledger, {
  stripeSecretKey: process.env["STRIPE_SECRET_KEY"],
  stripeWebhookSecret: process.env["STRIPE_WEBHOOK_SECRET"],
  hiveAccount: process.env["HIVE_ACCOUNT"],
  hiveNodes: process.env["HIVE_NODES"]?.split(",").map((s) => s.trim()).filter(Boolean),
});
const accounts = new Accounts(scene);
const sessions = new Map<string, string>();
const streams = new Map<string, Set<ServerResponse>>();
let queued: Intent[] = [];
let tickN = 0;

function actorFor(req: IncomingMessage, supplied?: unknown): string | undefined {
  const token = bearer(req) ?? (typeof supplied === "string" ? supplied : undefined);
  return token === undefined ? undefined : sessions.get(token);
}

function broadcast(actor: string, event: string, value: unknown): void {
  for (const response of streams.get(actor) ?? []) sse(response, event, value);
}

function step(): void {
  const intents = admitFairly(queued, FLOOD_CAP);
  queued = [];
  const events = scene.runTick(intents);
  tickN++;
  for (const event of events) broadcast(event.to, "out", event.text);
  for (const actor of scene.activePlayers()) broadcast(actor, "state", scene.stateFrame(actor));
}

async function persist(): Promise<void> {
  await Promise.all([
    ...(savePath === undefined ? [] : [saveJsonSnapshot(savePath, scene.snapshot())]),
    ...(ledgerPath === undefined ? [] : [saveJsonSnapshot(ledgerPath, [...ledger.all()])]),
  ]);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const path = url.pathname;
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      res.writeHead(200, { ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8" });
      res.end(CLIENT_HTML);
      return;
    }
    if (req.method === "GET" && path === "/health") {
      json(res, 200, { status: "ok", tick: tickN, sessions: sessions.size, ...scene.metrics() }); return;
    }
    if (req.method === "GET" && path === "/store") {
      json(res, 200, { skus: SKUS, providers: payments.available() }); return;
    }
    if (req.method === "GET" && path === "/ledger") {
      json(res, 200, ledger.report()); return;
    }
    if (req.method === "GET" && path === "/stream") {
      const actor = actorFor(req, url.searchParams.get("token"));
      if (actor === undefined) { json(res, 401, { error: "not logged in" }); return; }
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
      });
      res.write(": connected\n\n");
      const actorStreams = streams.get(actor) ?? new Set<ServerResponse>();
      actorStreams.add(res);
      streams.set(actor, actorStreams);
      for (const event of scene.join(actor)) sse(res, "out", event.text);
      sse(res, "state", scene.stateFrame(actor));
      req.once("close", () => {
        actorStreams.delete(res);
        if (actorStreams.size === 0) streams.delete(actor);
      });
      return;
    }
    if (req.method === "POST" && path === "/session") {
      const value = await body(req) as { name?: unknown; secret?: unknown; guest?: unknown };
      if (typeof value.name !== "string") { json(res, 400, { error: "missing name" }); return; }
      try {
        const actor = accounts.authenticate({
          name: value.name,
          secret: typeof value.secret === "string" ? value.secret : undefined,
          guest: value.guest === true,
        });
        const token = randomUUID();
        sessions.set(token, actor);
        json(res, 200, { token, session: actor });
      } catch (error) {
        json(res, error instanceof AuthError ? 401 : 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    if (req.method === "POST" && path === "/input") {
      const value = await body(req) as { token?: unknown; line?: unknown };
      const actor = actorFor(req, value.token);
      if (actor === undefined) { json(res, 401, { error: "not logged in" }); return; }
      if (typeof value.line !== "string" || value.line.trim() === "") { json(res, 400, { error: "missing line" }); return; }
      queued.push({ actor, line: value.line });
      json(res, 202, { queued: true });
      return;
    }
    if (req.method === "POST" && path === "/pay/intent") {
      const actor = actorFor(req);
      const value = await body(req) as { sku?: unknown; provider?: unknown };
      if (actor === undefined) { json(res, 401, { error: "not logged in" }); return; }
      if (typeof value.sku !== "string") { json(res, 400, { error: "missing sku" }); return; }
      json(res, 200, await payments.intent(actor, value.sku, typeof value.provider === "string" ? value.provider : undefined));
      return;
    }
    if (req.method === "POST" && path === "/pay/settle") {
      const actor = actorFor(req);
      const value = await body(req) as { orderId?: unknown };
      if (actor === undefined) { json(res, 401, { error: "not logged in" }); return; }
      if (typeof value.orderId !== "string") { json(res, 400, { error: "missing orderId" }); return; }
      const grant = await payments.settle(value.orderId);
      if (grant !== null) scene.grantBoost(grant.actor, grant.kind, grant.value, grant.durationSeconds);
      json(res, 200, { cleared: grant !== null });
      return;
    }
    if (req.method === "POST" && path === "/pay/stripe/webhook") {
      let payload = "";
      for await (const chunk of req) payload += chunk;
      const grant = await payments.settleStripeWebhook(payload, String(req.headers["stripe-signature"] ?? ""));
      if (grant !== null) scene.grantBoost(grant.actor, grant.kind, grant.value, grant.durationSeconds);
      json(res, 200, { received: true });
      return;
    }
    if (req.method === "POST" && path === "/claim") {
      const actor = actorFor(req);
      const value = await body(req) as { guestKey?: unknown };
      if (actor === undefined || isGuest(actor)) { json(res, 401, { error: "log into an account first" }); return; }
      if (typeof value.guestKey !== "string") { json(res, 400, { error: "missing guestKey" }); return; }
      const migrated = accounts.migrateGuest(guestActorId(value.guestKey), actor);
      json(res, 200, { migrated, state: scene.stateFrame(actor) });
      return;
    }
    json(res, 404, { error: "not found" });
  } catch (error) {
    const status = error instanceof SyntaxError || error instanceof RangeError ? 400 : 500;
    json(res, status, { error: status === 400 ? error instanceof Error ? error.message : String(error) : "internal error" });
    if (status === 500) process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  }
});

const tickTimer = setInterval(step, Math.round(TICK_SECONDS * 1000));
tickTimer.unref();
const persistenceTimer = setInterval(() => {
  void persist().catch((error) => process.stderr.write(`checkpoint failed: ${String(error)}\n`));
}, 30_000);
persistenceTimer.unref();

let closing = false;
async function close(): Promise<void> {
  if (closing) return;
  closing = true;
  clearInterval(tickTimer);
  clearInterval(persistenceTimer);
  for (const responses of streams.values()) for (const response of responses) response.end();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await persist();
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void close().then(() => process.exit(0), (error) => {
    process.stderr.write(`shutdown failed: ${String(error)}\n`);
    process.exit(1);
  }));
}

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(configuredPort(), host, resolve);
});
const address = server.address();
const boundPort = typeof address === "object" && address !== null ? address.port : configuredPort();
const shown = host === "0.0.0.0" ? "127.0.0.1" : host;
process.stdout.write(`flickering: the Gnaw is open on http://${shown}:${boundPort}/ (tick ${Math.round(TICK_SECONDS * 1000)}ms${savePath ? `, saving to ${savePath}` : ""})\n`);
