/**
 * engine.mts — Fair Spin as a `Cartridge`-shaped state machine. PRACTICE-ONLY, stated
 * structurally, not just in copy: `bankroll` is a plain in-state number that starts at
 * `STARTING_BANKROLL` and is never redeemable, never funded by, and never convertible to real
 * currency anywhere in this module (there is no field, intent, or code path here that touches a
 * payment provider — the whole game is one pure function of `(seed, intents)`, same as every
 * other cartridge in this fleet). See `manifest.mts`'s header for why `energy` is correctly
 * omitted from this game's manifest, not merely unset.
 *
 * Three intents, three different spend types (per `@red-cup-engineering/parlor-kernel/disclosure`'s
 * three-way classifier, matching `gambling-trainer-service`'s badge precedent): `'adjust-bet'`
 * is `'reversible'` (choosing a stake costs nothing and can be changed freely before spinning);
 * `'spin'` is `'terminal'` (once the reels land, that stake's outcome cannot be undone — the
 * defining property of "terminal" per house doctrine, not merely "has a cost" the way
 * `'reversible'` vs `'priced'` splits); `'new-session'` is `'reversible'` (a practice bankroll
 * reset is free by construction — nothing real was ever at stake to lose).
 *
 * Randomness: the house's per-intent-fresh-subseed pattern (`fixtures/pig-fixture.mjs`'s
 * documented `State` carries a counter, not a live `Rng`), extended one level for sessions —
 * `sessionNumber` increments on `'new-session'`, and every spin's sub-seed is
 * `${seed}:session:${sessionNumber}:spin:${spinCount}`, so replaying `(seed, intents)` from
 * scratch reproduces byte-identical spins across session resets too, matching
 * `gambling-trainer-service`'s `runNumber` precedent.
 */
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import { spinReels } from '@red-cup-engineering/parlor-kernel/reels';
import { createClassifier } from '@red-cup-engineering/parlor-kernel/disclosure';
import { REELS, payoutFor } from './data.mts';

export const GAME_ID = 'reels';
export const STARTING_BANKROLL = 100;
export const MIN_BET = 1;
export const MAX_BET = 10;

export const classify = createClassifier({
  'adjust-bet': 'reversible',
  spin: 'terminal',
  'new-session': 'reversible',
});

function assertBet(bet) {
  if (!Number.isInteger(bet) || bet < MIN_BET || bet > MAX_BET) {
    throw new RangeError(`reels: bet must be an integer in [${MIN_BET}, ${MAX_BET}] (got ${bet})`);
  }
}

/** Pure function of (seed, configId). `configId` is unused (Fair Spin has no variant configs
 *  yet) but accepted, matching every other cartridge's `createEngine(seed, configId)` shape. */
export function createEngine(seed) {
  return {
    seed,
    bankroll: STARTING_BANKROLL,
    bet: MIN_BET,
    sessionNumber: 0,
    spinCount: 0,
    history: [],
    ruined: false,
  };
}

/** Whether the current bankroll can no longer cover even the minimum bet — the practice-run
 *  equivalent of "ruined" (no real loss, but this session's run is over). */
function isRuined(bankroll) {
  return bankroll < MIN_BET;
}

export function applyIntent(state, intent) {
  switch (intent.kind) {
    case 'adjust-bet': {
      if (state.ruined) throw new TypeError('reels applyIntent: cannot adjust bet — this session is ruined, start a new session');
      assertBet(intent.bet);
      return { state: { ...state, bet: intent.bet }, events: [{ kind: 'bet-adjusted', bet: intent.bet }] };
    }
    case 'spin': {
      if (state.ruined) throw new TypeError('reels applyIntent: cannot spin — this session is ruined, start a new session');
      if (state.bet > state.bankroll) throw new TypeError('reels applyIntent: cannot spin — bet exceeds bankroll');
      const rng = makeRng(`${state.seed}:session:${state.sessionNumber}:spin:${state.spinCount}`);
      const symbols = spinReels(rng, REELS);
      const multiplier = payoutFor(symbols);
      const payout = multiplier * state.bet;
      const bankroll = state.bankroll - state.bet + payout;
      const ruined = isRuined(bankroll);
      const entry = { symbols, bet: state.bet, payout, bankrollAfter: bankroll };
      const history = [...state.history, entry];
      const events = [{ kind: 'spin-resolved', symbols, bet: state.bet, payout, bankrollAfter: bankroll }];
      if (ruined) events.push({ kind: 'ruin', bankroll });
      return {
        state: { ...state, bankroll, spinCount: state.spinCount + 1, history, ruined },
        events,
      };
    }
    case 'new-session': {
      return {
        state: {
          ...state,
          bankroll: STARTING_BANKROLL,
          bet: MIN_BET,
          sessionNumber: state.sessionNumber + 1,
          spinCount: 0,
          history: [],
          ruined: false,
        },
        events: [{ kind: 'session-started', sessionNumber: state.sessionNumber + 1 }],
      };
    }
    default:
      throw new TypeError(`reels applyIntent: unknown intent kind "${intent.kind}"`);
  }
}
