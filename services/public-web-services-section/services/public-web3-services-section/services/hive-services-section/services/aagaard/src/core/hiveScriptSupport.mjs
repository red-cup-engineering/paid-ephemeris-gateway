import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

import { PrivateKey } from "../integrations/hive/waggle/keys.mjs";

/**
 * Builds a `fail(message)` that throws an Error prefixed with the calling
 * script's own name, matching the per-script `fail` each observe/execute
 * script previously hand-rolled.
 *
 * @param {string} label - the script's own name, e.g. "unstake-token".
 * @returns {(message: string) => never}
 */
export function makeFail(label) {
  return function fail(message) { throw new Error(`${label}: ${message}`); };
}

/**
 * Calls a JSON-RPC 2.0 node, retrying up to three times with linear
 * backoff, and returns `result`. Throws via the caller's `fail` (or a
 * plain Error, if none is supplied) on a non-2xx status, an RPC error
 * body, or an exhausted retry budget.
 *
 * @param {string} node - RPC endpoint URL.
 * @param {string} method - JSON-RPC method name.
 * @param {unknown} params - JSON-RPC params.
 * @param {{ timeoutMs?: number, backoffMs?: number, fail?: (message: string) => never }} [options]
 * @returns {Promise<unknown>}
 */
export async function rpc(node, method, params, options = {}) {
  const { timeoutMs = 8_000, backoffMs = 350, fail = (message) => { throw new Error(message); } } = options;
  let residue = "unavailable";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(node, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(timeoutMs) });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { residue = "non-JSON gateway response"; continue; }
      if (response.ok && !body?.error) return body?.result;
      residue = `HTTP ${response.status} or RPC error`;
    } catch (error) { residue = error instanceof Error ? error.message : String(error); }
    if (attempt < 2) await new Promise((resolvePromise) => setTimeout(resolvePromise, backoffMs * (attempt + 1)));
  }
  return fail(`${node} ${method} failed: ${residue}`);
}

/**
 * Runs `broadcasterUrl` as a child process, feeding it `request` as JSON on
 * stdin and resolving with its parsed JSON stdout. Rejects on a nonzero
 * exit or non-JSON stdout.
 *
 * @param {unknown} request
 * @param {URL} broadcasterUrl
 * @returns {Promise<unknown>}
 */
export function broadcastViaChildProcess(request, broadcasterUrl) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [broadcasterUrl.pathname], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      if (code !== 0) rejectPromise(new Error(stderr.trim() || `broadcaster exited ${code}`));
      else { try { resolvePromise(JSON.parse(stdout)); } catch { rejectPromise(new Error("broadcaster returned invalid JSON")); } }
    });
    child.stdin.end(JSON.stringify(request));
  });
}

/**
 * Independently verifies that the active key at `keyFile` satisfies
 * `account`'s on-chain active authority threshold, via `rpc`'s
 * `condenser_api.get_accounts`. Throws via `fail` on a wide key-file
 * mode, or a key that does not independently satisfy the authority.
 *
 * @param {string} account
 * @param {string} keyFile
 * @param {{ rpc: typeof rpc, hiveNode: string, fail: (message: string) => never }} deps
 * @returns {Promise<void>}
 */
export async function verifyActiveKey(account, keyFile, { rpc: rpcFn, hiveNode, fail }) {
  const mode = statSync(keyFile).mode & 0o777;
  if ((mode & 0o077) !== 0) fail("active-key file must not be group/world accessible");
  const publicKey = PrivateKey.from(readFileSync(keyFile, "utf8").trim()).createPublic("STM").toString();
  const rows = await rpcFn(hiveNode, "condenser_api.get_accounts", [[account]]);
  const authority = rows?.[0]?.active;
  const threshold = Number(authority?.weight_threshold ?? 1);
  const weight = Number((authority?.key_auths ?? []).find(([candidate]) => candidate === publicKey)?.[1] ?? 0);
  if (weight < threshold) fail("the supplied key does not independently satisfy the account's active authority");
}

/**
 * Parses the common `--account --key-file [--execute-one]` observe/execute
 * CLI shape shared by the single-token recovery/claim scripts.
 *
 * @param {readonly string[]} argv
 * @param {(message: string) => never} fail
 * @returns {Readonly<{ account: string, keyFile: string, executeOne: boolean }>}
 */
export function parseAccountKeyFileExecuteOneOptions(argv, fail) {
  const options = { account: "", keyFile: "", executeOne: false };
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
    else if (argument === "--execute-one") options.executeOne = true;
    else fail(`unknown argument ${argument}`);
  }
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical Hive --account is required");
  if (options.executeOne && !options.keyFile) fail("--execute-one requires --key-file");
  return Object.freeze(options);
}
