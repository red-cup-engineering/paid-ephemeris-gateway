/**
 * keystore — the local, on-disk store of Hive private keys. ONE directory per
 * Hive account, under `~/.config/blockchain/hive/<account>/`. This is the
 * security-critical module: it owns the secrets.
 *
 * Per role (role ∈ owner | active | posting | memo) there are TWO possible
 * forms, and a role is held in AT MOST ONE of them:
 *   - `<role>.wif`      plaintext, chmod 0600  (hot/cold-acceptable, e.g. posting)
 *   - `<role>.wif.enc`  encrypted envelope     (cold, e.g. active, owner)
 * Loading a role tries `<role>.wif` first, then `<role>.wif.enc` (which needs
 * a passphrase). We refuse to ever leave both forms of a role on disk — that
 * would be an ambiguous, footgun-shaped state.
 *
 * Every wif is validated through hive-codecs PrivateKey.from before it is
 * written, so a typo never lands in the store. Secrets are never logged or
 * returned except as the explicit return value of loadKey.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, chmodSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { PrivateKey } from "@emsenn/computing-with-hive/codecs";
import { encryptSecret, decryptSecret } from "./crypto.mjs";

export type KeystoreRole = "owner" | "active" | "posting" | "memo";
export const KEYSTORE_ROLES: readonly KeystoreRole[] = ["owner", "active", "posting", "memo"];

/** Default key-store root: `~/.config/blockchain/hive`. */
export function defaultKeystoreRoot(): string {
  return path.join(os.homedir(), ".config/blockchain/hive");
}

/** The directory holding one account's role files. */
export function keystoreDir(account: string, root: string = defaultKeystoreRoot()): string {
  return path.join(root, account);
}

function plaintextPath(account: string, role: KeystoreRole, root: string): string {
  return path.join(keystoreDir(account, root), `${role}.wif`);
}

function encryptedPath(account: string, role: KeystoreRole, root: string): string {
  return path.join(keystoreDir(account, root), `${role}.wif.enc`);
}

function validateWif(wif: string): void {
  try {
    PrivateKey.from(wif);
  } catch (error) {
    throw new TypeError(`waggle: invalid WIF (${error instanceof Error ? error.message : String(error)})`);
  }
}

export interface SetKeyOptions {
  readonly encrypt?: boolean | undefined;
  readonly passphrase?: string | undefined;
  readonly root?: string | undefined;
}

/**
 * Store a wif for `account`/`role`. Writes `<role>.wif` (0600) by default, or
 * `<role>.wif.enc` (the wrapped envelope) when `encrypt` is set — which then
 * requires `passphrase`. Validates the wif first (throws TypeError on a bad
 * wif). Refuses to write if the OTHER form of this role already exists, so a
 * role is never simultaneously plaintext and encrypted.
 */
export function setKey(account: string, role: KeystoreRole, wif: string, opts: SetKeyOptions = {}): void {
  const root = opts.root ?? defaultKeystoreRoot();
  validateWif(wif);
  const plain = plaintextPath(account, role, root);
  const enc = encryptedPath(account, role, root);

  if (opts.encrypt) {
    if (!opts.passphrase) throw new TypeError("waggle: setKey with encrypt requires a passphrase");
    if (existsSync(plain)) throw new Error(`waggle: ${role}.wif (plaintext) already exists; remove it before storing encrypted`);
    mkdirSync(keystoreDir(account, root), { recursive: true, mode: 0o700 });
    writeFileSync(enc, encryptSecret(wif, opts.passphrase), { mode: 0o600 });
    chmodSync(enc, 0o600);
    return;
  }

  if (existsSync(enc)) throw new Error(`waggle: ${role}.wif.enc (encrypted) already exists; remove it before storing plaintext`);
  mkdirSync(keystoreDir(account, root), { recursive: true, mode: 0o700 });
  writeFileSync(plain, `${wif}\n`, { mode: 0o600 });
  chmodSync(plain, 0o600);
}

export interface LoadKeyOptions {
  readonly passphrase?: string | undefined;
  readonly root?: string | undefined;
}

/**
 * Load the wif for `account`/`role`. Reads `<role>.wif` (plaintext) if it
 * exists; otherwise reads `<role>.wif.enc` and decrypts it (which requires a
 * passphrase — throws a clear error if the encrypted form is present but no
 * passphrase was given). Does NOT cache the plaintext to disk. Throws if the
 * role is absent.
 */
export function loadKey(account: string, role: KeystoreRole, opts: LoadKeyOptions = {}): string {
  const root = opts.root ?? defaultKeystoreRoot();
  const plain = plaintextPath(account, role, root);
  if (existsSync(plain)) {
    return readFileSync(plain, "utf8").trim();
  }
  const enc = encryptedPath(account, role, root);
  if (existsSync(enc)) {
    if (!opts.passphrase) throw new Error(`waggle: ${role} key for @${account} is encrypted; a passphrase is required`);
    return decryptSecret(readFileSync(enc, "utf8"), opts.passphrase);
  }
  throw new Error(`waggle: no ${role} key for @${account} in the key store`);
}

export type KeyForm = "plaintext" | "encrypted";

export interface KeyListing {
  readonly role: KeystoreRole;
  readonly form: KeyForm;
}

/** List the roles present for an account and the form each is held in. */
export function listKeys(account: string, root: string = defaultKeystoreRoot()): KeyListing[] {
  const dir = keystoreDir(account, root);
  if (!existsSync(dir)) return [];
  const files = new Set(readdirSync(dir));
  const out: KeyListing[] = [];
  for (const role of KEYSTORE_ROLES) {
    if (files.has(`${role}.wif`)) out.push({ role, form: "plaintext" });
    else if (files.has(`${role}.wif.enc`)) out.push({ role, form: "encrypted" });
  }
  return out;
}

export type RoleStatus = "absent" | "plaintext" | "encrypted";

/** For each of the four roles, report whether it is absent, plaintext, or encrypted. */
export function roleStatus(account: string, root: string = defaultKeystoreRoot()): Record<KeystoreRole, RoleStatus> {
  const dir = keystoreDir(account, root);
  const files = existsSync(dir) ? new Set(readdirSync(dir)) : new Set<string>();
  const status = {} as Record<KeystoreRole, RoleStatus>;
  for (const role of KEYSTORE_ROLES) {
    if (files.has(`${role}.wif`)) status[role] = "plaintext";
    else if (files.has(`${role}.wif.enc`)) status[role] = "encrypted";
    else status[role] = "absent";
  }
  return status;
}
