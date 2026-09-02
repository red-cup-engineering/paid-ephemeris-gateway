/**
 * casino-economy.mts — the one facade server.mts talks to. Everything above this file
 * (accrual, daily-bonus, bundles, jackpot, wager) is a set of small, independently-testable
 * modules; `CasinoEconomy` is where they're wired to one shared `Ledger` and one shared
 * in-memory `PlayerRecord` store, and where "now" and "today" finally become real —
 * `Date.now()`/`new Date()` are read exactly once per call, right here, then threaded down as
 * plain values into the pure modules underneath. Nothing below this file ever reads the clock
 * itself, so every one of those modules stays testable with fabricated timestamps.
 *
 * Persistence: `CasinoEconomy` owns two pieces of state — the ledger's entry list and the
 * player-record map — and exposes `snapshot()`/`restore()` so `persistence.mts`'s JSON-file
 * snapshot (or, later, a GCS-backed store — see that module's header) can save and reload both
 * without knowing anything about accrual math or the chart of accounts.
 */
import { createLedger } from '@red-cup-engineering/energy-bank/ledger';
import type { Ledger, LedgerEntry } from '@red-cup-engineering/energy-bank/ledger';
import { fundAccount, spendFromAccount, transferEnergy } from '@red-cup-engineering/energy-bank/transfer';
import { hashSecret } from '@red-cup-engineering/energy-bank/accounts';
import { checkAll } from '@red-cup-engineering/energy-bank/invariants';
import { newPlayerRecord, casinoGuestId, casinoDurableId, migrateGuestPlayer, isGuest, AuthError } from './accounts.mts';
import type { PlayerRecord, AccountId } from './accounts.mts';
import { computeAccrual } from './accrual.mts';
import { computeDailyBonus } from './daily-bonus.mts';
import { beginPurchase, settlePurchase, BUNDLE_CATALOG } from './bundles.mts';
import type { PurchaseIntent, SettlePurchaseResult } from './bundles.mts';
import { jackpotBalance, seedJackpot, payoutJackpot } from './jackpot.mts';
import { placeWager, resolveWager, tablePotAccountId } from './wager.mts';
import {
  TICKET,
  CHIP,
  TICKET_ACCRUAL_CAP,
  TICKET_FAUCET_ACCOUNT,
  DAILY_BONUS_FAUCET_ACCOUNT,
  BUY_IN_TICKET_COST,
  BUY_IN_CHIP_GRANT,
  TICKET_ENTRY_SINK_ACCOUNT,
  CHIP_ISSUANCE_ACCOUNT,
  TABLE_BANKROLL_SEED_ACCOUNT,
  NAMESPACE,
} from './config.mts';

export { AuthError };

export interface CasinoEconomySnapshot {
  readonly ledgerEntries: readonly LedgerEntry[];
  readonly players: readonly PlayerRecord[];
  /** Undirected friend edges, each pair written once (`a < b`) — see `addFriend`/`friendsOf`. */
  readonly friendLinks?: readonly (readonly [AccountId, AccountId])[];
}

export interface BalanceStatus {
  readonly accountId: AccountId;
  readonly tickets: number;
  readonly chips: number;
  readonly ticketCap: number;
  readonly msUntilNextTicket: number;
  readonly dailyBonus: { readonly availableToday: boolean; readonly streak: number };
  readonly jackpot: number;
}

let refCounter = 0;
/** A fresh, process-unique idempotency ref for a ledger entry. Monotonic within a process; a
 *  restart resuming from a snapshot is fine because every op's ref also carries the account id
 *  and an operation tag, so a collision would require the same account performing the same
 *  numbered operation twice in the same process lifetime, which this counter itself rules out. */
function nextRef(tag: string, accountId: AccountId): string {
  refCounter += 1;
  return `${tag}:${accountId}:${refCounter}`;
}

export class CasinoEconomy {
  readonly ledger: Ledger;
  private readonly players = new Map<AccountId, PlayerRecord>();
  /** Undirected friend graph, durable accounts only — each edge recorded both directions so
   *  either side's `friendsOf` is an O(1) lookup. See `addFriend`/`giftTicket`. */
  private readonly friends = new Map<AccountId, Set<AccountId>>();

  constructor(ledger: Ledger = createLedger()) {
    this.ledger = ledger;
  }

  private playerFor(accountId: AccountId): PlayerRecord {
    let record = this.players.get(accountId);
    if (record === undefined) {
      record = newPlayerRecord(accountId);
      this.players.set(accountId, record);
    }
    return record;
  }

  private linkFriend(accountId: AccountId, friendAccountId: AccountId): void {
    let set = this.friends.get(accountId);
    if (set === undefined) {
      set = new Set();
      this.friends.set(accountId, set);
    }
    set.add(friendAccountId);
  }

  private balanceOf(accountId: AccountId, commodity: string): number {
    const { balances } = this.ledger.audit();
    return Number(balances[`liabilities:energy:${accountId}`]?.[commodity] ?? '0');
  }

  private dateStringAt(now: Date): string {
    return now.toISOString().slice(0, 10);
  }

  /** A brand-new guest identity for a client-minted key — server.mts calls this once per new
   *  session and remembers the resulting account id itself (see this package's session
   *  scheme); this method only derives the id and ensures a player record exists for it. */
  guestAccount(clientKey: string): AccountId {
    const accountId = casinoGuestId(clientKey);
    this.playerFor(accountId);
    return accountId;
  }

  /**
   * Log into (or claim) a durable handle with a passphrase — the handle+passphrase login this
   * package's account seam (accounts.mts) was built for. First login for a handle sets its
   * secret hash (`created: true`); a later login must supply the matching passphrase, or
   * throws `AuthError`. This is the "claim code" a player re-presents from any device/session
   * to reach the same durable account — no OAuth or email provider needed for this pass.
   * @throws {AuthError} on an empty passphrase, or one that does not match an already-claimed handle
   */
  loginAccount(handle: string, secret: string, now: Date = new Date()): { accountId: AccountId; created: boolean; status: BalanceStatus } {
    if (secret.trim() === '') throw new AuthError('an account needs a passphrase');
    const accountId = casinoDurableId(handle);
    const player = this.playerFor(accountId);
    const hash = hashSecret(NAMESPACE, accountId, secret);
    let created = false;
    if (player.secretHash === null) {
      player.secretHash = hash;
      created = true;
    } else if (player.secretHash !== hash) {
      throw new AuthError('that passphrase does not match');
    }
    return { accountId, created, status: this.statusOf(accountId, now) };
  }

  /**
   * Migrate a guest's non-ledger state and TICKET/CHIP ledger balances into a durable account,
   * once. `migrated: false` (never a throw) covers every refusal: no such guest, a durable
   * target that already shows progress, or the seam's own self-migration guard — see
   * accounts.mts#migrateGuestPlayer, which decides the non-ledger half of this.
   */
  claimGuestIntoAccount(guestAccountId: AccountId, durableAccountId: AccountId, now: Date = new Date()): { migrated: boolean; status: BalanceStatus } {
    const guest = this.players.get(guestAccountId);
    if (guest === undefined) return { migrated: false, status: this.statusOf(durableAccountId, now) };
    const migratedRecord = migrateGuestPlayer(guest, durableAccountId, this.players.get(durableAccountId));
    if (migratedRecord === null) return { migrated: false, status: this.statusOf(durableAccountId, now) };
    this.players.set(durableAccountId, migratedRecord);
    this.players.delete(guestAccountId);
    const date = this.dateStringAt(now);
    for (const commodity of [TICKET, CHIP]) {
      const amount = this.balanceOf(guestAccountId, commodity);
      if (amount > 0) {
        transferEnergy(this.ledger, guestAccountId, durableAccountId, String(amount), commodity, nextRef('migrate', durableAccountId), date);
      }
    }
    return { migrated: true, status: this.statusOf(durableAccountId, now) };
  }

  /**
   * Add a mutual friend link between two durable accounts — the friends list's whole shape:
   * an undirected edge, no request/accept flow (a v1 minimal enough to gift a ticket against).
   * @throws {RangeError} if either id is a guest account, or the two ids are the same account
   */
  addFriend(accountId: AccountId, friendAccountId: AccountId): { friends: readonly AccountId[] } {
    if (isGuest(accountId) || isGuest(friendAccountId)) throw new RangeError('friends must be durable accounts — log in first');
    if (accountId === friendAccountId) throw new RangeError('cannot friend yourself');
    if (!this.players.has(friendAccountId)) throw new RangeError(`no account claimed at ${friendAccountId}`);
    this.linkFriend(accountId, friendAccountId);
    this.linkFriend(friendAccountId, accountId);
    return { friends: this.friendsOf(accountId) };
  }

  /** The durable accounts `accountId` has friended, in no particular order. */
  friendsOf(accountId: AccountId): readonly AccountId[] {
    return [...(this.friends.get(accountId) ?? [])];
  }

  /**
   * Gift TICKETs to a friend — the friends list's one concrete action. Requires an existing
   * friend link (added by either side) and enough TICKETs to cover the gift; both accounts
   * must be durable, matching `addFriend`'s own guard.
   * @throws {RangeError} if either account is a guest, the two accounts are not friends, or the sender cannot cover `amount`
   */
  giftTicket(fromAccountId: AccountId, toAccountId: AccountId, amount = 1, now: Date = new Date()): { ticketsGifted: number; status: BalanceStatus } {
    if (isGuest(fromAccountId) || isGuest(toAccountId)) throw new RangeError('gifting requires durable accounts — log in first');
    if (!(this.friends.get(fromAccountId)?.has(toAccountId) ?? false)) throw new RangeError('not friends yet — add-friend first');
    transferEnergy(this.ledger, fromAccountId, toAccountId, String(amount), TICKET, nextRef('gift', fromAccountId), this.dateStringAt(now), {
      narration: `ticket gift: ${fromAccountId} -> ${toAccountId}`,
    });
    return { ticketsGifted: amount, status: this.statusOf(fromAccountId, now) };
  }

  /** Read-only status: current ticket/chip balances, ticket-accrual countdown, and today's
   *  daily-bonus availability — computed fresh, never cached, exactly like every other balance
   *  this package reports. Does not mutate anything or grant tickets; see `claimTickets`. */
  statusOf(accountId: AccountId, now: Date = new Date()): BalanceStatus {
    const player = this.playerFor(accountId);
    const tickets = this.balanceOf(accountId, TICKET);
    const accrual = computeAccrual({ lastAccrualAt: player.lastAccrualAt, currentBalance: tickets }, now.getTime());
    const daily = computeDailyBonus({ lastClaimDate: player.lastDailyBonusDate, streak: player.dailyBonusStreak }, now);
    return {
      accountId,
      tickets,
      chips: this.balanceOf(accountId, CHIP),
      ticketCap: TICKET_ACCRUAL_CAP,
      msUntilNextTicket: accrual.msUntilNextTicket,
      dailyBonus: { availableToday: daily.claimed, streak: player.dailyBonusStreak },
      jackpot: jackpotBalance(this.ledger),
    };
  }

  /**
   * Claim whatever free tickets are owed right now. Idempotent in effect (calling it twice in
   * quick succession grants nothing the second time — `computeAccrual` reports 0 owed once the
   * clock has just been advanced), and always advances the player's accrual clock even when
   * nothing is owed, so a first-ever call starts the timer rather than leaving `lastAccrualAt`
   * `null` forever.
   */
  claimTickets(accountId: AccountId, now: Date = new Date()): { ticketsGranted: number; status: BalanceStatus } {
    const player = this.playerFor(accountId);
    const tickets = this.balanceOf(accountId, TICKET);
    const accrual = computeAccrual({ lastAccrualAt: player.lastAccrualAt, currentBalance: tickets }, now.getTime());
    player.lastAccrualAt = accrual.newLastAccrualAt;
    if (accrual.ticketsToGrant > 0) {
      fundAccount(
        this.ledger,
        TICKET_FAUCET_ACCOUNT,
        accountId,
        String(accrual.ticketsToGrant),
        TICKET,
        nextRef('accrual', accountId),
        this.dateStringAt(now),
        `ticket accrual: +${accrual.ticketsToGrant} TICKET`,
      );
    }
    return { ticketsGranted: accrual.ticketsToGrant, status: this.statusOf(accountId, now) };
  }

  /** Claim today's daily bonus, if not already claimed. Returns `claimed: false` (not an
   *  error) when today's claim was already taken. */
  claimDailyBonus(accountId: AccountId, now: Date = new Date()): { claimed: boolean; ticketsGranted: number; streak: number; status: BalanceStatus } {
    const player = this.playerFor(accountId);
    const result = computeDailyBonus({ lastClaimDate: player.lastDailyBonusDate, streak: player.dailyBonusStreak }, now);
    player.lastDailyBonusDate = result.newLastClaimDate;
    player.dailyBonusStreak = result.newStreak;
    if (result.claimed) {
      fundAccount(
        this.ledger,
        DAILY_BONUS_FAUCET_ACCOUNT,
        accountId,
        String(result.ticketsGranted),
        TICKET,
        nextRef('daily-bonus', accountId),
        this.dateStringAt(now),
        `daily bonus (streak ${result.newStreak}): +${result.ticketsGranted} TICKET`,
      );
    }
    return { claimed: result.claimed, ticketsGranted: result.ticketsGranted, streak: result.newStreak, status: this.statusOf(accountId, now) };
  }

  /** The bundle catalog, as server.mts's `GET /bundles` returns it verbatim. */
  bundleCatalog() {
    return BUNDLE_CATALOG;
  }

  /** Begin a bundle purchase (mock settlement backend, or whatever `bundles.mts`'s
   *  `settlementBackends()` resolves to). */
  beginBundlePurchase(accountId: AccountId, skuId: string, orderId: string, backendId?: string): Promise<PurchaseIntent> {
    return beginPurchase(accountId, skuId, orderId, backendId);
  }

  /** Settle a previously-begun bundle purchase, granting its contents once cleared. */
  settleBundlePurchase(
    accountId: AccountId,
    skuId: string,
    orderId: string,
    backendId: string,
    now: Date = new Date(),
    evidence?: unknown,
  ): Promise<SettlePurchaseResult> {
    return settlePurchase(this.ledger, accountId, skuId, orderId, this.dateStringAt(now), backendId, evidence);
  }

  /**
   * The core tickets-for-play mechanic: spend a ticket to buy into a chip stack. Throws if the
   * player does not hold enough tickets (the ledger's own no-negative-balance enforcement).
   */
  buyIntoTable(accountId: AccountId, now: Date = new Date()): { ticketsSpent: number; chipsGranted: number; status: BalanceStatus } {
    const date = this.dateStringAt(now);
    spendFromAccount(this.ledger, accountId, TICKET_ENTRY_SINK_ACCOUNT, String(BUY_IN_TICKET_COST), TICKET, nextRef('buy-in-ticket', accountId), date);
    fundAccount(this.ledger, CHIP_ISSUANCE_ACCOUNT, accountId, String(BUY_IN_CHIP_GRANT), CHIP, nextRef('buy-in-chip', accountId), date);
    return { ticketsSpent: BUY_IN_TICKET_COST, chipsGranted: BUY_IN_CHIP_GRANT, status: this.statusOf(accountId, now) };
  }

  /** Seam for a future game engine: place a chip wager at a table, with the jackpot rake taken
   *  automatically. See wager.mts — no game rules live here, only the money movement. */
  placeWager(accountId: AccountId, tableId: string, betAmount: number, now: Date = new Date(), rakeBps?: number) {
    return placeWager(this.ledger, accountId, tableId, betAmount, nextRef('wager', accountId), this.dateStringAt(now), rakeBps);
  }

  /** Seam for a future game engine: resolve a table's pot to a winner. */
  resolveWager(tableId: string, toAccountId: AccountId, amount: number, now: Date = new Date()) {
    resolveWager(this.ledger, tableId, toAccountId, amount, nextRef('wager-resolve', toAccountId), this.dateStringAt(now));
  }

  /** House-ops seam: seed the jackpot pool (cold start, or a live-ops top-up). */
  seedJackpot(amount: number, now: Date = new Date()): void {
    seedJackpot(this.ledger, amount, nextRef('jackpot-seed', 'house'), this.dateStringAt(now));
  }

  /** Pay `amount` CHIPs out of the shared jackpot pool to `accountId` — a game engine's own
   *  jackpot-hit seam (see `slots/table.mts`'s own header for why the *amount* is decided by the
   *  caller, reading `jackpotBalance()`/`statusOf(...).jackpot` immediately beforehand, never by
   *  this method or by engine math). Throws if the pool cannot cover `amount` (the pool
   *  account's own no-negative-balance invariant, enforced at write time — the same backstop
   *  every other chip movement in this service gets). */
  payoutJackpot(accountId: AccountId, amount: number, now: Date = new Date()): void {
    payoutJackpot(this.ledger, accountId, amount, nextRef('jackpot-payout', accountId), this.dateStringAt(now));
  }

  /** House-ops seam for a player-vs-house table (a card table, a future reel bank): cold-start
   *  a table's own pot/bankroll so it can pay out a win larger than any single wager that has
   *  landed in it yet — see config.mts's `TABLE_BANKROLL_SEED_ACCOUNT` for why `placeWager`/
   *  `resolveWager` alone are not enough for this shape of game. Idempotent in effect only if
   *  the caller itself avoids calling it twice for the same table — this method does not track
   *  which tables have already been seeded (that bookkeeping belongs to the game session that
   *  calls it, e.g. blackjack's `table.mts`), matching `seedJackpot`'s own "never called by
   *  ordinary play" seam. */
  seedTablePot(tableId: string, amount: number, now: Date = new Date()): void {
    const date = this.dateStringAt(now);
    fundAccount(
      this.ledger,
      TABLE_BANKROLL_SEED_ACCOUNT,
      tablePotAccountId(tableId),
      String(amount),
      CHIP,
      nextRef('table-bankroll-seed', tableId),
      date,
      `table bankroll seed (${tableId}): +${amount} CHIP`,
    );
  }

  /** The shared jackpot pool's live CHIP balance, independent of any one account — unlike
   *  `statusOf(accountId).jackpot` (identical value, but requires a real account and creates one
   *  via `playerFor` if it didn't exist yet), this is the account-free read the realtime floor
   *  (`src/floor/`) polls every tick for its live jackpot ticker, with no side effect on the
   *  player-record map. */
  jackpotPoolBalance(): number {
    return jackpotBalance(this.ledger);
  }

  /** Every executable energy-bank invariant, run together — empty means the books are sound
   *  right now. Exposed to tests directly; `GET /audit` exposes the journal text instead. */
  checkInvariants() {
    return checkAll(this.ledger);
  }

  /** The full hledger-format journal, exactly as `GET /audit` serves it. */
  auditJournal(): string {
    return this.ledger.audit().journal;
  }

  /** Snapshot every piece of mutable state this economy owns, for persistence.mts. Each
   *  undirected friend edge is written once (`a < b`), not twice. */
  snapshot(): CasinoEconomySnapshot {
    const friendLinks: [AccountId, AccountId][] = [];
    for (const [accountId, friendSet] of this.friends) {
      for (const friendAccountId of friendSet) if (accountId < friendAccountId) friendLinks.push([accountId, friendAccountId]);
    }
    return { ledgerEntries: this.ledger.all(), players: [...this.players.values()], friendLinks };
  }

  /** Rebuild a `CasinoEconomy` from a prior snapshot. The ledger is reconstructed from its raw
   *  entry list (the same "seed a ledger from an arbitrary initial list" path
   *  `createLedger(initial)` documents); player records and friend edges are restored by
   *  account id (`friendLinks` is optional so a pre-friends-list snapshot still loads). */
  static fromSnapshot(snapshot: CasinoEconomySnapshot): CasinoEconomy {
    const economy = new CasinoEconomy(createLedger(snapshot.ledgerEntries));
    for (const player of snapshot.players) economy.players.set(player.accountId, { ...player });
    for (const [accountId, friendAccountId] of snapshot.friendLinks ?? []) {
      economy.linkFriend(accountId, friendAccountId);
      economy.linkFriend(friendAccountId, accountId);
    }
    return economy;
  }
}
