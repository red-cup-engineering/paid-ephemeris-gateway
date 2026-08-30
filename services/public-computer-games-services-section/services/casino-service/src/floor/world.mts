/**
 * floor/world.mts — the pure(ish) domain the realtime casino floor room folds: `createFloorWorld()`
 * returns exactly the `{ runTick, subjectsOf, snapOf }` triple `@red-cup-engineering/qwzspace/room`'s
 * `world` factory contract asks for (see that package's own header: "a FACTORY, called fresh for
 * replay/self-audit so they never share mutable state with the live instance" — every call to
 * `createFloorWorld()` builds a brand-new, independent `Map`/array closure, never a shared one).
 *
 * What the floor tracks: who's present (a human by session, a cast persona by id) with a `zone`
 * (`lobby` | `blackjack` | `slots`) and a deterministic, hash-derived on-floor position; the shared
 * jackpot pool's live balance; and a capped, TTL-expiring rolling feed of events (sit-downs, wins,
 * jackpots, chat/dialogue lines) — each feed entry is its own entity (`event-<seq>`), so falling out
 * of the TTL window is exactly qwzspace's own "left the interest set" removal (a delta's `g` list),
 * not a special case this module has to hand-roll.
 *
 * HONEST SCOPE NOTE on replay/self-audit, matching `@red-cup-engineering/qwzspace/lobby`'s own
 * documented exception: `getJackpotBalance()` reads LIVE, external `CasinoEconomy` state — money the
 * intent log itself never carries (a wager/rake/payout happens inside `CasinoEconomy`'s own ledger,
 * driven by real HTTP requests and cast policy decisions, not by an intent this room's queue ever
 * sees). That makes this world's `runTick` impure with respect to the qwzspace replay-verifiable-room
 * contract by design — "a domain whose whole point is to reflect state it does not own" (qwzspace's
 * own words for the lobby world). `src/floor/floor.mts` disables `selfAuditEvery` for exactly this
 * reason; see its own header. Every OTHER field (presence, zones, the feed) is a pure fold of the
 * intent log and stays genuinely replay-consistent.
 */
import { randRange } from '@red-cup-engineering/qwzspace/deterministic-random';

export type FloorZone = 'lobby' | 'blackjack' | 'slots';
export type PlayerKind = 'human' | 'cast';

export interface FloorAvatar {
  readonly drawable: string;
  readonly params?: Record<string, unknown>;
  readonly tint?: string;
}

export interface FloorPlayerEntity {
  readonly id: string;
  readonly kind: 'player';
  readonly role: PlayerKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly name: string;
  readonly zone: FloorZone;
  readonly sprite: string;
  readonly spriteParams: Record<string, unknown>;
  readonly tint?: string;
  readonly layer: 'pieces';
}

export interface FloorJackpotEntity {
  readonly id: 'jackpot';
  readonly kind: 'jackpot';
  readonly role: 'jackpot';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly layer: 'overlay';
  readonly sprite: 'gem';
  readonly balance: number;
}

export type FeedEventType = 'sit-down' | 'win' | 'big-win' | 'jackpot' | 'chat' | 'dialogue' | 'leave';

export interface FloorFeedEntity {
  readonly id: string;
  readonly kind: 'feed-event';
  readonly role: 'feed-event';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly layer: 'overlay';
  readonly type: FeedEventType;
  readonly text: string;
  readonly actorId: string | null;
  readonly actorName: string | null;
  readonly game: 'blackjack' | 'slots' | null;
  readonly amount: number | null;
  readonly atTick: number;
}

export type FloorEntity = FloorPlayerEntity | FloorJackpotEntity | FloorFeedEntity;

export interface FloorIntent {
  readonly actorId: string;
  readonly kind: string;
  readonly args: Record<string, unknown>;
}

export interface FloorWorld {
  runTick(tick: number, intents: readonly FloorIntent[]): Promise<{ dirty: string[]; events: unknown[] }>;
  /** `tick` is accepted (per qwzspace/room's `World` contract) and ignored — this world keeps only
   *  LIVE state, never a per-tick history (see this module's own header: replay correctness still
   *  holds because a fresh replay instance has, by construction, already folded every intent up to
   *  `tick` through `runTick` before `subjectsOf`/`snapOf` are ever asked about that same tick). */
  subjectsOf(tick?: number): string[];
  snapOf(id: string, tick?: number): FloorEntity | null;
  /** Not part of the qwzspace world contract — a direct read seam `floor.mts`'s facade captures
   *  off the FIRST (live) `worldFactory()` call, for `GET /floor/summary` and presence counting.
   *  See this module's own header on why `runTick`'s own dirty-id contract alone is not enough for
   *  a non-WS HTTP summary endpoint to read from. */
  playerCount(): number;
  players(): FloorPlayerEntity[];
  recentFeed(limit?: number): FloorFeedEntity[];
  jackpotBalance(): number;
}

export const FEED_TTL_TICKS = 300; // ~60s at the default 200ms tick
export const MAX_FEED_EVENTS = 60;
export const CHAT_MAX_LEN = 200;

const ZONE_CENTERS: Record<FloorZone, { x: number; y: number; spread: number }> = {
  lobby: { x: 0, y: 0, spread: 140 },
  blackjack: { x: -260, y: 40, spread: 90 },
  slots: { x: 260, y: 40, spread: 110 },
};

const HUMAN_TINTS = ['#7fb0c9', '#c98a7f', '#9fc97f', '#c9b57f', '#a67fc9'];

function deterministicPosition(seedText: string, zone: FloorZone): { x: number; y: number } {
  const seed = hashText(seedText);
  const center = ZONE_CENTERS[zone];
  const x = center.x + randRange(seed, 1, -center.spread, center.spread, 0);
  const y = center.y + randRange(seed, 2, -center.spread * 0.6, center.spread * 0.6, 1);
  return { x, y };
}

function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function humanTint(actorId: string): string {
  const idx = hashText(actorId) % HUMAN_TINTS.length;
  return HUMAN_TINTS[idx] ?? '#7fb0c9';
}

interface MutablePlayer {
  id: string;
  role: PlayerKind;
  name: string;
  zone: FloorZone;
  sprite: string;
  spriteParams: Record<string, unknown>;
  tint?: string;
}

interface MutableFeedEvent {
  id: string;
  tick: number;
  type: FeedEventType;
  text: string;
  actorId: string | null;
  actorName: string | null;
  game: 'blackjack' | 'slots' | null;
  amount: number | null;
}

export interface CreateFloorWorldOptions {
  readonly getJackpotBalance?: () => number;
}

export function createFloorWorld(options: CreateFloorWorldOptions = {}): FloorWorld {
  const getJackpotBalance = options.getJackpotBalance ?? (() => 0);
  const players = new Map<string, MutablePlayer>();
  const feed: MutableFeedEvent[] = [];
  let eventSeq = 0;
  let lastJackpot = getJackpotBalance();

  function isCastActor(actorId: string): boolean {
    return actorId.startsWith('cast:');
  }

  function addPlayer(actorId: string, name: string, dirty: Set<string>): void {
    if (players.has(actorId)) return;
    const cast = isCastActor(actorId);
    players.set(actorId, {
      id: actorId,
      role: cast ? 'cast' : 'human',
      name: name || (cast ? actorId.slice('cast:'.length) : 'wanderer'),
      zone: 'lobby',
      sprite: cast ? 'disc' : 'chip',
      spriteParams: {},
      tint: cast ? undefined : humanTint(actorId),
    });
    dirty.add(actorId);
  }

  function removePlayer(actorId: string, dirty: Set<string>): void {
    if (players.delete(actorId)) dirty.add(actorId);
  }

  function setZone(actorId: string, zone: FloorZone, dirty: Set<string>): void {
    const p = players.get(actorId);
    if (p === undefined || p.zone === zone) return;
    p.zone = zone;
    dirty.add(actorId);
  }

  function setAvatar(actorId: string, avatar: FloorAvatar | undefined, dirty: Set<string>): void {
    if (avatar === undefined) return;
    const p = players.get(actorId);
    if (p === undefined) return;
    p.sprite = avatar.drawable;
    p.spriteParams = avatar.params ?? {};
    p.tint = avatar.tint;
    dirty.add(actorId);
  }

  function pushFeed(tick: number, entry: Omit<MutableFeedEvent, 'id' | 'tick'>, dirty: Set<string>): void {
    eventSeq += 1;
    const id = `event-${eventSeq}`;
    feed.push({ id, tick, ...entry });
    dirty.add(id);
  }

  function expireFeed(tick: number, dirty: Set<string>): void {
    while (feed.length > 0) {
      const oldest = feed[0] as MutableFeedEvent;
      const tooOld = tick - oldest.tick > FEED_TTL_TICKS;
      const tooMany = feed.length > MAX_FEED_EVENTS;
      if (!tooOld && !tooMany) break;
      feed.shift();
      dirty.add(oldest.id);
    }
  }

  function toEntity(p: MutablePlayer): FloorPlayerEntity {
    const pos = deterministicPosition(p.id, p.zone);
    return {
      id: p.id,
      kind: 'player',
      role: p.role,
      x: pos.x,
      y: pos.y,
      z: 0,
      yaw: 0,
      name: p.name,
      zone: p.zone,
      sprite: p.sprite,
      spriteParams: p.spriteParams,
      tint: p.tint,
      layer: 'pieces',
    };
  }

  function feedToEntity(e: MutableFeedEvent): FloorFeedEntity {
    return {
      id: e.id,
      kind: 'feed-event',
      role: 'feed-event',
      x: 0,
      y: 0,
      z: 0,
      yaw: 0,
      layer: 'overlay',
      type: e.type,
      text: e.text,
      actorId: e.actorId,
      actorName: e.actorName,
      game: e.game,
      amount: e.amount,
      atTick: e.tick,
    };
  }

  async function runTick(tick: number, intents: readonly FloorIntent[]): Promise<{ dirty: string[]; events: unknown[] }> {
    const dirty = new Set<string>();
    for (const it of intents) {
      const args = it.args ?? {};
      switch (it.kind) {
        case 'presence.join': {
          addPlayer(it.actorId, typeof args.name === 'string' ? args.name : '', dirty);
          if (typeof args.avatar === 'object' && args.avatar !== null) setAvatar(it.actorId, args.avatar as FloorAvatar, dirty);
          pushFeed(tick, { type: 'sit-down', text: `${players.get(it.actorId)?.name ?? it.actorId} steps onto the floor.`, actorId: it.actorId, actorName: players.get(it.actorId)?.name ?? null, game: null, amount: null }, dirty);
          break;
        }
        case 'presence.leave': {
          const name = players.get(it.actorId)?.name ?? null;
          removePlayer(it.actorId, dirty);
          if (name !== null) pushFeed(tick, { type: 'leave', text: `${name} heads out.`, actorId: it.actorId, actorName: name, game: null, amount: null }, dirty);
          break;
        }
        case 'floor.zone': {
          const zone = args.zone;
          if (zone === 'lobby' || zone === 'blackjack' || zone === 'slots') setZone(it.actorId, zone, dirty);
          break;
        }
        case 'floor.chat': {
          const text = typeof args.text === 'string' ? args.text.slice(0, CHAT_MAX_LEN) : '';
          if (text.length === 0) break;
          const name = players.get(it.actorId)?.name ?? it.actorId;
          pushFeed(tick, { type: 'chat', text, actorId: it.actorId, actorName: name, game: null, amount: null }, dirty);
          break;
        }
        case 'floor.broadcast': {
          const type = args.type;
          if (type !== 'win' && type !== 'big-win' && type !== 'jackpot' && type !== 'dialogue') break;
          const game = args.game === 'blackjack' || args.game === 'slots' ? args.game : null;
          const amount = typeof args.amount === 'number' ? args.amount : null;
          const actorName = typeof args.actorName === 'string' ? args.actorName : (players.get(it.actorId)?.name ?? null);
          const text = typeof args.text === 'string' ? args.text.slice(0, CHAT_MAX_LEN) : '';
          pushFeed(tick, { type, text, actorId: it.actorId === 'house' ? null : it.actorId, actorName, game, amount }, dirty);
          break;
        }
        default:
          break; // an unrecognized kind is ignored, never thrown — see room.mjs's own discipline
      }
    }

    const bal = getJackpotBalance();
    if (bal !== lastJackpot) {
      lastJackpot = bal;
      dirty.add('jackpot');
    }

    expireFeed(tick, dirty);
    return { dirty: [...dirty], events: [] };
  }

  function subjectsOf(_tick?: number): string[] {
    return [...players.keys(), 'jackpot', ...feed.map((e) => e.id)];
  }

  function snapOf(id: string, _tick?: number): FloorEntity | null {
    if (id === 'jackpot') {
      return { id: 'jackpot', kind: 'jackpot', role: 'jackpot', x: 0, y: 0, z: 0, yaw: 0, layer: 'overlay', sprite: 'gem', balance: lastJackpot };
    }
    const p = players.get(id);
    if (p !== undefined) return toEntity(p);
    const e = feed.find((entry) => entry.id === id);
    if (e !== undefined) return feedToEntity(e);
    return null;
  }

  return {
    runTick,
    subjectsOf,
    snapOf,
    playerCount: () => players.size,
    players: () => [...players.values()].map(toEntity),
    recentFeed: (limit = MAX_FEED_EVENTS) => feed.slice(-limit).map(feedToEntity),
    jackpotBalance: () => lastJackpot,
  };
}
