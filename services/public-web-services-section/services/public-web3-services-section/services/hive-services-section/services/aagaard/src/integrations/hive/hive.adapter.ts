import type { InternalMarketReading, PostCandidate, WalletActor, WalletChainState } from "../../core/core.adapter.ts";
import type { CurationRewardOperation, CurationRewardScan } from "../../core/curationSettlement.mts";
import { nativeMarketVwap, type NativeMarketBucket, type NativeMarketObservation, type NativeOpenOrder, type NativeOrderEvent } from "../../core/nativeMarket.mts";
export type { InternalMarketReading } from "../../core/core.adapter.ts";

export interface HiveClientOptions {
  readonly nodes: readonly string[];
  readonly timeoutMs: number;
  readonly perSourceLimit: number;
  readonly fetch?: typeof fetch;
}

export interface HiveClient {
  readCandidateField(wallet: WalletActor): Promise<readonly PostCandidate[]>;
  readWalletState(wallet: WalletActor): Promise<WalletChainState | null>;
  /** Bounded account-history scan for actual curation_reward virtual ops. */
  readCurationRewards(wallet: WalletActor): Promise<CurationRewardScan>;
  /** Hive's own internal HIVE/HBD order book -- the real market this app
   *  used to stand in for with a hardcoded 0.30/0.31 placeholder. */
  readInternalMarket(): Promise<InternalMarketReading | null>;
  /** Complete native-market decision substrate: depth, recent history,
   * balances, and this account's currently open orders. */
  readNativeMarket(account: string, windowMinutes?: number): Promise<NativeMarketObservation>;
}

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.split(" ")[0]);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function parseJsonRecord(value: unknown): JsonRecord {
  if (isRecord(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function tagsOf(raw: JsonRecord): readonly string[] {
  const metadata = parseJsonRecord(raw["json_metadata"]);
  const tags = Array.isArray(metadata["tags"])
    ? metadata["tags"].filter((entry): entry is string => typeof entry === "string")
    : [];
  const category = text(raw["category"]);
  return Object.freeze([...new Set([category, ...tags].filter((tag) => tag !== ""))]);
}

function activeVotesOf(raw: JsonRecord): readonly { readonly voter: string; readonly rshares: number; readonly time?: string; readonly percent?: number }[] {
  const votes = Array.isArray(raw["active_votes"]) ? raw["active_votes"] : [];
  return Object.freeze(votes.filter(isRecord).map((vote) => {
    const time = text(vote["time"]);
    return Object.freeze({
      voter: text(vote["voter"]),
      rshares: num(vote["rshares"]),
      ...(time !== "" ? { time: normalizedIso(time) } : {}),
      ...(typeof vote["percent"] === "number" ? { percent: vote["percent"] } : {}),
    });
  }).filter((vote) => vote.voter !== ""));
}

function beneficiariesOf(raw: JsonRecord): readonly { readonly account: string; readonly weight: number }[] {
  const beneficiaries = Array.isArray(raw["beneficiaries"]) ? raw["beneficiaries"] : [];
  return Object.freeze(beneficiaries.filter(isRecord).map((entry) => Object.freeze({
    account: text(entry["account"]),
    weight: num(entry["weight"]),
  })).filter((entry) => entry.account !== ""));
}

// Hive timestamps arrive without a trailing "Z" (naive UTC) — Date.parse
// treats that as local time unless corrected, which would silently skew every
// age and timing read by the runtime's UTC offset.
function normalizedIso(value: string): string {
  return value.endsWith("Z") ? value : `${value}Z`;
}

function nativeBucket(raw: unknown): NativeMarketBucket | null {
  if (!isRecord(raw) || !isRecord(raw["hive"]) || !isRecord(raw["non_hive"])) return null;
  const hive = raw["hive"];
  const hbd = raw["non_hive"];
  const opened = text(raw["open"]);
  const seconds = num(raw["seconds"], Number.NaN);
  const row = Object.freeze({
    openedAt: opened === "" ? "" : normalizedIso(opened),
    seconds,
    closeHbd: num(hbd["close"], 0),
    closeHive: num(hive["close"], 0),
    volumeHive: num(hive["volume"], 0),
    volumeHbd: num(hbd["volume"], 0),
  });
  return row.openedAt !== "" && Number.isInteger(row.seconds) && row.seconds > 0 ? row : null;
}

function nativeOpenOrder(raw: unknown): NativeOpenOrder | null {
  if (!isRecord(raw)) return null;
  const orderId = num(raw["orderid"] ?? raw["order_id"], Number.NaN);
  const created = text(raw["created"]);
  const expiration = text(raw["expiration"]);
  const sell = text(raw["sell_price"] && isRecord(raw["sell_price"]) ? raw["sell_price"]["base"] : raw["amount_to_sell"]);
  const receive = text(raw["sell_price"] && isRecord(raw["sell_price"]) ? raw["sell_price"]["quote"] : raw["min_to_receive"]);
  if (!Number.isSafeInteger(orderId) || orderId < 0 || created === "" || expiration === "" || sell === "" || receive === "") return null;
  const sellSymbol = sell.split(" ")[1];
  const receiveSymbol = receive.split(" ")[1];
  if (!((sellSymbol === "HBD" && receiveSymbol === "HIVE") || (sellSymbol === "HIVE" && receiveSymbol === "HBD"))) return null;
  return Object.freeze({
    orderId,
    createdAt: normalizedIso(created),
    expiresAt: normalizedIso(expiration),
    amountToSell: sell,
    minToReceive: receive,
    side: sellSymbol === "HBD" ? "buy-hive" as const : "sell-hive" as const,
  });
}

function nativeOrderEvent(account: string, row: unknown): NativeOrderEvent | null {
  if (!Array.isArray(row) || row.length < 2 || !isRecord(row[1])) return null;
  const historyIndex = num(row[0], Number.NaN);
  const envelope = row[1];
  const op = envelope["op"];
  if (!Number.isSafeInteger(historyIndex) || !Array.isArray(op) || typeof op[0] !== "string" || !isRecord(op[1])) return null;
  if (!["limit_order_create", "limit_order_create2", "limit_order_cancel", "fill_order"].includes(op[0])) return null;
  const body = op[1];
  const participants = [body["owner"], body["current_owner"], body["open_owner"]];
  if (!participants.includes(account)) return null;
  const timestamp = text(envelope["timestamp"]);
  const transactionId = text(envelope["trx_id"]);
  if (timestamp === "") return null;
  return Object.freeze({
    sourceId: `hive-account-history:${account}:${historyIndex}`,
    operation: op[0] as NativeOrderEvent["operation"],
    timestamp: normalizedIso(timestamp),
    transactionId,
    body,
  });
}

/** Decode one condenser_api.get_account_history row. Virtual-operation
 * transaction ids are commonly all zero, so source identity is the account's
 * history index plus the block/op position instead. */
export function curationRewardFromHistoryRow(account: string, row: unknown): CurationRewardOperation | null {
  if (!Array.isArray(row) || row.length < 2 || !isRecord(row[1])) return null;
  const historyIndex = num(row[0], Number.NaN);
  const envelope = row[1];
  const op = envelope["op"];
  if (!Number.isInteger(historyIndex) || !Array.isArray(op) || op[0] !== "curation_reward" || !isRecord(op[1])) return null;
  const value = op[1];
  const curator = text(value["curator"]);
  const author = text(value["author"]);
  const permlink = text(value["permlink"]);
  const rewardText = text(value["reward"]);
  const rewardMatch = /^(\d+(?:\.\d{1,6})?) VESTS$/.exec(rewardText);
  const block = num(envelope["block"], Number.NaN);
  const operationIndex = num(envelope["op_in_trx"], Number.NaN);
  const timestamp = text(envelope["timestamp"]);
  if (curator !== account || author === "" || permlink === "" || !rewardMatch
    || !Number.isInteger(block) || !Number.isInteger(operationIndex) || timestamp === "") return null;
  return Object.freeze({
    sourceId: `hive-account-history:${account}:${historyIndex}:${block}:${operationIndex}`,
    account,
    historyIndex,
    block,
    operationIndex,
    timestamp: normalizedIso(timestamp),
    author,
    permlink,
    reward: Object.freeze({ amount: rewardMatch[1]!, asset: "VESTS" as const }),
    payoutMustBeClaimed: typeof value["payout_must_be_claimed"] === "boolean" ? value["payout_must_be_claimed"] : null,
  });
}

function ageHours(created: string, now = Date.now()): number {
  const ms = Date.parse(normalizedIso(created));
  return Number.isFinite(ms) ? Math.max(0, (now - ms) / 3_600_000) : 0;
}

export function postCandidateFromHive(raw: JsonRecord, now = Date.now()): PostCandidate | null {
  const author = text(raw["author"]);
  const permlink = text(raw["permlink"]);
  if (author === "" || permlink === "") return null;
  const created = text(raw["created"]);
  return Object.freeze({
    author,
    permlink,
    title: text(raw["title"]),
    body: text(raw["body"]).slice(0, 4000),
    tags: tagsOf(raw),
    pendingPayout: num(raw["pending_payout_value"] ?? raw["pending_payout"], 0),
    netRshares: num(raw["net_rshares"], 0),
    comments: num(raw["children"], 0),
    ageHours: ageHours(created, now),
    created: created === "" ? new Date(now).toISOString() : normalizedIso(created),
    beneficiaries: beneficiariesOf(raw),
    votes: activeVotesOf(raw),
  });
}

const VOTING_MANA_REGENERATION_SECONDS = 5 * 24 * 60 * 60;

/** Project Hive's stored manabar to the observation time. The legacy
 * `voting_power` account field is only the value stored at the account's last
 * vote and does not regenerate between account mutations, so treating it as a
 * current value can keep an idle, fully recharged wallet below its strategy
 * floor indefinitely. */
export function accountStateFromHive(account: string, raw: JsonRecord | undefined, nowUnixSeconds = Math.floor(Date.now() / 1000)): WalletChainState | null {
  if (!raw) return null;
  const vestingShares = num(raw["vesting_shares"], 0);
  const delegatedVestingShares = num(raw["delegated_vesting_shares"], 0);
  const receivedVestingShares = num(raw["received_vesting_shares"], 0);
  const maxMana = Math.max(0, Math.round((vestingShares - delegatedVestingShares + receivedVestingShares) * 1_000_000));
  const manabar = isRecord(raw["voting_manabar"]) ? raw["voting_manabar"] : null;
  const storedMana = manabar ? num(manabar["current_mana"], Number.NaN) : Number.NaN;
  const lastUpdate = manabar ? num(manabar["last_update_time"], Number.NaN) : Number.NaN;
  const elapsed = Number.isFinite(lastUpdate) ? Math.max(0, Math.floor(nowUnixSeconds) - Math.floor(lastUpdate)) : 0;
  const currentMana = maxMana > 0 && Number.isFinite(storedMana) && Number.isFinite(lastUpdate)
    ? Math.max(0, Math.min(maxMana, Math.floor(storedMana + (elapsed * maxMana) / VOTING_MANA_REGENERATION_SECONDS)))
    : 0;
  return Object.freeze({
    account,
    hive: text(raw["balance"], "0.000 HIVE"),
    hbd: text(raw["hbd_balance"], "0.000 HBD"),
    currentMana: String(currentMana),
    maxMana: String(maxMana),
    tokens: Object.freeze({}),
  });
}

type CandidateRequest = Readonly<{
  readonly method: "bridge.get_ranked_posts" | "bridge.get_account_posts";
  readonly params: JsonRecord;
}>;

function feedRequests(wallet: WalletActor, limit: number): readonly CandidateRequest[] {
  const feeds = wallet.strategy.feeds.length > 0 ? wallet.strategy.feeds : ["trending"];
  return Object.freeze(feeds.map((feed) => {
    if (feed === "following") {
      return Object.freeze({
        method: "bridge.get_account_posts" as const,
        params: Object.freeze({ sort: "feed", account: wallet.account, limit }),
      });
    }
    if (feed.startsWith("blog:")) {
      return Object.freeze({
        method: "bridge.get_account_posts" as const,
        params: Object.freeze({ sort: "blog", account: feed.slice("blog:".length), limit }),
      });
    }
    if (feed === "trending" || feed === "created" || feed === "hot") {
      return Object.freeze({
        method: "bridge.get_ranked_posts" as const,
        params: Object.freeze({ sort: feed, tag: "", observer: wallet.account, limit }),
      });
    }
    return Object.freeze({
      method: "bridge.get_ranked_posts" as const,
      params: Object.freeze({ sort: "trending", tag: feed, observer: wallet.account, limit }),
    });
  }));
}

export function createHiveClient(options: HiveClientOptions): HiveClient {
  const fetchImpl = options.fetch ?? fetch;
  let nextId = 1;
  let internalMarketCache: { readonly expires: number; readonly value: Promise<InternalMarketReading | null> } | null = null;

  async function call(method: string, params: unknown): Promise<unknown> {
    let lastError: unknown;
    for (const node of options.nodes) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetchImpl(node, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Hive RPC ${node} ${response.status}`);
        const payload = await response.json() as unknown;
        if (!isRecord(payload)) throw new Error(`Hive RPC ${node} returned non-object payload`);
        if (payload["error"] !== undefined) throw new Error(`Hive RPC ${method} error: ${JSON.stringify(payload["error"])}`);
        return payload["result"];
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async function consensusCall(method: string, params: unknown, project: (value: unknown) => unknown = (value) => value): Promise<unknown> {
    async function at(node: string): Promise<unknown> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetchImpl(node, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }), signal: controller.signal });
        if (!response.ok) throw new Error(`Hive RPC ${node} ${response.status}`);
        const payload = await response.json() as unknown;
        if (!isRecord(payload) || payload["error"] !== undefined) throw new Error(`Hive RPC ${method} invalid response`);
        return payload["result"];
      } finally { clearTimeout(timeout); }
    }
    const settled = await Promise.allSettled(options.nodes.map(at));
    const successes = settled.filter((row): row is PromiseFulfilledResult<unknown> => row.status === "fulfilled").map((row) => row.value);
    const required = Math.min(2, options.nodes.length);
    if (successes.length < required) throw new Error(`Hive RPC ${method} lacks ${required}-provider support`);
    const canonical = JSON.stringify(project(successes[0]));
    if (successes.slice(1).some((value) => JSON.stringify(project(value)) !== canonical)) throw new Error(`Hive RPC ${method} provider disagreement`);
    return successes[0];
  }

  async function candidatePosts(request: CandidateRequest): Promise<readonly JsonRecord[]> {
    const result = await call(request.method, request.params);
    return Object.freeze((Array.isArray(result) ? result : []).filter(isRecord));
  }

  return Object.freeze({
    async readCandidateField(wallet: WalletActor) {
      const batches = await Promise.all(feedRequests(wallet, options.perSourceLimit).map(candidatePosts));
      const byKey = new Map<string, PostCandidate>();
      for (const raw of batches.flat()) {
        const post = postCandidateFromHive(raw);
        if (post) byKey.set(`${post.author}/${post.permlink}`, post);
      }
      return Object.freeze([...byKey.values()]);
    },
    async readWalletState(wallet: WalletActor) {
      const result = await call("condenser_api.get_accounts", [[wallet.account]]);
      const accounts = Array.isArray(result) ? result.filter(isRecord) : [];
      return accountStateFromHive(wallet.account, accounts[0]);
    },
    async readCurationRewards(wallet: WalletActor) {
      const requestedLimit = 1000;
      const result = await call("condenser_api.get_account_history", [wallet.account, -1, requestedLimit]);
      const rows = Array.isArray(result) ? result : [];
      const indices = rows
        .map((row) => Array.isArray(row) ? num(row[0], Number.NaN) : Number.NaN)
        .filter((value) => Number.isInteger(value));
      const rewards = rows
        .map((row) => curationRewardFromHistoryRow(wallet.account, row))
        .filter((entry): entry is CurationRewardOperation => entry !== null);
      return Object.freeze({
        kind: "aagaard.hive-curation-reward-scan" as const,
        account: wallet.account,
        requestedLimit,
        newestHistoryIndex: indices.length > 0 ? Math.max(...indices) : null,
        oldestHistoryIndex: indices.length > 0 ? Math.min(...indices) : null,
        rewards: Object.freeze(rewards),
      });
    },
    async readInternalMarket() {
      if (internalMarketCache && internalMarketCache.expires > Date.now()) return await internalMarketCache.value;
      const value = (async (): Promise<InternalMarketReading | null> => {
      const [ticker, book] = await Promise.all([
        call("condenser_api.get_ticker", []),
        call("condenser_api.get_order_book", [20]),
      ]);
      if (!isRecord(ticker)) return null;
      const latest = num(ticker["latest"], 0);
      const bid = num(ticker["highest_bid"], 0);
      const ask = num(ticker["lowest_ask"], 0);
      const midpoint = latest > 0 ? latest : bid > 0 && ask > 0 ? (bid + ask) / 2 : 0;
      if (midpoint <= 0) return null;
      const relativeSpreadBps = bid > 0 && ask > 0 ? Math.round(((ask - bid) / midpoint) * 10000) : 0;
      // hbd/hive amounts on each book row are integer-scaled (thousandths);
      // consistent scale is all this depth proxy needs, since it is compared
      // to zero (one-sided check) and to itself (imbalance), never to an
      // absolute HBD figure.
      const bids = isRecord(book) && Array.isArray(book["bids"]) ? book["bids"].filter(isRecord) : [];
      const asks = isRecord(book) && Array.isArray(book["asks"]) ? book["asks"].filter(isRecord) : [];
      const bookRows = (rows: readonly JsonRecord[]) => Object.freeze(rows.map((row) => Object.freeze({
        priceHbdPerHive: num(row["real_price"], 0),
        hiveQuantity: num(row["hive"], 0) / 1000,
        hbdQuantity: num(row["hbd"], 0) / 1000,
      })).filter((row) => row.priceHbdPerHive > 0 && row.hiveQuantity > 0 && row.hbdQuantity > 0));
      const bidRows = bookRows(bids);
      const askRows = bookRows(asks);
      const bestBid = bidRows[0]?.priceHbdPerHive ?? bid;
      const bestAsk = askRows[0]?.priceHbdPerHive ?? ask;
      const bidDepth = bidRows.reduce((sum, row) => sum + row.hbdQuantity, 0);
      const askDepth = askRows.reduce((sum, row) => sum + row.hbdQuantity, 0);
      return Object.freeze({
        midpoint,
        bestBid,
        bestAsk,
        bestBidQuantityHive: bidRows[0]?.hiveQuantity ?? 0,
        bestAskQuantityHive: askRows[0]?.hiveQuantity ?? 0,
        bids: bidRows,
        asks: askRows,
        bidDepth,
        askDepth,
        relativeSpreadBps,
      });
      })();
      internalMarketCache = { expires: Date.now() + 15_000, value };
      return await value;
    },
    async readNativeMarket(account: string, windowMinutes = 5) {
      if (!/^[a-z][a-z0-9.-]{2,15}$/.test(account)) throw new TypeError("account must be a canonical Hive account name");
      if (!Number.isInteger(windowMinutes) || windowMinutes < 1 || windowMinutes > 60) throw new RangeError("windowMinutes must be an integer from 1 through 60");
      const observedAt = new Date().toISOString();
      const end = observedAt.replace(/\.\d{3}Z$/, "");
      const start = new Date(Date.parse(observedAt) - windowMinutes * 60_000).toISOString().replace(/\.\d{3}Z$/, "");
      const results = await Promise.allSettled([
        consensusCall("condenser_api.get_order_book", [Math.min(500, Math.max(20, options.perSourceLimit))], (value) => {
          if (!isRecord(value)) return null;
          const projectSide = (side: "bids" | "asks") => (Array.isArray(value[side]) ? value[side] : []).slice(0, 1).filter(isRecord).map((row) => [num(row["real_price"], 0), num(row["hive"], 0), num(row["hbd"], 0)]);
          return [projectSide("bids"), projectSide("asks")];
        }),
        consensusCall("condenser_api.get_market_history", [60, start, end], (value) => (Array.isArray(value) ? value : []).map(nativeBucket).filter(Boolean)),
        consensusCall("condenser_api.get_accounts", [[account]], (value) => {
          const first = Array.isArray(value) && isRecord(value[0]) ? value[0] : {};
          return [text(first["name"]), text(first["balance"]), text(first["hbd_balance"])];
        }),
        consensusCall("condenser_api.get_open_orders", [account], (value) => (Array.isArray(value) ? value : []).map(nativeOpenOrder).filter(Boolean)),
        consensusCall("condenser_api.get_account_history", [account, -1, 1000], (value) => (Array.isArray(value) ? value : []).map((row) => nativeOrderEvent(account, row)).filter(Boolean)),
      ]);
      const limitations: string[] = [];
      const value = (index: number, label: string): unknown => {
        const result = results[index];
        if (result?.status === "fulfilled") return result.value;
        limitations.push(`${label}-unavailable`);
        return null;
      };
      const book = value(0, "order-book");
      const historyRaw = value(1, "market-history");
      const accountsRaw = value(2, "account");
      const ordersRaw = value(3, "open-orders");
      const accountHistoryRaw = value(4, "account-history");
      const rows = (source: unknown, side: "bids" | "asks") => isRecord(source) && Array.isArray(source[side])
        ? Object.freeze(source[side].filter(isRecord).map((row) => Object.freeze({
          priceHbdPerHive: num(row["real_price"], 0),
          hiveQuantity: num(row["hive"], 0) / 1000,
          hbdQuantity: num(row["hbd"], 0) / 1000,
        })).filter((row) => row.priceHbdPerHive > 0 && row.hiveQuantity > 0 && row.hbdQuantity > 0))
        : Object.freeze([]);
      const bids = rows(book, "bids");
      const asks = rows(book, "asks");
      if (bids.length === 0) limitations.push("bid-book-empty");
      if (asks.length === 0) limitations.push("ask-book-empty");
      const history = Object.freeze((Array.isArray(historyRaw) ? historyRaw : []).map(nativeBucket).filter((row): row is NativeMarketBucket => row !== null));
      if (history.length === 0) limitations.push("market-history-empty");
      const accountRows = Array.isArray(accountsRaw) ? accountsRaw.filter(isRecord) : [];
      const accountRow = accountRows[0];
      if (!accountRow) limitations.push("account-missing");
      const rawOrders = Array.isArray(ordersRaw) ? ordersRaw : [];
      const openOrders = Object.freeze(rawOrders.map(nativeOpenOrder).filter((row): row is NativeOpenOrder => row !== null));
      if (rawOrders.length !== openOrders.length) limitations.push("open-order-row-malformed");
      const orderEvents = Object.freeze((Array.isArray(accountHistoryRaw) ? accountHistoryRaw : []).map((row) => nativeOrderEvent(account, row)).filter((row): row is NativeOrderEvent => row !== null));
      const bestBid = bids[0]?.priceHbdPerHive ?? 0;
      const bestAsk = asks[0]?.priceHbdPerHive ?? 0;
      const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
      const midpoint = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;
      return Object.freeze({
        kind: "aagaard.native-market-observation" as const,
        account,
        observedAt,
        windowMinutes,
        bestBid,
        bestAsk,
        spread,
        spreadBps: midpoint > 0 ? Math.round(spread / midpoint * 10_000) : 0,
        bids,
        asks,
        history,
        vwapHbdPerHive: nativeMarketVwap(history),
        hiveBalance: text(accountRow?.["balance"], ""),
        hbdBalance: text(accountRow?.["hbd_balance"], ""),
        openOrders,
        orderEvents,
        complete: limitations.length === 0,
        limitations: Object.freeze(limitations),
      });
    },
  });
}
