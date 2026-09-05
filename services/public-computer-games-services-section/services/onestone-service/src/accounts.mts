/**
 * `accounts` — token-identity: the guest half of flickering-delve-service's account model,
 * ported alone.
 *
 * That sibling models two identity tiers — an opaque client-held token that resolves
 * deterministically to a "guest" actor, and a handle+secret "account" tier a guest can migrate
 * progress into. DESIGN.md's v1 scope line is explicit that only the first tier ships here:
 * "accounts beyond token identity" (durable named accounts, secret gating, guest migration) is
 * roadmap. So this module ports exactly `guestActorId`'s half of the sibling — a client mints
 * an opaque key (kept in localStorage) and hands it to `Scene.login`; the same key always
 * resolves to the same account, so progress persists across reloads on one device with no
 * password to manage or lose — and adds the one piece the sibling located in its `server.mts`
 * instead (bearer session tokens): `Scene.login(name): { token, account }` needs somewhere to
 * mint and check per-connection bearer tokens, and identity is this module's concern, so the
 * mapping lives here rather than duplicated wherever `Scene` is implemented.
 *
 * Security properties kept from the sibling: the account id is derived through the same
 * sanitizing `slug` (so a hostile client-held key can never inject `:`/`/`/control characters
 * into a ledger or filesystem path built from it downstream); bearer tokens are minted with
 * `node:crypto`'s CSPRNG at 256 bits, not `Math.random` or a counter, so a session token cannot
 * be guessed or enumerated.
 */
import { randomBytes } from "node:crypto";

const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * A durable account id from a client-held opaque key (or any display name) — the same key
 * always resolves to the same account id, which is the whole of "token identity": no secret,
 * no server-side registry to consult, just a pure deterministic function of the key.
 */
export function tokenActorId(key: string): string {
  const s = slug(key).slice(0, 48);
  return `tess-${s === "" ? "anon" : s}`;
}

/** A live login session: the bearer `token` the client presents on every later request. */
export interface Session {
  readonly token: string;
  readonly account: string;
}

/**
 * Accounts — mints and checks bearer session tokens over the token-identity model above.
 *
 * One process-lifetime registry (not persisted: a lost session token just means the client
 * logs in again with the same key and gets the same `account` back, since `tokenActorId` is
 * deterministic — no progress is lost, only the current connection's bearer credential).
 */
export class Accounts {
  private readonly sessions = new Map<string, string>();

  /** Log in with a client-held key: resolves the deterministic account, mints a fresh bearer token. */
  login(name: string): Session {
    const account = tokenActorId(name);
    const token = randomBytes(32).toString("hex");
    this.sessions.set(token, account);
    return { token, account };
  }

  /** Resolve a bearer token to its account, or `undefined` for an unknown/revoked session. */
  resolve(token: string): string | undefined {
    return this.sessions.get(token);
  }

  /** End a session (logout, or a server-side idle sweep). */
  revoke(token: string): void {
    this.sessions.delete(token);
  }

  /** Live session count (server `/healthz` metrics). */
  get sessionCount(): number {
    return this.sessions.size;
  }
}
