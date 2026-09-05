/**
 * floor/cast-residency.mts — the house's regulars: `@red-cup-engineering/cast` personas who
 * actually play, on the floor, through the SAME table/session modules the HTTP routes call
 * (`BlackjackTable`/`SlotsTable`) — real guest chip accounts via `CasinoEconomy`, real
 * `placeWager`/`resolveWager` chip movement, books balanced by the same invariants every human
 * wager already answers to.
 *
 * ## The transport decision: in-process, not HTTP loopback
 *
 * `@red-cup-engineering/cast`'s own `./adapters/http-json` is shaped for a persona talking to a
 * game over the network (its own header: "casino-service supplies buildObserveRequest/
 * buildIntentRequest — this is the adapter contract casino-service will implement"). This module
 * does NOT implement that adapter. A persona here runs INSIDE this same server process, so a
 * self-HTTP round trip would only add latency, a second bearer-token session per persona, and a
 * parallel serialize/deserialize of state this process already holds as live objects — for zero
 * benefit, since "the same intent API as humans" is a claim about the MODULE boundary
 * (`BlackjackTable#apply`/`SlotsTable#apply`, the exact calls `server.mts`'s `/blackjack/intent`
 * and `/slots/spin` routes make), not about which wire carries the call. `createBlackjackTransport`/
 * `createSlotsTransport` below satisfy `cast/runner`'s `Transport` interface
 * (`connect`/`observe`/`sendIntent`/`disconnect`) by calling those same table methods directly —
 * a persona's `hit`/`stand`/`spin` is the identical `table.apply(...)` a human's HTTP request
 * resolves to, just invoked from an in-process loop instead of a JSON body. If a persona ever
 * needed to run OUTSIDE this process (a separate load-test harness, a different service), swapping
 * in the real `http-json` adapter is a drop-in replacement — `runner.mjs` never knows the
 * difference (see cast's own README on this exact seam).
 *
 * ## Roster rotation
 *
 * `castOnDutyToday(date, rosterSize)` deterministically shuffles the eight authored personas
 * (`@red-cup-engineering/cast/persona#AUTHORED_PERSONAS`) seeded by the UTC calendar date, and
 * seats the first `rosterSize` (default 5) — a pure function, directly testable, so "who's a
 * regular tonight" varies day to day without needing a live clock inside the residency loop
 * itself. Game assignment (blackjack vs. slots) is a second, independent deterministic draw off
 * the same persona id, so the split is stable across restarts within the same UTC day.
 *
 * ## Dormancy — Cloud Run scales to zero, so the residency does too
 *
 * A persona's supervisor loop starts every session with `floor.hasConnections()` (this service's
 * WS presence count, via `broadcast-hub#size()`) — while it is `0`, the loop parks on a cheap,
 * `unref()`'d poll rather than ever constructing a table, buying in, or sending an intent. Once a
 * real viewer connects, the next poll notices and the persona sits down. Mid-session, the same
 * check runs after every runner event; a connection count dropping to `0` calls `runner.stop()`,
 * which ends the CURRENT step gracefully (any already-decided intent for this step still lands —
 * this is a best-effort boundary, not a hard real-time guarantee) and the persona's session ends
 * with its own `farewell` line, same as a natural walk-away. Nothing here fights Cloud Run's
 * scale-to-zero: an instance with no timers doing real work is free to be reclaimed.
 *
 * ## Money realism: personas earn their way in like anyone else
 *
 * `ensureFunded` calls the exact same `CasinoEconomy#claimTickets`/`claimDailyBonus`/`buyIntoTable`
 * sequence a human's own UI buttons call — a persona with no tickets today simply can't buy chips
 * today (the pre-session affordability check below just skips that persona's turn rather than
 * inventing house money), exactly the tickets-for-play discipline the whole service is built on.
 */
import type { CasinoEconomy } from '../economy/casino-economy.mts';
import { BUY_IN_TICKET_COST } from '../economy/config.mts';
import { BlackjackTable, type BlackjackSettlement } from '../games/blackjack/table.mts';
import { SlotsTable, type SlotsSettlement } from '../games/slots/table.mts';
import type { Floor } from './floor.mts';
import type { FloorZone } from './world.mts';
import { AUTHORED_PERSONAS, listAuthoredPersonaIds } from '@red-cup-engineering/cast/persona';
import { makeSubRng } from '@red-cup-engineering/cast/rng';
import { blackjackPolicy } from '@red-cup-engineering/cast/policy/blackjack';
import { chooseBet, classifySpinOutcome } from '@red-cup-engineering/cast/policy/slots';
import { betSize, walkAwayReason } from '@red-cup-engineering/cast/policy/bankroll';
import { createRunner } from '@red-cup-engineering/cast/runner';

type Persona = (typeof AUTHORED_PERSONAS)[number];
type CastGame = 'blackjack' | 'slots';

// ── roster rotation ─────────────────────────────────────────────────────────────────────────

const ROSTER_SEED = 'cowrie-casino-floor-roster';

/** Deterministic "who's a regular tonight": a UTC-date-seeded shuffle of the eight authored
 *  personas, seating the first `rosterSize`. Pure — same date, same roster, every call. */
export function castOnDutyToday(date: Date, rosterSize = 5): string[] {
  const dateString = date.toISOString().slice(0, 10);
  const rng = makeSubRng(ROSTER_SEED, dateString);
  const ids = listAuthoredPersonaIds();
  return rng.shuffle(ids).slice(0, Math.max(0, Math.min(rosterSize, ids.length)));
}

/** Which game a persona plays tonight — a second, independent deterministic draw off the same
 *  UTC date + persona id, so the blackjack/slots split is stable across a restart within one day
 *  but still varies day to day along with the roster itself. */
export function castGameAssignment(date: Date, personaId: string): CastGame {
  const dateString = date.toISOString().slice(0, 10);
  const rng = makeSubRng(ROSTER_SEED, dateString, personaId, 'game');
  return rng.pick(['blackjack', 'slots']);
}

function personaById(id: string): Persona {
  const found = AUTHORED_PERSONAS.find((p) => p.id === id);
  if (found === undefined) throw new RangeError(`cast-residency: unknown authored persona id "${id}"`);
  return found;
}

// ── money realism ───────────────────────────────────────────────────────────────────────────

const MAX_BUY_INS_PER_CHECK = 5; // defensive cap — bounded anyway by how many tickets are on hand

/** Claim whatever's owed (accrual + today's daily bonus, exactly the buttons a human clicks) and
 *  buy in as many times as tickets allow, up to `minChips` or the defensive cap above. Returns the
 *  resulting `{ chips, tickets }` so the caller can decide whether this persona can actually play
 *  right now — never grants anything a human's own UI couldn't also have granted. */
function ensureFunded(economy: CasinoEconomy, accountId: string, minChips: number): { chips: number; tickets: number } {
  economy.claimTickets(accountId);
  economy.claimDailyBonus(accountId);
  let status = economy.statusOf(accountId);
  let buyIns = 0;
  while (status.chips < minChips && status.tickets >= BUY_IN_TICKET_COST && buyIns < MAX_BUY_INS_PER_CHECK) {
    economy.buyIntoTable(accountId);
    status = economy.statusOf(accountId);
    buyIns += 1;
  }
  return { chips: status.chips, tickets: status.tickets };
}

// ── recentOutcomes bookkeeping (shared vocabulary: 'win' | 'loss' | 'push' | 'blackjack') ─────

type Outcome = 'win' | 'loss' | 'push' | 'blackjack';

interface SessionState {
  readonly startingChips: number;
  handsPlayed: number;
  recentOutcomes: Outcome[];
}

function recordOutcome(session: SessionState, outcome: Outcome): void {
  session.handsPlayed += 1;
  session.recentOutcomes = [...session.recentOutcomes, outcome].slice(-10);
}

// ── blackjack: in-process Transport + composed policy ──────────────────────────────────────────

interface BlackjackSession {
  readonly accountId: string;
  readonly table: BlackjackTable;
}

type BlackjackGameState =
  | { readonly phase: 'bet'; readonly chips: number; readonly tableMinBet: number; readonly tableMaxBet: number }
  | {
      readonly phase: 'decision';
      readonly playerRanks: readonly number[];
      readonly upcardRank: number;
      readonly composition: unknown;
      readonly options: { readonly hitSoft17: boolean };
    }
  | { readonly phase: 'next-hand' }
  | { readonly ended: true };

function createBlackjackTransport(economy: CasinoEconomy, tables: Map<string, BlackjackTable>, onSettlement: (accountId: string, event: BlackjackSettlement) => void) {
  return {
    connect(persona: Persona): BlackjackSession {
      const accountId = economy.guestAccount(`cast:${persona.id}`);
      let table = tables.get(accountId);
      if (table === undefined) {
        table = new BlackjackTable(economy, accountId, `cast-blackjack-${accountId}`, `cast:${persona.id}:shoe`, undefined, undefined, (event) => onSettlement(accountId, event));
        tables.set(accountId, table);
      }
      return { accountId, table };
    },
    observe(session: BlackjackSession): BlackjackGameState {
      const state = session.table.publicState();
      if (state.actions.canDeal) {
        const status = economy.statusOf(session.accountId);
        return { phase: 'bet', chips: status.chips, tableMinBet: state.rules.minBet, tableMaxBet: state.rules.maxBet };
      }
      if (state.actions.canNextHand) return { phase: 'next-hand' };
      const inputs = session.table.pendingDecisionInputs();
      if (inputs === null) return { ended: true };
      return { phase: 'decision', playerRanks: inputs.playerRanks, upcardRank: inputs.upcardRank, composition: inputs.composition, options: inputs.options };
    },
    sendIntent(session: BlackjackSession, decision: { kind: string; bet?: number; action?: string }) {
      const { table } = session;
      if (decision.kind === 'deal') {
        table.apply('deal', decision.bet);
        return { settled: false };
      }
      if (decision.kind === 'next-hand') {
        table.apply('next-hand');
        return { settled: false };
      }
      const before = table.publicState();
      table.apply(decision.action ?? '');
      const after = table.publicState();
      const justSettled = before.round?.phase === 'player-turn' && after.round?.phase === 'round-over';
      if (!justSettled || after.round?.outcomes == null || after.round.outcomes.length === 0) return { settled: false };
      const outcomes = after.round.outcomes;
      const payout = outcomes.reduce((sum, o) => sum + o.payout, 0);
      const bet = outcomes.reduce((sum, o) => sum + o.bet, 0);
      const result = outcomes.length === 1 ? outcomes[0]?.result : payout > bet ? 'win' : payout === bet ? 'push' : 'loss';
      return { settled: true, result, payout, bet };
    },
    disconnect() {
      /* the table persists across sessions, keyed by accountId — nothing to tear down */
    },
  };
}

function toRecentOutcome(result: string): Outcome {
  if (result === 'win' || result === 'blackjack') return result;
  if (result === 'push') return 'push';
  return 'loss'; // loss and surrender both count against a trailing loss streak
}

function makeBlackjackPolicy(session: SessionState) {
  return (gameState: BlackjackGameState, persona: Persona, rng: ReturnType<typeof makeSubRng>) => {
    if ('ended' in gameState) return { action: 'walk-away' as const, reason: 'ended' };
    if (gameState.phase === 'bet') {
      const reason = walkAwayReason({ chips: gameState.chips, startingChips: session.startingChips, tableMinBet: gameState.tableMinBet, handsPlayed: session.handsPlayed }, persona, rng);
      if (reason !== null) return { action: 'walk-away' as const, reason };
      const bet = betSize({ chips: gameState.chips, tableMinBet: gameState.tableMinBet, tableMaxBet: Math.min(gameState.tableMaxBet, gameState.chips), recentOutcomes: session.recentOutcomes }, persona, rng);
      return { kind: 'deal', bet };
    }
    if (gameState.phase === 'next-hand') return { kind: 'next-hand' };
    const decision = blackjackPolicy({ playerRanks: gameState.playerRanks, upcardRank: gameState.upcardRank, composition: gameState.composition, options: gameState.options, recentOutcomes: session.recentOutcomes }, persona, rng);
    return { kind: 'hand-action', action: decision.action };
  };
}

function classifyBlackjackReaction(decision: { kind: string; bet?: number }, result: { settled: boolean; result?: string; payout?: number; bet?: number } | undefined) {
  if (decision.kind === 'deal') return 'bet-placed';
  if (result?.settled !== true || result.result === undefined) return null;
  if (result.result === 'push') return null;
  if (result.result === 'loss' || result.result === 'surrender') return 'loss';
  const multiple = (result.bet ?? 0) > 0 ? (result.payout ?? 0) / (result.bet as number) : 0;
  return multiple >= 3 ? 'win-big' : 'win-small';
}

// ── slots: in-process Transport + composed policy ──────────────────────────────────────────────

interface SlotsSession {
  readonly accountId: string;
  readonly table: SlotsTable;
}

type SlotsGameState =
  | { readonly phase: 'collect' }
  | { readonly phase: 'spin'; readonly chips: number; readonly betOptions: number[]; readonly paylineCount: number };

function betOptionsFor(minBetPerLine: number, maxBetPerLine: number): number[] {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const raw = steps.map((t) => Math.round(minBetPerLine + t * (maxBetPerLine - minBetPerLine)));
  return [...new Set(raw)].sort((a, b) => a - b);
}

function createSlotsTransport(economy: CasinoEconomy, tables: Map<string, SlotsTable>, onSettlement: (accountId: string, event: SlotsSettlement) => void) {
  return {
    connect(persona: Persona): SlotsSession {
      const accountId = economy.guestAccount(`cast:${persona.id}`);
      let table = tables.get(accountId);
      if (table === undefined) {
        table = new SlotsTable(economy, accountId, `cast-slots-${accountId}`, `cast:${persona.id}:reels`, undefined, undefined, (event) => onSettlement(accountId, event));
        tables.set(accountId, table);
      }
      return { accountId, table };
    },
    observe(session: SlotsSession): SlotsGameState {
      const state = session.table.publicState();
      if (state.actions.canCollect) return { phase: 'collect' };
      const status = economy.statusOf(session.accountId);
      return { phase: 'spin', chips: status.chips, betOptions: betOptionsFor(state.rules.minBetPerLine, state.rules.maxBetPerLine), paylineCount: state.rules.paylineCount };
    },
    sendIntent(session: SlotsSession, decision: { kind: string; bet?: number }) {
      const { table } = session;
      if (decision.kind === 'collect') {
        table.apply('collect');
        return { settled: false };
      }
      table.apply('spin', decision.bet);
      const result = table.publicState().lastResult;
      if (result === null) return { settled: false };
      return { settled: true, payout: result.totalPayout, bet: result.totalBet, jackpotHit: result.jackpotHit };
    },
    disconnect() {
      /* the machine persists across sessions, keyed by accountId — nothing to tear down */
    },
  };
}

/**
 * Slots' own wrinkle `blackjack`'s composed policy above doesn't have: `SlotsTable#spin` takes a
 * PER-LINE bet, but the real chip charge is `betPerLine * paylineCount` (see `slots/rules.mts`'s
 * `totalBetFor`) — `betOptions` are per-line denominations, so both the walk-away affordability
 * check and `chooseBet`'s own `chips` ceiling need the multiplier folded in, or a persona would
 * happily "afford" a per-line bet whose real total cost exceeds its chip stack (an actual bug this
 * module hit and fixed during development — see the git history for the reproduction: an
 * unconverted per-line comparison sent a persona into a `placeWager` exception on every single
 * spin, forever, since a freshly-funded stack always looked misleadingly affordable at face value).
 */
function makeSlotsPolicy(session: SessionState) {
  return (gameState: SlotsGameState, persona: Persona, rng: ReturnType<typeof makeSubRng>) => {
    if (gameState.phase === 'collect') return { kind: 'collect' };
    const minPerLine = gameState.betOptions[0] ?? 1;
    const trueMinTotalBet = minPerLine * gameState.paylineCount;
    const reason = walkAwayReason({ chips: gameState.chips, startingChips: session.startingChips, tableMinBet: trueMinTotalBet, handsPlayed: session.handsPlayed }, persona, rng);
    if (reason !== null) return { action: 'walk-away' as const, reason };
    const perLineChipsCeiling = Math.floor(gameState.chips / gameState.paylineCount);
    const bet = chooseBet({ betOptions: gameState.betOptions, chips: perLineChipsCeiling }, persona, rng);
    return { kind: 'spin', bet };
  };
}

function classifySlotsReaction(decision: { kind: string }, result: { settled: boolean; payout?: number; bet?: number; jackpotHit?: boolean } | undefined) {
  if (decision.kind !== 'spin' || result?.settled !== true) return null;
  return classifySpinOutcome({ payout: result.payout ?? 0, bet: result.bet ?? 0, jackpot: result.jackpotHit === true });
}

// ── the residency: one supervisor loop per on-duty persona ─────────────────────────────────────

const PACE_MULTIPLIER = 3; // stretches cast's own think/act pacing further — negligible CPU, real
// human-ish cadence on a real floor (see this module's own header, "Money realism")
const DORMANCY_POLL_MS = 5000;
const SESSION_COOLDOWN_MS = 8000;
const BLACKJACK_MIN_CHIPS = 100; // 20x the default ruleset's minBet (5) — see blackjack/rules.mts
const SLOTS_MIN_CHIPS = 200; // 10x the default ruleset's minBetPerLine(1) x paylineCount(20) — see slots/rules.mts

export interface CastResidencyOptions {
  readonly economy: CasinoEconomy;
  readonly floor: Floor;
  readonly rosterSize?: number;
  readonly now?: () => Date;
  /** Real `setTimeout`-backed by default; tests inject a fast/no-op sleep, matching
   *  `@red-cup-engineering/cast/runner`'s own test convention. */
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface CastResidencyHandle {
  readonly onDutyPersonaIds: readonly string[];
  readonly gameAssignments: ReadonlyMap<string, CastGame>;
  stop(): Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms).unref?.());

export function startCastResidency(options: CastResidencyOptions): CastResidencyHandle {
  const { economy, floor } = options;
  const nowFn = options.now ?? (() => new Date());
  const baseSleep = options.sleep ?? defaultSleep;
  const pacedSleep = (ms: number) => baseSleep(ms * PACE_MULTIPLIER);
  const dormancySleep = (ms: number) => baseSleep(ms);

  const onDutyIds = castOnDutyToday(nowFn(), options.rosterSize ?? 5);
  const gameAssignments = new Map<string, CastGame>(onDutyIds.map((id) => [id, castGameAssignment(nowFn(), id)]));

  const blackjackTables = new Map<string, BlackjackTable>();
  const slotsTables = new Map<string, SlotsTable>();

  function reportSettlement(accountId: string, event: BlackjackSettlement | SlotsSettlement): void {
    const personaId = personaIdForAccount(accountId);
    floor.reportSettlement(personaId !== null ? personaById(personaId).name : accountId, event);
  }

  const accountToPersona = new Map<string, string>();
  function personaIdForAccount(accountId: string): string | null {
    return accountToPersona.get(accountId) ?? null;
  }
  for (const id of onDutyIds) accountToPersona.set(economy.guestAccount(`cast:${id}`), id);

  const blackjackTransport = createBlackjackTransport(economy, blackjackTables, reportSettlement);
  const slotsTransport = createSlotsTransport(economy, slotsTables, reportSettlement);

  const activeSessions = new Map<string, { readonly runner: ReturnType<typeof createRunner>; readonly accountId: string }>();

  function situationForTier(tier: 'win' | 'big-win' | 'jackpot'): 'jackpot-witnessed' | 'win-big' | null {
    if (tier === 'jackpot') return 'jackpot-witnessed';
    if (tier === 'big-win') return 'win-big';
    return null;
  }

  const unsubscribeWin = floor.onWin((event) => {
    const situation = situationForTier(event.tier);
    if (situation === null) return;
    for (const [, session] of activeSessions) {
      if (session.accountId === event.actorId) continue; // never congratulate yourself
      session.runner.notify(situation, { peerName: event.actorName, amount: event.amount });
    }
  });

  let stopped = false;

  async function runOneSession(personaId: string, game: CastGame, sessionSeq: number): Promise<void> {
    const persona = personaById(personaId);
    const accountId = economy.guestAccount(`cast:${personaId}`);
    const minChips = game === 'blackjack' ? BLACKJACK_MIN_CHIPS : SLOTS_MIN_CHIPS;
    const funded = ensureFunded(economy, accountId, minChips);
    if (funded.chips < minChips) return; // can't afford to sit tonight — try again next cooldown

    const actorId = `cast:${personaId}`;
    floor.sitDown(actorId, persona.name, persona.avatar);
    floor.setZone(actorId, game as FloorZone);

    const sessionState: SessionState = { startingChips: funded.chips, handsPlayed: 0, recentOutcomes: [] };
    const transport = game === 'blackjack' ? blackjackTransport : slotsTransport;
    const policy = game === 'blackjack' ? makeBlackjackPolicy(sessionState) : makeSlotsPolicy(sessionState);
    const classifyReaction = game === 'blackjack' ? classifyBlackjackReaction : classifySlotsReaction;

    const runner = createRunner({
      persona,
      policy: policy as Parameters<typeof createRunner>[0]['policy'],
      transport,
      seed: `cast:${personaId}:session:${sessionSeq}`,
      toIntent: (decision: unknown) => decision,
      classifyReaction: classifyReaction as Parameters<typeof createRunner>[0]['classifyReaction'],
      dialogueContext: (decision: { bet?: number }, result: { payout?: number } | undefined) => ({ amount: result?.payout ?? decision.bet ?? '' }),
      sleep: pacedSleep,
    });
    activeSessions.set(personaId, { runner, accountId });

    try {
      for await (const event of runner.events()) {
        if (event.type === 'action') {
          const result = (event as { result?: { settled?: boolean; result?: string; payout?: number } }).result;
          if (result?.settled === true) {
            if (game === 'blackjack' && typeof result.result === 'string') recordOutcome(sessionState, toRecentOutcome(result.result));
            if (game === 'slots') recordOutcome(sessionState, (result.payout ?? 0) > 0 ? 'win' : 'loss');
          }
        }
        if (event.type === 'utterance') floor.broadcastDialogue(actorId, persona.name, (event as { text: string }).text);
        if (stopped || !floor.hasConnections()) runner.stop();
      }
    } finally {
      activeSessions.delete(personaId);
      floor.leave(actorId);
    }
  }

  async function supervise(personaId: string, game: CastGame): Promise<void> {
    let sessionSeq = 0;
    while (!stopped) {
      while (!stopped && !floor.hasConnections()) await dormancySleep(DORMANCY_POLL_MS);
      if (stopped) break;
      sessionSeq += 1;
      await runOneSession(personaId, game, sessionSeq);
      if (stopped) break;
      await dormancySleep(SESSION_COOLDOWN_MS);
    }
  }

  const supervisors = onDutyIds.map((id) => supervise(id, gameAssignments.get(id) as CastGame));

  async function stop(): Promise<void> {
    stopped = true;
    for (const [, session] of activeSessions) session.runner.stop();
    await Promise.all(supervisors);
    unsubscribeWin();
  }

  return { onDutyPersonaIds: onDutyIds, gameAssignments, stop };
}
