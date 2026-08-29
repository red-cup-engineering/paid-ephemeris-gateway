// gaming — PREPARED BUT LOCKED. On-chain game play detected and planned, with
// the move broadcast bolted shut pending human review.
//
// Several fleet wallets hold assets in Hive on-chain games — Splinterlands
// (DEC/SPS and sm_* custom_json), Rising Star (STARBITS and rising-star
// custom_json), dCity (SIM), and others. Each game is played by signing
// `custom_json` operations, which the upstream client already broadcasts. This
// lane DETECTS which games an account is in (from its Hive-Engine token
// balances) and PLANS the routine moves (daily quest, mission, claim), but
// `executeGameMoves` REFUSES: `gaming` is a locked capability, enable-able only
// by a human editing source after reviewing the proposed moves. No runtime flag
// arms it. A game move spends real staked assets — it is the most consequential
// lane, so it is the most firmly closed.

import { isLocked } from "./config.mts";
import type { HEBalance } from "@emsenn/computing-with-hive/scripts";
import type { FleetMember } from "./fleet.mts";

/** Known Hive on-chain games keyed by a signature token symbol the account
 *  would hold if it plays. The `custom_json` id is the move boundary the
 *  upstream client signs, recorded here for the reviewer. */
interface GameSignature {
  readonly game: string;
  readonly tokens: readonly string[];
  readonly customJsonId: string;
  /** The routine autonomous move this lane would propose. */
  readonly routineMove: string;
}

const KNOWN_GAMES: readonly GameSignature[] = Object.freeze([
  { game: "Splinterlands", tokens: ["DEC", "SPS", "SPSP", "VOUCHER"], customJsonId: "sm_", routineMove: "claim daily quest / start ranked" },
  { game: "Rising Star", tokens: ["STARBITS", "STAR"], customJsonId: "rising-star", routineMove: "start best available mission" },
  { game: "dCity", tokens: ["SIM"], customJsonId: "dcity", routineMove: "collect daily SIM income" },
  { game: "Hashkings", tokens: ["BUDS", "SEEDS"], customJsonId: "hashkings", routineMove: "water plots / harvest" },
]);

export interface DetectedGame {
  readonly game: string;
  /** Which of the game's signature tokens the account actually holds. */
  readonly heldTokens: readonly { symbol: string; balance: string }[];
  readonly customJsonId: string;
  readonly proposedMove: string;
  /** Always false — the lane is locked. */
  readonly approvedForBroadcast: false;
}

export interface GamingPlan {
  readonly account: string;
  readonly games: readonly DetectedGame[];
}

/** Detect the games an account plays from its Hive-Engine balances and plan the
 *  routine move for each. Pure read-and-match — no broadcast. */
export function planGames(member: FleetMember, heBalances: readonly HEBalance[]): GamingPlan {
  const bySymbol = new Map(heBalances.map((b) => [b.symbol, b.balance]));
  const games: DetectedGame[] = [];
  for (const sig of KNOWN_GAMES) {
    const held = sig.tokens
      .filter((t) => bySymbol.has(t) && Number.parseFloat(bySymbol.get(t) ?? "0") > 0)
      .map((t) => ({ symbol: t, balance: bySymbol.get(t) ?? "0" }));
    if (held.length === 0) continue;
    games.push(Object.freeze({
      game: sig.game,
      heldTokens: Object.freeze(held),
      customJsonId: sig.customJsonId,
      proposedMove: sig.routineMove,
      approvedForBroadcast: false as const,
    }));
  }
  return Object.freeze({ account: member.account, games: Object.freeze(games) });
}

export class GamingLockedError extends Error {
  constructor() {
    super("gaming is a locked capability: prepared but disabled pending human review — unlock in source");
    this.name = "GamingLockedError";
  }
}

/**
 * The move broadcast boundary — permanently closed while gaming is locked. No
 * `armed` parameter: the lock is a standing refusal, not a runtime gate. Always
 * throws, by design, so no code path can autonomously spend staked game assets.
 */
export function executeGameMoves(_member: FleetMember, _plan: GamingPlan): never {
  if (isLocked("gaming")) throw new GamingLockedError();
  throw new GamingLockedError();
}
