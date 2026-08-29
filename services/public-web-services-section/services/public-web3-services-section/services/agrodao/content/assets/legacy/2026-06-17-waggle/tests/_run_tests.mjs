// _run_tests — the package test runner. Aggregates every prove-*.mjs suite (each also runnable
// standalone via `node tests/prove-foo.mjs`). The proofs drive the four layers: crypto (keys /
// secp256k1 / base58 / hashes), serialization (graphene binary), rpc/reads (offline transport),
// and the integration (digest / sign / broadcast end-to-end).
import { run } from "./_harness.mjs";
import proveCrypto from "./prove-crypto.mjs";
import proveSerialize from "./prove-serialize.mjs";
import proveRpc from "./prove-rpc.mjs";
import proveTransaction from "./prove-transaction.mjs";

run([proveCrypto, proveSerialize, proveRpc, proveTransaction]);
