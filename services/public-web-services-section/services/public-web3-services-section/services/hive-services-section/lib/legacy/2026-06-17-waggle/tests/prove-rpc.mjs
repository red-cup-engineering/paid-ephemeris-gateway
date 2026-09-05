// prove-rpc — offline proof of the JSON-RPC transport + read layer (spec docs/dev/notes/03-rpc-read-spec.md).
// Fully offline: every RpcClient is built with an injected `transport`, so no real network calls.
// Async assertions are computed BEFORE run() (which calls suites synchronously) via top-level await.

import { run, isMain } from "./_harness.mjs";
import { RpcClient, DEFAULT_NODES } from "../lib/rpc.mjs";
import { deriveReferenceBlock, getAccounts, getRankedPosts } from "../lib/chain.mjs";

// --- precompute async results (top-level await is allowed in .mjs) ---

// head_block_id whose first 4 bytes encode the block number big-endian (05 7b 8d 48) and
// bytes 4..7 = 44 55 66 77 (spec §4.1 worked example).
//
// SPEC TYPO: spec §4.1 writes "head_block_number = 0x057B8D48 = 91983048", but 0x057B8D48 is
// actually 91983176 (and 91983048 = 0x057B8CC8). The spec's other two stated facts are
// self-consistent: ref_block_num = 0x8D48 = 36168 and the hex prefix is 057b8d48. So the
// load-bearing number is 0x057B8D48; we use it here so & 0xffff === 0x8D48 === 36168 holds.
const HEAD_NUM = 0x057b8d48; // = 91983176; spec's decimal "91983048" is a typo
const HEAD_ID = "057b8d4844556677000000000000000000000000"; // 20-byte block id, padded
const ref = deriveReferenceBlock(HEAD_NUM, HEAD_ID);

// A recording transport: captures the last request body, returns a fixed valid result.
function recordingTransport(record) {
  return async (url, bodyObject) => {
    record.url = url;
    record.body = bodyObject;
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: bodyObject.id, result: [] }) };
  };
}

// Envelope correctness — getAccounts.
const accRec = {};
const accClient = new RpcClient({ nodes: ["https://node-a"], transport: recordingTransport(accRec) });
await getAccounts(accClient, ["alice"]);

// Envelope correctness — getRankedPosts.
const rankRec = {};
const rankClient = new RpcClient({ nodes: ["https://node-a"], transport: recordingTransport(rankRec) });
await getRankedPosts(rankClient, { sort: "trending" });

// Failover — first node URL throws/500s, second returns a valid result.
const failoverAttempts = [];
const failoverNodes = ["https://node-1", "https://node-2"];
const failoverClient = new RpcClient({
  nodes: failoverNodes,
  transport: async (url, bodyObject) => {
    failoverAttempts.push(url);
    if (url === "https://node-1") throw new Error("network down");
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: bodyObject.id, result: { ok: true } }) };
  },
});
const failoverResult = await failoverClient.call("condenser_api.get_dynamic_global_properties", []);

// Failover via non-2xx then 200 result (exercise the HTTP-status branch).
const statusClient = new RpcClient({
  nodes: ["https://n1", "https://n2"],
  transport: async (url, bodyObject) =>
    url === "https://n1"
      ? { status: 500, body: "boom" }
      : { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: bodyObject.id, result: 42 }) },
});
const statusResult = await statusClient.call("x.y", []);

// Failover via JSON-RPC error object then 200 result (exercise the error-object branch).
const rpcErrClient = new RpcClient({
  nodes: ["https://e1", "https://e2"],
  transport: async (url, bodyObject) =>
    url === "https://e1"
      ? { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: bodyObject.id, error: { code: -32000, message: "behind" } }) }
      : { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: bodyObject.id, result: "recovered" }) },
});
const rpcErrResult = await rpcErrClient.call("x.y", []);

// All-fail — transport errors on every node; call must reject.
const allFailClient = new RpcClient({
  nodes: ["https://x1", "https://x2", "https://x3"],
  transport: async () => {
    throw new Error("always fails");
  },
});
let allFailThrew = false;
try {
  await allFailClient.call("x.y", []);
} catch {
  allFailThrew = true;
}

// --- suite (synchronous checks over precomputed values) ---

const suite = (check) => {
  // deriveReferenceBlock worked example (spec §4.1).
  check("deriveReferenceBlock ref_block_num === (0x057b8d48 & 0xffff) === 0x8D48 === 36168", ref.ref_block_num === (0x057b8d48 & 0xffff) && ref.ref_block_num === 0x8d48 && ref.ref_block_num === 36168);
  check("deriveReferenceBlock ref_block_prefix === 0x77665544 === 2003195204", ref.ref_block_prefix === 0x77665544 && ref.ref_block_prefix === 2003195204);

  // Envelope correctness — condenser positional, double-bracket.
  check("getAccounts method === condenser_api.get_accounts", accRec.body.method === "condenser_api.get_accounts");
  check("getAccounts params === [[\"alice\"]] (positional, double-bracket)", Array.isArray(accRec.body.params) && Array.isArray(accRec.body.params[0]) && accRec.body.params[0][0] === "alice" && accRec.body.params[0].length === 1);
  check("envelope has jsonrpc 2.0 and numeric id", accRec.body.jsonrpc === "2.0" && typeof accRec.body.id === "number");

  // Envelope correctness — bridge named object.
  check("getRankedPosts method === bridge.get_ranked_posts", rankRec.body.method === "bridge.get_ranked_posts");
  check("getRankedPosts params is OBJECT with sort:trending", rankRec.body.params && !Array.isArray(rankRec.body.params) && typeof rankRec.body.params === "object" && rankRec.body.params.sort === "trending");

  // Failover on network failure.
  check("failover returns result from second node", failoverResult && failoverResult.ok === true);
  check("failover attempted two node URLs", failoverAttempts.length === 2 && failoverAttempts[0] === "https://node-1" && failoverAttempts[1] === "https://node-2");

  // Failover on non-2xx and on JSON-RPC error object.
  check("failover on non-2xx returns next node result", statusResult === 42);
  check("failover on JSON-RPC error object returns next node result", rpcErrResult === "recovered");

  // All-fail rejects.
  check("all nodes failing → call throws", allFailThrew === true);

  // DEFAULT_NODES sanity (spec §3 — ~8 curated nodes).
  check("DEFAULT_NODES has 8 https base URLs", Array.isArray(DEFAULT_NODES) && DEFAULT_NODES.length === 8 && DEFAULT_NODES.every((u) => u.startsWith("https://")));
};

export default suite;
if (isMain(import.meta.url)) run([suite]);
