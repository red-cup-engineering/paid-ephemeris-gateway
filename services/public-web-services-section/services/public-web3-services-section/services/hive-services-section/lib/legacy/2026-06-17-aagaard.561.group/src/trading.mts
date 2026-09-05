// trading — the financial lane.
//
// Three venues, one upstream pipeline: the internal HIVE/HBD order book, the
// Hive-Engine token books, and the Hive-Engine AMM pools. `fetchMarketRun`
// reads all of them (auto-detecting the account's actual token books from its
// balances); `inferTrades`/`inferLp`/`inferHbdSavings` propose orders judged by
// `@emsenn/computing-with-hive` market readings — edge versus executable slippage over the
// real order-book walk, never a naive mid-price; `executeTrades`/`executeLp`/
// `executeHbdSavings` broadcast the judged-good ones through the signing client
// (internal limit orders, Hive-Engine `custom_json`). Aagaard rolls none of
// this — it sets the per-account risk envelope, gates the broadcast, and records.
//
// Live-money discipline: only the sandbox account carries `tradingLive`. Every
// other account is propose-only on this lane even when the fleet is armed — its
// orders are computed and surfaced but never signed, pending a human turning on
// its envelope. The sandbox is where live financial shenanigans are sanctioned.

import {
  fetchMarketRun,
  inferTrades,
  inferLp,
  inferHbdSavings,
  executeTrades,
  executeLp,
  executeHbdSavings,
  type MarketRunResult,
  type TradeInference,
  type LpInference,
  type SavingsInference,
} from "@emsenn/computing-with-hive/scripts";

import type { FleetMember } from "./fleet.mts";
import { readLiquidity, type LiquidityReading } from "./analysis/liquidity.mts";

export interface TradingPlan {
  readonly account: string;
  readonly hive: string;
  readonly hbd: string;
  readonly market: MarketRunResult;
  /** Liquidity map within/between the three venues (task #20). */
  readonly liquidity: LiquidityReading;
  readonly trades: readonly TradeInference[];
  readonly lp: readonly LpInference[];
  readonly savings: SavingsInference | null;
  /** Whether this account is permitted to broadcast trades when the fleet is armed. */
  readonly liveEligible: boolean;
  /** The raw account object — handed on so the historic ledger can snapshot
   *  stake/mana fields without a second fetch. */
  readonly rawAccount: Readonly<Record<string, unknown>> | undefined;
}

export interface TradingExecution {
  readonly account: string;
  readonly tradesExecuted: number;
  readonly lpExecuted: number;
  readonly savingsExecuted: boolean;
  readonly mode: "live" | "dry-run" | "propose-only";
  readonly tradeTxIds: readonly string[];
  readonly lpTxIds: readonly string[];
  readonly savingsTxId?: string;
}

/**
 * Plan this account's trades across all three venues from its real balances,
 * bounded by the account's risk envelope. No broadcast happens here — only the
 * upstream propose-only inference.
 */
export async function planTrades(member: FleetMember): Promise<TradingPlan> {
  const { hive, account, policy } = member;
  const [market, acct] = await Promise.all([
    fetchMarketRun(hive, account),
    hive.getAccount(account),
  ]);

  const liquidity = {
    hive: typeof acct?.balance === "string" ? acct.balance : "0.000 HIVE",
    hbd: typeof acct?.hbd_balance === "string" ? acct.hbd_balance : "0.000 HBD",
    heBalances: market.heBalances,
    lpPositions: market.lpPositions,
  };

  const lp = inferLp(market.poolStates, market.lpPositions, market.heBalances);
  const lpTargetSymbols = new Set<string>();
  for (const inf of lp) for (const sym of inf.tokenPair.split(":")) lpTargetSymbols.add(sym);

  const trades = inferTrades(market.markets, liquidity, {
    capHiveMilli: policy.risk.capHiveMilli,
    capHbdMilli: policy.risk.capHbdMilli,
    lpTargetSymbols,
  });

  const savings = inferHbdSavings(liquidity.hbd, policy.risk.minLiquidHbdMilli);

  return Object.freeze({
    account,
    hive: liquidity.hive,
    hbd: liquidity.hbd,
    market,
    liquidity: readLiquidity(market),
    trades,
    lp,
    savings,
    liveEligible: policy.risk.tradingLive,
    rawAccount: (acct ?? undefined) as Readonly<Record<string, unknown>> | undefined,
  });
}

/**
 * Execute a trading plan through the signing client — the broadcast boundary.
 * Broadcasts iff `armed` (fleet live AND trading enabled) AND the account is
 * `liveEligible` (only the sandbox). Otherwise the plan is recorded propose-only
 * / dry-run and nothing is signed. Trades need the active key; its absence
 * downgrades to propose-only rather than erroring.
 */
export async function executeTrading(
  member: FleetMember,
  plan: TradingPlan,
  armed: boolean,
): Promise<TradingExecution> {
  const canBroadcast = armed && plan.liveEligible && member.hasActive;
  const mode: TradingExecution["mode"] = !armed
    ? "dry-run"
    : plan.liveEligible && member.hasActive
      ? "live"
      : "propose-only";

  if (!canBroadcast) {
    return Object.freeze({
      account: plan.account,
      tradesExecuted: 0,
      lpExecuted: 0,
      savingsExecuted: false,
      mode,
      tradeTxIds: Object.freeze([]),
      lpTxIds: Object.freeze([]),
    });
  }

  const tradeResults = await executeTrades(plan.trades, member.hive, plan.account);
  const lpResults = await executeLp(plan.lp, member.hive, plan.account);
  const savingsTxId = plan.savings ? await executeHbdSavings(plan.savings, member.hive, plan.account) : null;

  return Object.freeze({
    account: plan.account,
    tradesExecuted: tradeResults.length,
    lpExecuted: lpResults.length,
    savingsExecuted: savingsTxId !== null,
    mode,
    tradeTxIds: Object.freeze(tradeResults.map((r) => r.txId)),
    lpTxIds: Object.freeze(lpResults.map((r) => r.txId)),
    ...(savingsTxId ? { savingsTxId } : {}),
  });
}
