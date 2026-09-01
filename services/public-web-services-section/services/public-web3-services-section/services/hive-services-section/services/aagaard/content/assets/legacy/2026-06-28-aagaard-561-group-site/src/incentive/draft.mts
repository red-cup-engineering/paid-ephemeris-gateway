// incentive/draft — compose a response to an incentive offer as a LOCKED draft
// (#28). When a human dispositions an offer `llm-draft`, the platform writes the
// required comment/post — but only as a draft in the locked posting store, never
// a broadcast. Posting is in LOCKED_CAPABILITIES; this composes content, it does
// not and cannot send it.
//
// The composer exposes a clean LLM seam: `composeIncentiveDraft` assembles the
// prompt from the offer + our analysis and, if an LLM generator is supplied,
// uses it; otherwise it falls back to an honest deterministic template. Either
// way the result is marked machine-generated and `approvedForBroadcast: false` —
// a reviewer reads it, edits if wanted, and only a human unlock in source can
// ever broadcast it.

import type { PostDraft } from "../posting.mts";
import type { IncentiveOffer } from "./offers.mts";

/** An LLM generator seam: prompt in, body out. Supplied by the host when an LLM
 *  endpoint is wired; absent, the deterministic template is used. */
export type DraftGenerator = (prompt: string) => Promise<string> | string;

export interface IncentiveDraft extends PostDraft {
  readonly offerId: string;
  /** True when produced by an LLM generator; false for the template fallback. */
  readonly machineGenerated: boolean;
  /** The prompt the generator was (or would be) given — kept for the reviewer. */
  readonly prompt: string;
}

/** Build the LLM prompt for an offer: what we're responding to and the house
 *  rules (genuine, on-topic, no engagement-farming, disclose nothing private). */
export function incentivePrompt(account: string, offer: IncentiveOffer): string {
  const actions = offer.requiredActions.map((a) => a.kind).join(", ");
  const reward = offer.reward ? `${offer.reward.amount ?? ""} ${offer.reward.token}`.trim() : "unspecified";
  return [
    `You are drafting a Hive ${offer.requiredActions.some((a) => a.kind === "post") ? "post" : "comment"} for the account @${account}.`,
    `It responds to an incentive by @${offer.source.author} (${offer.source.permlink}).`,
    `Required actions: ${actions}. Stated reward: ${reward}.`,
    `Announcement: "${offer.rawText}"`,
    `Write a genuine, specific, on-topic response that satisfies the ask without sounding like reward-farming.`,
    `Do not fabricate experiences, do not disclose keys or private data, do not over-promise. Keep it concise.`,
  ].join("\n");
}

function templateBody(account: string, offer: IncentiveOffer): string {
  // Honest placeholder: clearly a draft awaiting a human, not a fake-genuine
  // comment. A reviewer replaces this (or wires an LLM generator).
  return [
    `[DRAFT for @${account} — machine-prepared response to @${offer.source.author}'s incentive, pending human review]`,
    ``,
    `Re: ${offer.rawText}`,
    ``,
    `This is a prepared placeholder. Replace with a genuine on-topic response before any human approves broadcast.`,
  ].join("\n");
}

/** Compose the locked draft for an offer. Uses the LLM generator if supplied. */
export async function composeIncentiveDraft(
  account: string,
  offer: IncentiveOffer,
  generator?: DraftGenerator,
): Promise<IncentiveDraft> {
  const prompt = incentivePrompt(account, offer);
  const isPost = offer.requiredActions.some((a) => a.kind === "post");
  let body: string;
  let machineGenerated = false;
  if (generator) {
    try {
      body = await generator(prompt);
      machineGenerated = true;
    } catch {
      body = templateBody(account, offer);
    }
  } else {
    body = templateBody(account, offer);
  }
  const base: PostDraft = isPost
    ? {
        account,
        kind: "post",
        title: `Response to @${offer.source.author}`,
        body,
        tags: Object.freeze(offer.source.community ? [offer.source.community] : ["hive"]),
        approvedForBroadcast: false,
      }
    : {
        account,
        kind: "reply",
        title: "",
        body,
        tags: Object.freeze([]),
        parent: Object.freeze({ author: offer.source.author, permlink: offer.source.permlink }),
        approvedForBroadcast: false,
      };
  return Object.freeze({ ...base, offerId: offer.id, machineGenerated, prompt });
}
