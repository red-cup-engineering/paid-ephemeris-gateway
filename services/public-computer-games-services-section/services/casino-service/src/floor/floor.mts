/**
 * floor/floor.mts — the facade `server.mts` and `cast-residency.mts` both talk to: wraps
 * `@red-cup-engineering/qwzspace/room`'s `createRoom()` around `./world.mts`'s pure(ish) domain,
 * and exposes a small, game-shaped API (`broadcastSitDown`/`broadcastWin`/`broadcastDialogue`/
 * `setZone`/`leave`/`summary`/`hasConnections`/`onWin`) so neither caller has to know qwzspace's
 * raw intent-queue shape (`{ actorId, seq, kind, args }`) or its wire protocol.
 *
 * ## Why direct `room.queue.push`, not a client connection
 *
 * Every event this module emits is SERVER-side truth (a real settlement, a real cast decision,
 * presence itself) — there is no untrusted client on the other end of it, so it is pushed onto
 * `room.queue` directly, the exact mechanism `room.mjs`'s own `wireConnection` uses internally for
 * its synthetic `presence.join`/`presence.leave` intents (see that module's own `finishJoin`).
 * `gameValidate` (this module's `validate` below) remains the trust boundary for REAL wire clients
 * (a browser's `floor.chat` intent) — a direct `queue.push` bypasses it on purpose, the same way
 * `presence.join` always has.
 *
 * ## Self-audit / replay
 *
 * `selfAuditEvery: 0` (disabled) — see `./world.mts`'s own header for why: the jackpot balance is
 * live, externally-owned `CasinoEconomy` state, not a pure fold of this room's own intent log, so
 * self-audit's "replay from tick 0 and diff the hash" would spuriously fail (or, worse, silently
 * compare against a DIFFERENT live jackpot reading than the one recorded at replay time) through no
 * fault of a real bug. This mirrors `@red-cup-engineering/qwzspace/lobby`'s own documented scope
 * note for the identical reason ("a lobby is a domain whose whole point is to reflect state it does
 * not own"). Presence/zone/feed folding is still genuinely pure and would verify cleanly on its own.
 */
import { createRoom, type Room } from '@red-cup-engineering/qwzspace/room';
import { createFloorWorld, type FloorAvatar, type FloorZone, type FloorWorld, type FloorFeedEntity, type FloorPlayerEntity } from './world.mts';

export interface FloorWinBroadcast {
  readonly actorId: string;
  readonly actorName: string;
  readonly game: 'blackjack' | 'slots';
  readonly tier: 'win' | 'big-win' | 'jackpot';
  readonly amount: number;
}

export type WinListener = (event: FloorWinBroadcast) => void;

/** The shape both `blackjack/table.mts#BlackjackSettlement` and `slots/table.mts#SlotsSettlement`
 *  share closely enough for one tiering function — see `reportSettlement` below, the single seam
 *  both `server.mts` (human tables) and `cast-residency.mts` (persona tables) call from their own
 *  `onSettlement` callbacks, so win-tiering policy lives in exactly one place. */
export interface SettlementLike {
  readonly game: 'blackjack' | 'slots';
  readonly accountId: string;
  readonly wager: number;
  readonly payout: number;
  readonly jackpotHit?: boolean;
  readonly jackpotPayout?: number;
}

export interface FloorSummary {
  readonly presenceCount: number;
  readonly jackpot: number;
  readonly players: readonly { readonly name: string; readonly role: string; readonly zone: string }[];
  readonly recentEvents: readonly {
    readonly type: string;
    readonly text: string;
    readonly actorName: string | null;
    readonly game: string | null;
    readonly amount: number | null;
  }[];
}

export interface Floor {
  readonly room: Room;
  hasConnections(): boolean;
  jackpotBalance(): number;
  sitDown(actorId: string, name: string, avatar?: FloorAvatar): void;
  setZone(actorId: string, zone: FloorZone): void;
  leave(actorId: string): void;
  broadcastDialogue(actorId: string, actorName: string, text: string): void;
  broadcastWin(event: FloorWinBroadcast): void;
  /** Tier `event` (see `tierForSettlement`) and, if it clears the floor's show-worthiness bar,
   *  broadcast it as `playerName`'s win. A no-op below the `'win'` tier — most ordinary small wins
   *  never reach the floor feed, by design (see `tierForSettlement`'s own header). */
  reportSettlement(playerName: string, event: SettlementLike): void;
  onWin(listener: WinListener): () => void;
  summary(limit?: number): FloorSummary;
}

/** Win-tiering thresholds, expressed as a payout-to-wager multiple — floor presentation policy,
 *  deliberately kept OUT of the game engines themselves (see `blackjack/table.mts` and
 *  `slots/table.mts`'s own `onSettlement` headers: they report raw numbers, the floor decides what
 *  counts as a show-worthy win). A jackpot hit is always tier `'jackpot'` regardless of multiple. */
const BIG_WIN_MULTIPLE = 10;
const WIN_MULTIPLE = 1.5;

export function tierForSettlement(wager: number, payout: number, jackpotHit: boolean): 'win' | 'big-win' | 'jackpot' | null {
  if (jackpotHit) return 'jackpot';
  if (payout <= 0) return null;
  const multiple = wager > 0 ? payout / wager : payout;
  if (multiple >= BIG_WIN_MULTIPLE) return 'big-win';
  if (multiple >= WIN_MULTIPLE) return 'win';
  return null;
}

export interface CreateFloorOptions {
  readonly roomId?: string;
  readonly intervalMs?: number;
  readonly getJackpotBalance: () => number;
}

export function createFloor(options: CreateFloorOptions): Floor {
  let liveWorld: FloorWorld | null = null;

  const room = createRoom({
    id: options.roomId ?? 'cowrie-casino-floor',
    world: () => {
      const w = createFloorWorld({ getJackpotBalance: options.getJackpotBalance });
      if (liveWorld === null) liveWorld = w; // the FIRST call is always the live instance — see room.mjs
      return w;
    },
    validate: (raw: unknown, _actorId: string) => {
      if (raw === null || typeof raw !== 'object') return null;
      const body = raw as { kind?: unknown; args?: unknown };
      if (body.kind === 'floor.chat') {
        const args = body.args as { text?: unknown } | undefined;
        if (typeof args?.text === 'string' && args.text.trim().length > 0) {
          return { kind: 'floor.chat', args: { text: args.text.slice(0, 200) } };
        }
      }
      return null; // every other kind (including floor.zone/floor.broadcast) is server-only
    },
    intervalMs: options.intervalMs ?? 1000,
    selfAuditEvery: 0, // see this module's own header
  });

  function push(actorId: string, kind: string, args: Record<string, unknown> = {}): void {
    room.queue.push({ actorId, seq: 0, kind, args });
  }

  const winListeners = new Set<WinListener>();

  function hasConnections(): boolean {
    return room.hub.size() > 0;
  }

  function jackpotBalance(): number {
    return liveWorld?.jackpotBalance() ?? options.getJackpotBalance();
  }

  function sitDown(actorId: string, name: string, avatar?: FloorAvatar): void {
    push(actorId, 'presence.join', { name, avatar });
  }

  function setZone(actorId: string, zone: FloorZone): void {
    push(actorId, 'floor.zone', { zone });
  }

  function leave(actorId: string): void {
    push(actorId, 'presence.leave', {});
  }

  function broadcastDialogue(actorId: string, actorName: string, text: string): void {
    push(actorId, 'floor.broadcast', { type: 'dialogue', text, actorName });
  }

  function broadcastWin(event: FloorWinBroadcast): void {
    const text =
      event.tier === 'jackpot'
        ? `${event.actorName} just hit the JACKPOT for ${event.amount.toLocaleString('en-US')} chips!`
        : event.tier === 'big-win'
          ? `${event.actorName} landed a big win — +${event.amount.toLocaleString('en-US')} chips at ${event.game}.`
          : `${event.actorName} won +${event.amount.toLocaleString('en-US')} chips at ${event.game}.`;
    push(event.actorId, 'floor.broadcast', { type: event.tier, text, actorName: event.actorName, game: event.game, amount: event.amount });
    for (const listener of winListeners) listener(event);
  }

  function reportSettlement(playerName: string, event: SettlementLike): void {
    const jackpotHit = event.jackpotHit === true;
    const tier = tierForSettlement(event.wager, event.payout, jackpotHit);
    if (tier === null) return;
    const amount = tier === 'jackpot' ? (event.jackpotPayout ?? 0) : event.payout;
    broadcastWin({ actorId: event.accountId, actorName: playerName, game: event.game, tier, amount });
  }

  function onWin(listener: WinListener): () => void {
    winListeners.add(listener);
    return () => winListeners.delete(listener);
  }

  function summary(limit = 20): FloorSummary {
    const players: FloorPlayerEntity[] = liveWorld?.players() ?? [];
    const events: FloorFeedEntity[] = liveWorld?.recentFeed(limit) ?? [];
    return {
      presenceCount: players.length,
      jackpot: jackpotBalance(),
      players: players.map((p) => ({ name: p.name, role: p.role, zone: p.zone })),
      recentEvents: events
        .slice()
        .reverse()
        .map((e) => ({ type: e.type, text: e.text, actorName: e.actorName, game: e.game, amount: e.amount })),
    };
  }

  return { room, hasConnections, jackpotBalance, sitDown, setZone, leave, broadcastDialogue, broadcastWin, reportSettlement, onWin, summary };
}
