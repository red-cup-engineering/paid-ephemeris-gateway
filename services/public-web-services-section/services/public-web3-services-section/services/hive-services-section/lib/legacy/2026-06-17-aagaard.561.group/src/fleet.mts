// fleet — the signing-capable client per account.
//
// The whole platform reads and writes Hive through ONE upstream boundary: the
// `HiveComputer` from @emsenn/computing-with-hive/client. It already carries
// every read (accounts, posts, order books, reward fund, history) and every
// write (vote, transfer, limit orders, Hive-Engine custom_json, claim) with
// transaction building and signing. Aagaard never rolls its own RPC, codec, or
// signer — it constructs one computer per account over the on-disk key vault
// and hands it to the lanes. Keys enter the process here and only here.

import path from "node:path";
import { readFileSync } from "node:fs";

import { HiveComputer } from "@emsenn/computing-with-hive/client";

import type { AccountPolicy, AagaardConfig } from "./config.mts";

export interface FleetMember {
  readonly account: string;
  readonly policy: AccountPolicy;
  readonly hive: HiveComputer;
  /** Which role keys were found on disk (posting moves social/vote ops, active
   *  moves money/market ops). A lane checks this before attempting a broadcast. */
  readonly hasPosting: boolean;
  readonly hasActive: boolean;
}

export type Fleet = ReadonlyMap<string, FleetMember>;

function readWif(keyRoot: string, account: string, role: "posting" | "active"): string | undefined {
  try {
    return readFileSync(path.join(keyRoot, account, `${role}.wif`), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Build the fleet: one signing-capable HiveComputer per configured account,
 *  keyed by whichever role WIFs are present in the vault. */
export function buildFleet(config: AagaardConfig): Fleet {
  const members = new Map<string, FleetMember>();
  for (const policy of config.accounts) {
    const posting = readWif(config.keyRoot, policy.account, "posting");
    const active = readWif(config.keyRoot, policy.account, "active");
    const keys: Record<string, string> = {};
    if (posting) keys["posting"] = posting;
    if (active) keys["active"] = active;
    const hive = new HiveComputer({
      account: policy.account,
      ...(config.nodes ? { nodes: config.nodes } : {}),
      ...(Object.keys(keys).length > 0 ? { keys } : {}),
    });
    members.set(policy.account, Object.freeze({
      account: policy.account,
      policy,
      hive,
      hasPosting: posting !== undefined,
      hasActive: active !== undefined,
    }));
  }
  return members;
}
