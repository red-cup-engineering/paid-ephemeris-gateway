/**
 * `accounts` — guest play and the federation migration into a durable account.
 *
 * The brief: "both — folk can play local until they choose to log in, via sharding and
 * federation." Concretely, every visitor is a real actor from their first tick:
 *   - a **guest** is keyed by an opaque token the client mints and keeps in localStorage, so a
 *     guest's progress persists server-side and survives reloads without any account;
 *   - **logging in** with a handle (and secret) creates a durable account actor, and the guest's
 *     whole fiber is **migrated** into it — exported as an entity packet and re-told under the
 *     account id. That is the FizzOS federation move ("a player walks from one shard to another
 *     by their entity being sent as a message"), realized here as guest→account.
 *
 * Auth is deliberately light but real: an account stores a salted secret hash; first login sets
 * it, later logins must match. Guests need no secret. (Stripe/Hive are for payment, not identity.)
 */
import { createHash } from "node:crypto";
import type { DelveScene } from "./scene.mts";

const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A guest actor id from the client's opaque key. */
export function guestActorId(key: string): string {
  const s = slug(key).slice(0, 48);
  return `guest-${s === "" ? "anon" : s}`;
}

/** A durable account actor id from a chosen handle. */
export function accountActorId(handle: string): string {
  const s = slug(handle).slice(0, 48);
  return `delver-${s === "" ? "anon" : s}`;
}

export const isGuest = (actor: string): boolean => actor.startsWith("guest-");

/** Salted secret hash (sha256 over handle:secret). Defense-in-depth for a game login. */
export function hashSecret(handle: string, secret: string): string {
  return createHash("sha256").update(`flickering:${handle}:${secret}`).digest("hex");
}

export interface LoginRequest { readonly name: string; readonly secret?: string | undefined; readonly guest?: boolean | undefined; }

export class AuthError extends Error {}

export class Accounts {
  private readonly scene: DelveScene;

  constructor(scene: DelveScene) {
    this.scene = scene;
  }

  /**
   * Resolve a login to an actor id, enforcing account secrets. Guests are admitted freely.
   * For accounts: first login sets the secret; subsequent logins must match, else `AuthError`.
   * Returns the actor id to use as the session.
   */
  authenticate(req: LoginRequest): string {
    if (req.guest === true || req.name.startsWith("guest-")) {
      return guestActorId(req.name.replace(/^guest-/, ""));
    }
    const actor = accountActorId(req.name);
    const stored = this.scene.secretHashOf(actor);
    const secret = req.secret ?? "";
    if (secret === "") throw new AuthError("an account needs a secret word");
    const hash = hashSecret(req.name, secret);
    if (stored === null) {
      this.scene.setSecretHash(actor, hash);
      return actor;
    }
    if (stored !== hash) throw new AuthError("that secret word does not match");
    return actor;
  }

  /**
   * Migrate a guest's progress into an account, once. Returns true if it migrated. Refuses to
   * clobber an account that already has progress (so a logged-in player's account is never
   * overwritten by a throwaway guest); in that case the account simply keeps its own state.
   */
  migrateGuest(guestActor: string, accountActor: string): boolean {
    if (!isGuest(guestActor) || guestActor === accountActor) return false;
    if (!this.scene.has(guestActor)) return false;
    if (this.scene.hasProgress(accountActor)) return false;
    const packet = this.scene.exportActor(guestActor);
    this.scene.importActor(packet, accountActor);
    return true;
  }
}
