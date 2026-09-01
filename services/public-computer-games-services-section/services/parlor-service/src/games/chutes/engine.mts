/**
 * engine.mts — Chutes & Ladders as a `Cartridge`-shaped state machine, built from the parlor
 * kernel's own pieces (`@red-cup-engineering/parlor-kernel/seed`'s `makeRng`, `/dice`'s `rollDie`, `/board`'s
 * `resolveMove`), the same pattern `@red-cup-engineering/parlor-kernel/fixtures/pig-fixture` demonstrates:
 * `State` carries a monotonic `rollCount` instead of a live `Rng`, and each `roll` intent derives
 * a fresh per-roll sub-seed (`${seed}:roll:${rollCount}`) so replay from `(seed, intents)` alone
 * reproduces the exact same race every time.
 *
 * There is exactly one decision anywhere in this game, and it belongs to whoever configures the
 * race (how many players, which are "bots"), never to a player mid-race: **there is no strategy
 * in Chutes & Ladders.** A `'human'` and a `'bot'` player are handled by identical code —
 * `applyIntent`'s `'roll'` case does not branch on `player.kind` anywhere, because there is
 * nothing for it to decide differently. This is the game's own joke, made structurally true: the
 * "bot" is not an opponent with a policy, it is a die with a seating position. `engine.test.mts`
 * proves this directly by replaying the identical seed with every player relabeled `'bot'` and
 * confirming byte-identical race results to the same seed with every player `'human'`.
 */
import { makeRng } from '@red-cup-engineering/parlor-kernel/seed';
import { rollDie, rollLogEntry } from '@red-cup-engineering/parlor-kernel/dice';
import { resolveMove } from '@red-cup-engineering/parlor-kernel/board';
import { createChutesBoard } from './board.mts';

export const GAME_ID = 'chutes';
export const DIE_SIDES = 6;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;
export const PLAYER_KINDS = ['human', 'bot'];

/** Parse a configId of comma-separated player kinds ("human,bot,bot"), 1-4 entries, each
 *  `'human'` or `'bot'`. Defaults to `'human,bot'` (a one-human-one-bot race) when absent or
 *  empty, matching the pig-fixture default-config convention. */
export function parsePlayerConfig(configId) {
  const raw = configId !== undefined && configId.length > 0 ? configId : 'human,bot';
  const kinds = raw.split(',').map((s) => s.trim());
  if (kinds.length < MIN_PLAYERS || kinds.length > MAX_PLAYERS) {
    throw new RangeError(`parsePlayerConfig: player count must be ${MIN_PLAYERS}-${MAX_PLAYERS} (got ${kinds.length})`);
  }
  for (const kind of kinds) {
    if (!PLAYER_KINDS.includes(kind)) {
      throw new TypeError(`parsePlayerConfig: player kind "${kind}" must be one of ${PLAYER_KINDS.join('/')}`);
    }
  }
  return kinds;
}

function playerLabel(kind, index, kinds) {
  const ordinal = kinds.slice(0, index + 1).filter((k) => k === kind).length;
  return kind === 'human' ? (kinds.filter((k) => k === 'human').length > 1 ? `Player ${ordinal}` : 'You') : `Bot ${ordinal}`;
}

/** Pure function of (seed, configId). Identical arguments always produce byte-identical state. */
export function createEngine(seed, configId) {
  const kinds = parsePlayerConfig(configId);
  const board = createChutesBoard();
  const players = kinds.map((kind, i) => ({
    id: `p${i}`,
    kind,
    label: playerLabel(kind, i, kinds),
    position: 0,
    turnsTaken: 0,
    finished: false,
    finishTurn: null,
  }));
  return {
    seed,
    board,
    players,
    activePlayerIndex: 0,
    rollCount: 0,
    finishedOrder: [],
    gameOver: false,
  };
}

/** Advance `activePlayerIndex` to the next player who has not yet finished, wrapping around.
 *  If every player has finished, returns `-1` (the caller sets `gameOver`). */
function nextActivePlayer(players, fromIndex) {
  for (let step = 1; step <= players.length; step++) {
    const idx = (fromIndex + step) % players.length;
    if (!players[idx].finished) return idx;
  }
  return -1;
}

/** `{ kind: 'roll' }` — rolls one die for the active player (whether `'human'` or `'bot'` — the
 *  handling below never inspects `player.kind`), moves them via the kernel's `resolveMove`
 *  (chutes/ladders applied automatically), and advances to the next unfinished player. Throws if
 *  the race is already over — the face disables rolling once `state.gameOver` is true, so this
 *  is a defect-detector, not a UI-reachable path. */
export function applyIntent(state, intent) {
  switch (intent.kind) {
    case 'roll': {
      if (state.gameOver) {
        throw new TypeError('chutes applyIntent: cannot roll — the race is already over');
      }
      const rng = makeRng(`${state.seed}:roll:${state.rollCount}`);
      const pip = rollDie(rng, DIE_SIDES);
      const rollEvent = rollLogEntry([pip], DIE_SIDES);

      const activeIndex = state.activePlayerIndex;
      const player = state.players[activeIndex];
      const move = resolveMove(state.board, player.position, pip);
      const finished = move.landedAt === state.board.size;

      const updatedPlayer = {
        ...player,
        position: move.landedAt,
        turnsTaken: player.turnsTaken + 1,
        finished,
        finishTurn: finished ? player.turnsTaken + 1 : null,
      };
      const players = state.players.map((p, i) => (i === activeIndex ? updatedPlayer : p));
      const finishedOrder = finished ? [...state.finishedOrder, player.id] : state.finishedOrder;

      const events = [
        rollEvent,
        { kind: 'move', playerId: player.id, from: move.from, to: move.landedAt, jumped: move.jumped, jumpKind: move.jumpKind, path: move.path },
      ];
      if (finished) events.push({ kind: 'finished', playerId: player.id, turn: updatedPlayer.finishTurn, place: finishedOrder.length });

      const next = nextActivePlayer(players, activeIndex);
      const gameOver = next === -1;
      if (gameOver) events.push({ kind: 'race-over', finishedOrder });

      return {
        state: {
          ...state,
          players,
          rollCount: state.rollCount + 1,
          activePlayerIndex: gameOver ? activeIndex : next,
          finishedOrder,
          gameOver,
        },
        events,
      };
    }
    default:
      throw new TypeError(`chutes applyIntent: unknown intent kind "${intent.kind}"`);
  }
}

export function activePlayer(state) {
  return state.players[state.activePlayerIndex];
}
