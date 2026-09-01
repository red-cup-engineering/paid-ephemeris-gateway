/**
 * `progression` — unlocks, best-star bookkeeping, and the Lattice Garden trophy case.
 *
 * v1 ships 60 levels (`DESIGN.md`), 20 per chapter, chapters mapping 1:1 onto tilings in
 * arrival order: chapter 0 = square, 1 = hex, 2 = rhombille. This module doesn't import
 * `levels.mts` — the chapter/level arithmetic below (20-per-chapter, 60 total) is fixed by
 * that same v1 scope line, so it's reproduced here as plain constants rather than reaching
 * into another module's generated ladder for a fact that doesn't change level-to-level. If
 * the ladder ever grows unevenly per chapter, these constants are the one place to widen.
 *
 * `applyResult` is the single place a finished run's `LevelResult` turns into a durable
 * `PlayerMeta`: the streak/reward math is delegated straight to `economy.mts` (this module
 * owns *what levels means*, not *what a win is worth*), stars are recorded max-wise so a
 * lower-star repeat clear can never erase a better one, and completing every level of a
 * chapter — the 20th distinct level to earn any star at all — mints that chapter's Lattice
 * Garden trophy piece exactly once.
 */
import type { BoosterKind, LevelResult, PlayerMeta, TilingKind } from './types.mts';
import { applyStreak, winReward } from './economy.mts';

/** Total levels in the v1 ladder (ids 1..60). */
export const TOTAL_LEVELS = 60;

/** Levels per chapter. */
export const LEVELS_PER_CHAPTER = 20;

/** Chapter index -> tiling, in arrival order. The Lattice Garden trophy piece name per chapter. */
export const CHAPTER_TILINGS: readonly TilingKind[] = ['square', 'hex', 'rhombille'];

/**
 * Saga-map checkpoint spacing (TILESLOTS-DESIGN.md §4.1's branch-node positions, §4.4's
 * earnable-booster trigger) — every 5th level within a chapter (local positions 5, 10, 15, 20)
 * is a checkpoint. The map's visual/navigational branch structure is a client-only concern
 * (§4.1's own framing: "the map itself needn't be tiling-dependent"); what's implemented here
 * is §4.4's reward half, scoped down from a rejoin-node grant to a first-clear-of-checkpoint
 * grant so it needs no new level ids or unlock-rule branching — same trigger cadence, same
 * bounded `BoosterKind` grant shape, zero new solvability/validation surface.
 */
const CHECKPOINT_INTERVAL = 5;

/** Every earnable booster kind, in a fixed order used only to pick which one a checkpoint grants. */
const BOOSTER_KINDS: readonly BoosterKind[] = ['hammer', 'shuffle', 'extraMoves', 'prismStart'];

/** 0-based chapter index for a level id (levels are 1-indexed, ids 1..60). */
export function chapterOf(levelId: number): number {
  return Math.floor((levelId - 1) / LEVELS_PER_CHAPTER);
}

/** 1-based position of `levelId` within its own chapter (1..LEVELS_PER_CHAPTER). */
function levelInChapter(levelId: number): number {
  return levelId - chapterOf(levelId) * LEVELS_PER_CHAPTER;
}

/**
 * Which booster a checkpoint clear grants. Deterministic-by-id, not random — matching the
 * rest of the repo's determinism doctrine (replays and tests must be exact) and sidestepping
 * the need for an RNG dependency this module otherwise has no use for.
 */
function checkpointBooster(levelId: number): BoosterKind {
  return BOOSTER_KINDS[levelId % BOOSTER_KINDS.length] ?? 'hammer';
}

/** The (inclusive) level id range for a chapter index. */
function chapterRange(chapter: number): { first: number; last: number } {
  const first = chapter * LEVELS_PER_CHAPTER + 1;
  return { first, last: first + LEVELS_PER_CHAPTER - 1 };
}

/** Whether every level in `chapter` has been won at least once (any star count > 0). */
function isChapterComplete(stars: Readonly<Record<number, 0 | 1 | 2 | 3>>, chapter: number): boolean {
  const { first, last } = chapterRange(chapter);
  for (let id = first; id <= last; id++) {
    if ((stars[id] ?? 0) <= 0) return false;
  }
  return true;
}

/** A level is playable once its id is at or below the player's unlocked frontier. */
export function isUnlocked(meta: PlayerMeta, levelId: number): boolean {
  return levelId <= meta.unlocked;
}

/** Sum of best-ever stars across every level the player has cleared. */
export function totalStars(meta: PlayerMeta): number {
  let total = 0;
  for (const stars of Object.values(meta.stars)) total += stars;
  return total;
}

/** The Lattice Garden trophy pieces earned so far (one per completed chapter, in earn order). */
export function gardenPieces(meta: PlayerMeta): readonly string[] {
  return meta.garden;
}

/**
 * Fold a finished level's result into the player's persistent meta:
 *  - streak advances/resets via `economy.applyStreak` (the source of truth for streak math);
 *  - on a loss, that's the only change — no unlock, no stars, no reward, no garden check;
 *  - on a win, stars for this level are recorded max-wise, the next level id unlocks (capped
 *    at `TOTAL_LEVELS`), the shard/prism reward is credited (the prism half of `winReward`
 *    only lands when this win is this level's *first* 3-star clear — the "first-clear" gate
 *    `economy.winReward` itself can't apply, since it has no memory of prior bests), and if
 *    this win completed every level of its chapter for the first time, that chapter's Lattice
 *    Garden trophy piece is minted.
 *
 * On top of that: a level's very first win, if it lands on a checkpoint position (§4.4), mints
 * one booster of a deterministic kind — the saga map's earnable-booster path, entirely separate
 * from the shard/prism spend economy (`economy.mts` untouched by this).
 *
 * `now` is accepted (not read for any decision here) to keep the signature symmetric with
 * every other injected-time boundary in the economy/progression pair — `scene.mts` always has
 * a `now` in hand when a run finishes and this is where that finish lands.
 */
export function applyResult(meta: PlayerMeta, result: LevelResult, now: number): PlayerMeta {
  const streaked = applyStreak(meta, result.won);
  if (!result.won) return streaked;

  const prevStars = streaked.stars[result.levelId] ?? 0;
  const isFirstClear = prevStars === 0;
  const isFirstThreeStarClear = result.stars === 3 && prevStars < 3;
  const stars =
    result.stars > prevStars ? { ...streaked.stars, [result.levelId]: result.stars } : streaked.stars;

  const unlocked = Math.max(streaked.unlocked, Math.min(TOTAL_LEVELS, result.levelId + 1));

  const reward = winReward(result, streaked.streak);
  const wallet = {
    shards: streaked.wallet.shards + reward.shards,
    prisms: streaked.wallet.prisms + (isFirstThreeStarClear ? reward.prisms : 0),
  };

  const isCheckpoint = levelInChapter(result.levelId) % CHECKPOINT_INTERVAL === 0;
  const boosters =
    isCheckpoint && isFirstClear
      ? (() => {
          const kind = checkpointBooster(result.levelId);
          return { ...streaked.boosters, [kind]: streaked.boosters[kind] + 1 };
        })()
      : streaked.boosters;

  const chapter = chapterOf(result.levelId);
  const tiling = CHAPTER_TILINGS[chapter];
  const garden =
    tiling !== undefined && !streaked.garden.includes(tiling) && isChapterComplete(stars, chapter)
      ? [...streaked.garden, tiling]
      : streaked.garden;

  return { ...streaked, stars, unlocked, wallet, boosters, garden };
}
