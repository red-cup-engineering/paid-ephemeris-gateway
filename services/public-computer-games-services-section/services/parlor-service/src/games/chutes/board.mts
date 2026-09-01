/**
 * board.mts — the classic 100-square Chutes & Ladders board as pure data: nothing here but a
 * jump list handed to `@red-cup-engineering/parlor-kernel/board`'s `createBoard`. This is the game's
 * whole "board-as-graph showcase" claim made literal — `createChutesBoard()` is nine lines,
 * and every rule about how a chute or a ladder behaves lives in the kernel's `resolveMove`,
 * not duplicated here.
 *
 * `CLASSIC_JUMPS` is the commonly published US (Milton Bradley) 100-square layout — 9 ladders,
 * 10 chutes. Stated honestly: this is the widely-reproduced layout found across the many
 * open implementations of this public-domain game, not a claim of sourcing an official rules
 * document — a "silly board game" gets a "commonly published" board, not a citation.
 *
 * The `from`/`to` pairs below satisfy `createBoard`'s own construction invariants (checked at
 * import time, since `createChutesBoard` runs `createBoard` eagerly): no node is the `from` of
 * two jumps, no jump's `to` is itself a jump's `from` (chained jumps), and no jump touches the
 * start or goal node — `board.test.mts` re-derives this checklist independently as a safety net
 * against a typo in the table itself.
 */
import { createBoard } from '@red-cup-engineering/parlor-kernel/board';

export const BOARD_SIZE = 100;

/** Ladders: climbing up. */
export const LADDERS = [
  { from: 1, to: 38 },
  { from: 4, to: 14 },
  { from: 9, to: 31 },
  { from: 21, to: 42 },
  { from: 28, to: 84 },
  { from: 36, to: 44 },
  { from: 51, to: 67 },
  { from: 71, to: 91 },
  { from: 80, to: 100 },
];

/** Chutes: sliding down. */
export const CHUTES = [
  { from: 16, to: 6 },
  { from: 47, to: 26 },
  { from: 49, to: 11 },
  { from: 56, to: 53 },
  { from: 62, to: 19 },
  { from: 64, to: 60 },
  { from: 87, to: 24 },
  { from: 93, to: 73 },
  { from: 95, to: 75 },
  { from: 98, to: 78 },
];

export const CLASSIC_JUMPS = [...LADDERS, ...CHUTES];

/** Build the classic 100-square board graph. Called fresh by every consumer (engine, odds,
 *  tests) rather than sharing one module-level singleton — `createBoard`'s result is a frozen
 *  plain object anyway, so there is no real cost to rebuilding it, and no risk of one caller's
 *  reference tricking another into believing a board was mutated. */
export function createChutesBoard() {
  return createBoard(BOARD_SIZE, CLASSIC_JUMPS);
}
