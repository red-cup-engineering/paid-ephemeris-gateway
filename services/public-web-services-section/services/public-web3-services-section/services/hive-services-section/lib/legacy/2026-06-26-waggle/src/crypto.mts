/**
 * crypto — at-rest encryption for wrapped key-store secrets.
 *
 * Why this is NOT "rolling your own crypto": every primitive here is a
 * standard, vetted construction from the Node platform (node:crypto). We do
 * not invent a cipher or a KDF; we compose two well-understood, peer-reviewed
 * primitives in the textbook KDF-then-AEAD order:
 *
 *   1. scrypt (RFC 7914) stretches the passphrase into a 256-bit key, with a
 *      per-secret random salt and memory-hard parameters (N=2^15, r=8, p=1).
 *   2. AES-256-GCM (NIST SP 800-38D) encrypts-and-authenticates the plaintext
 *      under that key with a per-secret random 96-bit IV; the 128-bit GCM tag
 *      detects tampering and wrong-passphrase derivations.
 *
 * Threat model (be honest about what this buys): at-rest encryption protects
 * the COLD copy of a secret — a disk stolen off a powered-down machine, a
 * backup tarball, a `.enc` file accidentally committed to git. It does NOT
 * protect a live, already-compromised session: once the passphrase is typed
 * and the wif is decrypted into process memory, an attacker with code
 * execution sees the plaintext. So grade roles by heat: the posting key is
 * hot (used constantly) and may live in plaintext; the active and owner keys
 * are cold/rare and should be encrypted.
 */
import {
  scryptSync, randomBytes, createCipheriv, createDecipheriv,
} from "node:crypto";

/** scrypt cost parameters. CPU/memory-hard; ~tens of ms, ~32 MiB working set. */
const N = 2 ** 15; // 32768
const R = 8;
const P = 1;
const KEY_LEN = 32; // 256-bit AES key
const SALT_LEN = 16;
const IV_LEN = 12; // GCM standard nonce length
const MAXMEM = 128 * 1024 * 1024;

interface Envelope {
  readonly v: 1;
  readonly kdf: "scrypt";
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly salt: string; // base64
  readonly iv: string; // base64
  readonly tag: string; // base64
  readonly ct: string; // base64
}

function deriveKey(passphrase: string, salt: Buffer, n: number, r: number, p: number): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, { N: n, r, p, maxmem: MAXMEM });
}

/**
 * Encrypt a UTF-8 plaintext secret under a passphrase, returning the JSON
 * envelope (one line) that becomes the `.enc` file's contents.
 */
export function encryptSecret(plaintext: string, passphrase: string): string {
  if (passphrase.length === 0) throw new TypeError("waggle: empty passphrase");
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt, N, R, P);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: Envelope = {
    v: 1,
    kdf: "scrypt",
    N,
    r: R,
    p: P,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
  return JSON.stringify(envelope);
}

/**
 * Decrypt a JSON envelope under a passphrase, returning the UTF-8 plaintext.
 * Throws a clear error on a wrong passphrase or corrupt file (the GCM tag
 * check fails identically in both cases — it is an authentication failure).
 */
export function decryptSecret(envelope: string, passphrase: string): string {
  let env: Envelope;
  try {
    env = JSON.parse(envelope) as Envelope;
  } catch {
    throw new Error("waggle: corrupt key file (not a valid envelope)");
  }
  if (env.v !== 1 || env.kdf !== "scrypt") {
    throw new Error(`waggle: unsupported key envelope (v=${String(env.v)}, kdf=${String(env.kdf)})`);
  }
  const salt = Buffer.from(env.salt, "base64");
  const iv = Buffer.from(env.iv, "base64");
  const tag = Buffer.from(env.tag, "base64");
  const ct = Buffer.from(env.ct, "base64");
  const key = deriveKey(passphrase, salt, env.N, env.r, env.p);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("waggle: wrong passphrase or corrupt key file");
  }
}

/**
 * Round-trip self-test on synthetic data: encrypt→decrypt recovers the
 * plaintext, and a wrong passphrase throws. Touches no disk, no real secret.
 */
export function cryptoSelfTest(): void {
  const secret = "5JtestWIFvalueForSelfTestOnly0000000000000000000000";
  const env = encryptSecret(secret, "correct horse battery staple");
  const back = decryptSecret(env, "correct horse battery staple");
  if (back !== secret) throw new Error("waggle: crypto self-test round-trip failed");
  let threw = false;
  try {
    decryptSecret(env, "wrong passphrase");
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("waggle: crypto self-test wrong-passphrase did not throw");
}
