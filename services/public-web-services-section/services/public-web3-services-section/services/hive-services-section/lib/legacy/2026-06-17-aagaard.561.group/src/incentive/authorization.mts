// incentive/authorization — decide which incentive responses may auto-execute
// vs which MUST go to the human gate (#26).
//
// This is the safety spine of the incentive subsystem. The rule is conservative
// and composes with the capability gating:
//
//   • Posting classes (comment, post) can NEVER auto-execute. Posting is in
//     LOCKED_CAPABILITIES; an incentive that requires writing something only ever
//     becomes a human-reviewed draft. No allow-list can override this.
//   • Non-posting classes (vote, reblog, follow, delegate) may auto-execute ONLY
//     when ALL hold: the class is in the account's opt-in `incentiveAuto`
//     allow-list (default empty), the governing capability lane is enabled, the
//     account is eligible, and the fleet is armed (live). Otherwise → nominate.
//   • Any scam-flagged offer (already dropped upstream) never reaches here.
//
// Output: `auto` (every required action is authorized and safe to run now) or
// `nominate` (route to the arbitration gate for a human disposition).

import { isLocked } from "../config.mts";
import type { AccountPolicy } from "../config.mts";
import type { ActionKind } from "./offers.mts";
import type { ScoredOffer } from "./valuation.mts";

/** Action classes that require the (locked) posting capability — never auto. */
const POSTING_CLASSES: ReadonlySet<ActionKind> = new Set<ActionKind>(["comment", "post"]);

export type Disposition = "auto" | "nominate";

export interface AuthorizationContext {
  readonly policy: AccountPolicy;
  /** Whether the fleet is armed (broadcasts permitted). */
  readonly live: boolean;
  /** Whether a given capability lane is currently enabled. */
  readonly isEnabled: (capability: "voting" | "trading") => boolean;
}

export interface AuthorizedOffer {
  readonly scored: ScoredOffer;
  readonly disposition: Disposition;
  /** Why it was routed as it was, for the audit log and the gate UI. */
  readonly rationale: string;
}

/** The capability lane that governs an action class (voting governs vote/reblog/
 *  follow as social ops; delegate is a stake op gated under trading). */
function governingLane(kind: ActionKind): "voting" | "trading" | "posting" {
  if (kind === "comment" || kind === "post") return "posting";
  if (kind === "delegate") return "trading";
  return "voting";
}

/** Authorize one scored offer in context. */
export function authorizeOffer(scored: ScoredOffer, ctx: AuthorizationContext): AuthorizedOffer {
  const actions = scored.offer.requiredActions;

  // Any posting-class action forces nomination, unconditionally.
  if (actions.some((a) => POSTING_CLASSES.has(a.kind))) {
    return Object.freeze({ scored, disposition: "nominate", rationale: "requires posting (locked) — human draft only" });
  }
  // Positive EV is required even to bother nominating? No — let the human see
  // marginal ones; but only auto-run clearly positive EV.
  const allow = new Set(ctx.policy.incentiveAuto);
  const everyActionAuto = actions.length > 0 && actions.every((a) => {
    if (allow.has(a.kind) === false) return false;
    const lane = governingLane(a.kind);
    if (lane === "posting") return false; // unreachable (caught above), belt-and-braces
    if (isLocked(lane)) return false;
    return ctx.isEnabled(lane);
  });

  if (everyActionAuto && ctx.live && scored.ev > 0) {
    return Object.freeze({ scored, disposition: "auto", rationale: "all actions in allow-list, lanes enabled, armed, EV>0" });
  }
  const why = !ctx.live ? "fleet not armed" : scored.ev <= 0 ? "non-positive EV" : "action not in account allow-list";
  return Object.freeze({ scored, disposition: "nominate", rationale: why });
}

/** Authorize a ranked batch. */
export function authorizeOffers(scored: readonly ScoredOffer[], ctx: AuthorizationContext): readonly AuthorizedOffer[] {
  return Object.freeze(scored.map((s) => authorizeOffer(s, ctx)));
}
