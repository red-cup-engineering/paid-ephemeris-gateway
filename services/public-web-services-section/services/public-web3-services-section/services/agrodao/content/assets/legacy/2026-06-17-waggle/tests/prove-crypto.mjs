// prove-crypto — proofs for the waggle cryptography core (01-crypto-signing-spec). Covers base58
// round-trips, sha256/ripemd160 known-answer vectors, the WIF -> public-key -> WIF path against a
// known dhive vector, and sign/verify/recover/determinism/canonicality of the ECDSA signer.
import { run, isMain } from "./_harness.mjs";
import crypto from "node:crypto";
import { encode, decode } from "../lib/base58.mjs";
import { sha256, sha256d, ripemd160, hmacSha256 } from "../lib/hash.mjs";
import { sign, verify, recover, getPublicKey } from "../lib/secp256k1.mjs";
import { PrivateKey, PublicKey } from "../lib/keys.mjs";

// Known (WIF, STM public) vector lifted verbatim from dhive test/crypto.ts `mainPair`
// (openhive-network/dhive). This is a real reference vector, so the WIF -> pubkey path below
// is a genuine cross-implementation check, not merely an internal round-trip.
const WIF = "5K2yDAd9KAZ3ZitBsAPyRka9PLFemUrbcL6UziZiPaw2c6jCeLH";
const STM_PUB = "STM8QykigLRi9ZUcNy1iXGY3KjRuCiLM8Ga49LHti1F8hgawKFc3K";

// Force the hand-rolled pure-JS RIPEMD-160 path by hiding node:crypto's ripemd160 from getHashes(),
// re-importing hash.mjs (cache-busted) so its native-availability probe sees it as absent. Done at
// module load (top-level await) so the result is a plain string the sync suite can assert on. This
// proves the fallback (the load-bearing hand-rolled hash) matches known answers regardless of
// whether the host OpenSSL ships legacy RIPEMD-160.
const FALLBACK_RIPEMD_ABC = await (async () => {
  const orig = crypto.getHashes;
  crypto.getHashes = () => orig.call(crypto).filter((h) => h !== "ripemd160");
  try {
    const m = await import(`../lib/hash.mjs?forcefallback=${Date.now()}`);
    return m.ripemd160(Buffer.from("abc")).toString("hex");
  } finally {
    crypto.getHashes = orig;
  }
})();

const suite = (check) => {
  // --- base58 round-trips ---
  const knownBytes = Buffer.from("00010966776006953d5567439e5e39f86a0d273beed61967f6", "hex"); // BTC addr example
  check("base58 round-trips a known byte buffer", decode(encode(knownBytes)).equals(knownBytes));

  let allRandomOk = true;
  for (let i = 0; i < 50; i++) {
    const len = 1 + (crypto.randomBytes(1)[0] % 40);
    const rnd = crypto.randomBytes(len);
    if (!decode(encode(rnd)).equals(rnd)) { allRandomOk = false; break; }
  }
  check("base58 round-trips 50 random buffers", allRandomOk);

  // leading-zero handling (§1.2): leading 0x00 bytes survive as '1' chars and back.
  const leadingZeros = Buffer.from([0, 0, 0, 5, 6, 7]);
  check("base58 preserves leading zero bytes", decode(encode(leadingZeros)).equals(leadingZeros));
  check("base58 encodes leading zeros as '1' chars", encode(leadingZeros).startsWith("111"));

  // --- sha256 / sha256d known answers ---
  check(
    'sha256("abc") known answer',
    sha256(Buffer.from("abc")).toString("hex") ===
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  check(
    'sha256d("abc") = sha256(sha256("abc"))',
    sha256d(Buffer.from("abc")).equals(sha256(sha256(Buffer.from("abc")))),
  );

  // --- ripemd160 known answers (RIPEMD-160 reference test vectors) ---
  check(
    'ripemd160("") known answer',
    ripemd160(Buffer.from("")).toString("hex") === "9c1185a5c5e9fc54612808977ee8f548b2258d31",
  );
  check(
    'ripemd160("abc") known answer',
    ripemd160(Buffer.from("abc")).toString("hex") === "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
  );
  check(
    'ripemd160("message digest") known answer',
    ripemd160(Buffer.from("message digest")).toString("hex") ===
      "5d0689ef49d2fae572b881b123a85ffa21595f36",
  );

  check(
    'hand-rolled fallback ripemd160("abc") matches known answer',
    FALLBACK_RIPEMD_ABC === "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc",
  );

  // --- hmac-sha256 sanity (RFC 4231 test case 1) ---
  check(
    "hmacSha256 RFC4231 case 1",
    hmacSha256(Buffer.alloc(20, 0x0b), Buffer.from("Hi There")).toString("hex") ===
      "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
  );

  // --- WIF -> public key -> WIF, against the known dhive vector ---
  const priv = PrivateKey.from(WIF);
  check("WIF decode round-trips back to the same WIF", priv.toString() === WIF);
  check("WIF secret is 32 bytes", Buffer.isBuffer(priv.secret) && priv.secret.length === 32);
  const pub = priv.createPublic("STM");
  check("derived public key matches known STM vector", pub.toString() === STM_PUB);
  check("PublicKey.from re-decodes the STM string", PublicKey.from(STM_PUB).toString() === STM_PUB);
  check(
    "PublicKey.from rejects a corrupted checksum",
    (() => {
      try {
        PublicKey.from(STM_PUB.slice(0, -1) + (STM_PUB.endsWith("K") ? "J" : "K"));
        return false;
      } catch {
        return true;
      }
    })(),
  );

  // --- signing: canonical, header byte, verify, recover, determinism ---
  const secret = sha256(Buffer.from("waggle proof secret"));
  const myPub = getPublicKey(secret);
  const digest = sha256(Buffer.from("a transaction digest to sign"));

  const { signature, recovery } = sign(digest, secret);
  check("signature body is 64 bytes (R||S)", signature.length === 64);
  check("recovery id in 0..3", recovery >= 0 && recovery <= 3);

  // graphene canonical test on the 64-byte R||S body (§5.3).
  const isCanonical =
    !(signature[0] & 0x80) &&
    !(signature[0] === 0 && !(signature[1] & 0x80)) &&
    !(signature[32] & 0x80) &&
    !(signature[32] === 0 && !(signature[33] & 0x80));
  check("signature passes the graphene canonical test", isCanonical);

  check("verify accepts the signature", verify(digest, signature, myPub));
  check(
    "verify rejects a tampered digest",
    !verify(sha256(Buffer.from("different digest")), signature, myPub),
  );
  check("recover(digest, sig, recovery) equals getPublicKey(secret)", recover(digest, signature, recovery).equals(myPub));

  // 65-byte compact via PrivateKey.sign (§5.2): header = recovery + 31, then R32, then S32.
  const compact = new PrivateKey(secret).sign(digest);
  check("compact signature is 65 bytes", compact.length === 65);
  check("compact header byte in 31..34", compact[0] >= 31 && compact[0] <= 34);
  check("compact header = recovery + 31", compact[0] === recovery + 31);
  check("compact body equals the 64-byte R||S", compact.subarray(1).equals(signature));
  check(
    "recover from compact header/body equals derived pubkey",
    recover(digest, compact.subarray(1), compact[0] - 31).equals(myPub),
  );

  // RFC6979 determinism: same (digest, secret) -> identical signature & recovery.
  const again = sign(digest, secret);
  check("sign is deterministic for fixed (digest, secret)", again.signature.equals(signature) && again.recovery === recovery);
};

export default suite;
if (isMain(import.meta.url)) run([suite]);
