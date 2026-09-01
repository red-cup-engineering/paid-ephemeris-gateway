// posting — PREPARED BUT LOCKED. Content composition with the broadcast door
// bolted shut pending human review.
//
// The platform must be *ready* to post (compose drafts, attach tags and
// beneficiaries, target the right parent for replies) without being *able* to
// post autonomously. So this lane builds a complete, signable draft and stops:
// `composeDraft` produces the exact `comment` payload the upstream client would
// broadcast, and `executePost` REFUSES — `posting` is a locked capability
// (config.LOCKED_CAPABILITIES), enable-able only by a human editing source after
// reviewing the lane. There is no runtime flag that arms it. The draft is the
// deliverable; the broadcast is a human decision.
//
// (The actual broadcast, once a human unlocks it, is the upstream
// `HiveComputer.post` / `.reply` — this lane would only hand it the draft.)

import { isLocked } from "./config.mts";
import type { FleetMember } from "./fleet.mts";

export interface PostDraft {
  readonly account: string;
  readonly kind: "post" | "reply";
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  /** For replies: the parent being answered. */
  readonly parent?: { readonly author: string; readonly permlink: string };
  /** Always false here — the lane is locked. A human review flips it in source. */
  readonly approvedForBroadcast: false;
}

/**
 * Compose a draft top-level post for an account. The content is a deterministic
 * operations summary (no LLM call, no network) — a placeholder shape proving the
 * lane is wired; a reviewer swaps in the real content source before unlocking.
 */
export function composeDraft(member: FleetMember, summary: string): PostDraft {
  return Object.freeze({
    account: member.account,
    kind: "post" as const,
    title: `${member.account} — operations note`,
    body: summary,
    tags: Object.freeze(["hive", "automation"]),
    approvedForBroadcast: false as const,
  });
}

/** Compose a draft reply to a specific post. */
export function composeReplyDraft(
  member: FleetMember,
  parent: { readonly author: string; readonly permlink: string },
  body: string,
): PostDraft {
  return Object.freeze({
    account: member.account,
    kind: "reply" as const,
    title: "",
    body,
    tags: Object.freeze([]),
    parent: Object.freeze({ ...parent }),
    approvedForBroadcast: false as const,
  });
}

export class PostingLockedError extends Error {
  constructor() {
    super("posting is a locked capability: prepared but disabled pending human review — unlock in source");
    this.name = "PostingLockedError";
  }
}

/**
 * The broadcast boundary — permanently closed while posting is locked. There is
 * no `armed` parameter: the lock is not a runtime gate but a standing refusal.
 * Calling this always throws, by design, so no code path can autonomously post.
 */
export function executePost(_member: FleetMember, _draft: PostDraft): never {
  // Defensive: the orchestrator never enables a locked capability, but if a
  // future caller tries, the lane itself refuses.
  if (isLocked("posting")) throw new PostingLockedError();
  throw new PostingLockedError();
}
