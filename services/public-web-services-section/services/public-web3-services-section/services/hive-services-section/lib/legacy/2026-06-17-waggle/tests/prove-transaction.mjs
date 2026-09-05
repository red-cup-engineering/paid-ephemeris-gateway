// prove-transaction — end-to-end proofs over the integration layer: the chain_id-prefixed signing
// digest matches the spec vector, signatures are canonical and recover to the signer, the op
// builders emit the right shapes, and a full build→sign→broadcast round-trips through Waggle over a
// mocked transport (no network). See docs/dev/notes/01 §4 and 02 §8.
import { run, isMain } from "./_harness.mjs";
import { transactionDigest, signTransaction, transactionId, CHAIN_ID } from "../lib/transaction.mjs";
import { PrivateKey } from "../lib/keys.mjs";
import { getPublicKey, recover } from "../lib/secp256k1.mjs";
import * as ops from "../lib/ops.mjs";
import { Waggle } from "../lib/client.mjs";

// dhive test keypair (openhive-network/dhive test/crypto.ts mainPair) — a throwaway key.
const WIF = "5K2yDAd9KAZ3ZitBsAPyRka9PLFemUrbcL6UziZiPaw2c6jCeLH";
const PUB = "STM8QykigLRi9ZUcNy1iXGY3KjRuCiLM8Ga49LHti1F8hgawKFc3K";

// The spec §8 worked transfer.
const transferTx = {
  ref_block_num: 1234,
  ref_block_prefix: 5678,
  expiration: 1718000000,
  operations: [["transfer", { from: "alice", to: "bob", amount: "1.000 HIVE", memo: "hi" }]],
  extensions: [],
};

// --- offline Waggle broadcast round-trip ---
async function broadcastRoundTrip() {
  let sentTx = null;
  const transport = async (url, envelope) => {
    let result;
    if (envelope.method === "condenser_api.get_dynamic_global_properties") {
      result = {
        head_block_number: 0x057b8d48, // & 0xffff = 0x8D48 = 36168
        head_block_id: "057b8d4844556677000000000000000000000000",
        time: "2026-06-04T12:00:00",
      };
    } else if (envelope.method === "condenser_api.broadcast_transaction") {
      sentTx = envelope.params[0];
      result = {};
    } else {
      throw new Error(`unexpected method ${envelope.method}`);
    }
    return { status: 200, body: JSON.stringify({ jsonrpc: "2.0", id: envelope.id, result }) };
  };

  const hive = new Waggle({ transport, account: "alice", keys: { posting: WIF }, nodes: ["mock://node"] });
  const out = await hive.vote({ author: "bob", permlink: "a-post", weight: 10000 });
  return { sentTx, out };
}

const rt = await broadcastRoundTrip();

const suite = (check) => {
  // digest vector
  const digestHex = transactionDigest(transferTx).toString("hex");
  check(
    "transfer signing digest matches spec vector",
    digestHex === "bdc7e9497a1adb149ccd20892fac6245a6e8b23d677a1e2a581fd217c61039f1",
  );

  // WIF -> public key (cross-impl vector)
  const priv = PrivateKey.from(WIF);
  check("WIF derives the expected STM public key", priv.createPublic().toString() === PUB);

  // sign the digest: 65 bytes, header in 31..34, recovers to signer
  const digest = transactionDigest(transferTx);
  const sig = priv.sign(digest);
  check("signature is 65 bytes", Buffer.isBuffer(sig) && sig.length === 65);
  check("signature header byte in 31..34", sig[0] >= 31 && sig[0] <= 34);
  const recovered = recover(digest, sig.subarray(1), sig[0] - 31);
  check("signature recovers to the signer's public key", recovered.equals(getPublicKey(priv.secret)));

  // canonical: high bits of R and S clear (on the 64-byte R||S body)
  const body = sig.subarray(1);
  check("R high bit clear (canonical)", (body[0] & 0x80) === 0);
  check("S high bit clear (canonical)", (body[32] & 0x80) === 0);

  // signTransaction appends one hex signature of 130 chars
  const signed = signTransaction(transferTx, [priv]);
  check("signTransaction appends one signature", Array.isArray(signed.signatures) && signed.signatures.length === 1);
  check("signature hex is 130 chars", signed.signatures[0].length === 130);

  // transactionId is 40 hex chars
  check("transactionId is 40 hex chars", /^[0-9a-f]{40}$/.test(transactionId(transferTx)));

  // op builders
  const [vName, vPay] = ops.vote({ voter: "a", author: "b", permlink: "p", weight: 5000 });
  check("vote op shape", vName === "vote" && vPay.voter === "a" && vPay.weight === 5000);

  const [fName, fPay] = ops.follow("alice", "bob");
  check("follow is custom_json id 'follow'", fName === "custom_json" && fPay.id === "follow");
  check("follow posting auth is the follower", JSON.stringify(fPay.required_posting_auths) === JSON.stringify(["alice"]));
  check("follow json encodes the relationship", fPay.json === JSON.stringify(["follow", { follower: "alice", following: "bob", what: ["blog"] }]));

  const [, rPay] = ops.reblog("alice", "bob", "a-post");
  check("reblog json shape", rPay.json === JSON.stringify(["reblog", { account: "alice", author: "bob", permlink: "a-post" }]));

  check("slugify lowercases and hyphenates", ops.slugify("Hello, World!") === "hello-world");

  // offline Waggle broadcast round-trip
  check("broadcast returns a 40-hex tx id", /^[0-9a-f]{40}$/.test(rt.out.id));
  check("broadcast sent a tx with one signature", rt.sentTx && rt.sentTx.signatures.length === 1);
  check("broadcast derived ref_block_num from head block", rt.sentTx.ref_block_num === 0x8d48);
  check("broadcast set expiration = chain time + 60s", rt.sentTx.expiration === "2026-06-04T12:01:00");
  check("broadcast carried the vote op", rt.sentTx.operations[0][0] === "vote" && rt.sentTx.operations[0][1].voter === "alice");
};

export default suite;
if (isMain(import.meta.url)) run([suite]);
