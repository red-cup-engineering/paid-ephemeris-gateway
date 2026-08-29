#!/usr/bin/env node
// Authenticates to the official Splinterlands API and websocket, then exits.
// It has no battle, market, transfer, reward, or custom_json submission path.

import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrivateKey } from "../src/integrations/hive/waggle/keys.mjs";
import { sha256 } from "../src/integrations/hive/waggle/hash.mjs";

const API = "https://api.splinterlands.com";
const SOCKET = "wss://ws2.splinterlands.com";
const HIVE_RPC = "https://api.hive.blog";

function fail(message) { throw new Error(`splinterlands-session-probe: ${message}`); }

export function parseOptions(argv) {
  const options = { account: "", keyFile: "", timeoutSeconds: 8 };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const take = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`${argument} requires a value`);
      index += 1;
      return value;
    };
    if (argument === "--account") options.account = take().toLowerCase();
    else if (argument === "--key-file") options.keyFile = take();
    else if (argument === "--timeout-sec") options.timeoutSeconds = Number(take());
    else fail(`unknown argument ${argument}`);
  }
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical Hive --account is required");
  if (!options.keyFile) fail("--key-file is required");
  if (!Number.isSafeInteger(options.timeoutSeconds) || options.timeoutSeconds < 5 || options.timeoutSeconds > 20) fail("--timeout-sec must be an integer from 5 through 20");
  return Object.freeze(options);
}

export function loginMessage(account, timestampMs) {
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account)) fail("invalid login account");
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 1) fail("invalid login timestamp");
  return `${account}${timestampMs}`;
}

async function loadVerifiedPostingKey(account, keyFile) {
  const mode = statSync(keyFile).mode & 0o777;
  if ((mode & 0o077) !== 0) fail("posting-key file must not be group/world accessible");
  const key = PrivateKey.from(readFileSync(keyFile, "utf8").trim());
  const publicKey = key.createPublic("STM").toString();
  const response = await fetch(HIVE_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "condenser_api.get_accounts", params: [[account]] }),
    signal: AbortSignal.timeout(8000),
  });
  const row = (await response.json())?.result?.[0];
  if (!response.ok || !row) fail("Hive posting-authority verification failed");
  const threshold = Number(row.posting?.weight_threshold ?? 1);
  const weight = Number((row.posting?.key_auths ?? []).find(([candidate]) => candidate === publicKey)?.[1] ?? 0);
  if (weight < threshold) fail("the supplied key does not independently satisfy the account's posting authority");
  return key;
}

async function login(account, key) {
  const timestamp = Date.now();
  const signature = key.sign(sha256(Buffer.from(loginMessage(account, timestamp), "utf8"))).toString("hex");
  const browserId = randomBytes(16).toString("hex");
  const sessionId = randomBytes(5).toString("hex");
  const url = new URL(`${API}/players/v2/login`);
  for (const [name, value] of Object.entries({ name: account, ts: String(timestamp), sig: signature, browser_id: browserId, session_id: sessionId })) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  const body = await response.json();
  if (!response.ok || body?.error || body?.name !== account || typeof body?.token !== "string" || body.token.length === 0 || typeof body?.jwt_token !== "string" || body.jwt_token.length === 0) fail(body?.error ?? "official login did not return the expected account tokens");
  return Object.freeze({ token: body.token, jwtToken: body.jwt_token, sessionId, jwtExpiration: body.jwt_expiration_dt ?? null });
}

export async function authenticate(options) {
  const key = await loadVerifiedPostingKey(options.account, options.keyFile);
  return login(options.account, key);
}

async function probeSocket(account, token, sessionId, timeoutSeconds) {
  if (typeof globalThis.WebSocket !== "function") fail("this Node runtime does not provide WebSocket");
  const statuses = [];
  const socket = new WebSocket(SOCKET);
  await new Promise((resolvePromise, rejectPromise) => {
    let complete = false;
    const finish = (error) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      if (socket.readyState === WebSocket.OPEN) socket.close();
      if (error) rejectPromise(error); else resolvePromise();
    };
    const timer = setTimeout(() => finish(new Error("official websocket did not authenticate before the bounded timeout")), timeoutSeconds * 1000);
    socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "auth", player: account, access_token: token, session_id: sessionId })));
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { finish(new Error("official websocket returned invalid JSON")); return; }
      if (typeof message?.status === "string") statuses.push(message.status);
      if (message?.error) { finish(new Error("official websocket refused authentication")); return; }
      if (statuses.includes("connected") && statuses.includes("authenticated")) finish();
    });
    socket.addEventListener("error", () => finish(new Error("official websocket connection failed")));
  });
  return Object.freeze([...statuses]);
}

export async function probe(options) {
  const auth = await authenticate(options);
  const statuses = await probeSocket(options.account, auth.token, auth.sessionId, options.timeoutSeconds);
  return Object.freeze({
    kind: "aagaard.splinterlands-session-probe",
    account: options.account,
    authenticated: statuses.includes("authenticated"),
    statuses,
    jwtExpiration: auth.jwtExpiration,
    queueSubmitted: false,
    customJsonSubmitted: false,
    completedAt: new Date().toISOString(),
  });
}

async function main() { process.stdout.write(`${JSON.stringify(await probe(parseOptions(process.argv.slice(2))))}\n`); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
}
