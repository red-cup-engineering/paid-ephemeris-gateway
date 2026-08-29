// incentive/arbitration — the human-in-the-loop gate (#27).
//
// Every offer the authorization model marks `nominate` lands here as a pending
// nomination. The operator dispositions each one — from the WebUX or the /ops
// API — with exactly the three choices the brief names:
//
//   • ignore     — drop it;
//   • llm-draft  — have the machine write the required response into the LOCKED
//                  posting draft store for review (never auto-broadcast);
//   • manual     — the operator will write it themselves.
//
// Nominations and their dispositions persist (a JSON state map + an append-only
// audit log). Drafts produced by `llm-draft` carry `approvedForBroadcast: false`
// and only a human unlock in source can ever send them. Nothing here broadcasts.

import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

import { appendJsonl } from "@emsenn/computing-with-hive/scripts";

import type { StateStore } from "../state.mts";
import { composeIncentiveDraft, type DraftGenerator, type IncentiveDraft } from "./draft.mts";
import type { ActionKind, IncentiveOffer } from "./offers.mts";
import type { AuthorizedOffer } from "./authorization.mts";

export type NominationStatus = "pending" | "ignored" | "llm-draft" | "manual" | "drafted";

export interface NominationRecord {
  readonly offerId: string;
  readonly account: string;
  readonly source: { readonly author: string; readonly permlink: string; readonly community?: string };
  readonly requiredActions: readonly string[];
  readonly reward: { readonly token: string; readonly amount?: number } | null;
  readonly rewardHbd: number;
  readonly ev: number;
  readonly rationale: string;
  readonly rawText: string;
  readonly status: NominationStatus;
  readonly firstSeen: string;
  readonly updated: string;
  readonly draft?: IncentiveDraft;
}

function statePath(store: StateStore): string {
  return path.join(store.stateDir, "incentive-nominations.json");
}
function auditPath(store: StateStore): string {
  return path.join(store.logDir, "incentive-nominations.jsonl");
}

/** Load the current nomination map (offerId → record). */
export function loadNominations(store: StateStore): Map<string, NominationRecord> {
  try {
    const raw = readFileSync(statePath(store), "utf8");
    const arr = JSON.parse(raw) as NominationRecord[];
    return new Map(arr.map((r) => [r.offerId, r]));
  } catch {
    return new Map();
  }
}

function saveNominations(store: StateStore, map: ReadonlyMap<string, NominationRecord>): void {
  writeFileSync(statePath(store), JSON.stringify([...map.values()], null, 2));
}

/** Record newly-nominated offers as pending, stamped with the account they were
 *  found for (idempotent by offer id). Auto-dispositioned offers are NOT recorded
 *  here — they belong to the executor. */
export function recordNominationsForAccount(store: StateStore, account: string, ts: string, authorized: readonly AuthorizedOffer[]): NominationRecord[] {
  const map = loadNominations(store);
  const added: NominationRecord[] = [];
  for (const a of authorized) {
    if (a.disposition !== "nominate") continue;
    if (map.has(a.scored.offer.id)) continue;
    const offer = a.scored.offer;
    const record: NominationRecord = Object.freeze({
      offerId: offer.id,
      account,
      source: offer.source,
      requiredActions: offer.requiredActions.map((x) => x.kind),
      reward: offer.reward,
      rewardHbd: a.scored.rewardHbd,
      ev: a.scored.ev,
      rationale: a.rationale,
      rawText: offer.rawText,
      status: "pending",
      firstSeen: ts,
      updated: ts,
    });
    map.set(offer.id, record);
    added.push(record);
  }
  if (added.length > 0) {
    saveNominations(store, map);
    appendJsonl(auditPath(store), added.map((r) => ({ event: "nominated", ...r })));
  }
  return added;
}

export interface NominationListing {
  readonly pending: readonly NominationRecord[];
  readonly dispositioned: readonly NominationRecord[];
}

/** List nominations, split into pending and already-dispositioned. */
export function listNominations(store: StateStore): NominationListing {
  const all = [...loadNominations(store).values()].sort((a, b) => b.ev - a.ev);
  return Object.freeze({
    pending: Object.freeze(all.filter((r) => r.status === "pending")),
    dispositioned: Object.freeze(all.filter((r) => r.status !== "pending")),
  });
}

export type DispositionChoice = "ignore" | "llm-draft" | "manual";

/** Apply a human disposition to a nomination. `llm-draft` composes the locked
 *  draft (using the optional LLM generator) and marks it `drafted`. Returns the
 *  updated record, or null if the offer id is unknown. */
export async function dispositionNomination(
  store: StateStore,
  ts: string,
  offerId: string,
  choice: DispositionChoice,
  generator?: DraftGenerator,
): Promise<NominationRecord | null> {
  const map = loadNominations(store);
  const existing = map.get(offerId);
  if (!existing) return null;

  let updated: NominationRecord;
  if (choice === "ignore") {
    updated = { ...existing, status: "ignored", updated: ts };
  } else if (choice === "manual") {
    updated = { ...existing, status: "manual", updated: ts };
  } else {
    // llm-draft: reconstruct the offer and compose into the LOCKED draft store
    // (never broadcast).
    const offer: IncentiveOffer = {
      id: existing.offerId,
      source: existing.source,
      requiredActions: existing.requiredActions.map((k) => ({ kind: k as ActionKind })),
      reward: existing.reward,
      rawText: existing.rawText,
    };
    const draft = await composeIncentiveDraft(existing.account || "unknown", offer, generator);
    updated = { ...existing, status: "drafted", updated: ts, draft };
  }
  map.set(offerId, Object.freeze(updated));
  saveNominations(store, map);
  appendJsonl(auditPath(store), [{ event: "dispositioned", choice, offerId, ts, status: updated.status }]);
  return Object.freeze(updated);
}
