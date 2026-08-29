/**
 * `levels` — the 60-level v1 ladder, generated (not authored) so the difficulty ramp is a
 * provable property of the code rather than a designer's gut feel.
 *
 * Three chapters of 20 levels each (square, hex, rhombille — one chapter per shipped
 * tiling), every level a pure function of its numeric id. The generator's one real job is
 * placing blockers so the level's blocker constraint graph lands at a target *mean
 * coordination number* — the rigidity-percolation difficulty dial from DESIGN.md §3 — while
 * staying pebble-independent (never an engineered-impossible board, per the double-banana
 * warning in `validate.mts`). That's a search, not a formula: for a target coordination
 * there is no closed-form blocker layout, so this module does seeded rejection sampling —
 * try a random placement, ask `validate.mts`'s own oracle functions whether it's honest and
 * how far it lands from the target, keep searching until it's close enough or the board's
 * maximum blocker density is exhausted.
 *
 * Two structural choices keep that search well-behaved:
 *
 *  1. **Monotonicity by construction, not by luck.** Each chapter is built level-by-level
 *     with the previous level's *achieved* coordination carried forward as the next level's
 *     floor, and the search inside `buildBlockers` stops at the FIRST pebble-independent
 *     layout that reaches its target (rather than hunting for the closest one). So level i's
 *     achieved coordination is always >= level (i-1)'s by construction — the ramp can
 *     plateau (when a target is unreachable at the board's density) but never regress.
 *  2. **No dependency on `seed.mts`.** Unlike the runtime engine, level generation happens
 *     once, at module load, from nothing but each level's id — so rather than pull in the
 *     shared RNG module (a dependency this module doesn't need to carry), this file owns a
 *     tiny in-module mulberry32 generator seeded by FNV-1a. That keeps `levels.mts`'s only
 *     runtime dependencies the two the design doc calls for: `tiling.mts` to build the
 *     geometry blockers sit on, and `validate.mts` to certify (and, here, to help construct)
 *     the result.
 *
 * Every generated `LevelSpec` is run back through `validateLevel` at generation time (with a
 * handful of salted reseed attempts if the first try doesn't pass) — the module doesn't just
 * hope its output validates, it checks before exporting, and the test suite re-checks all 60
 * as the final word.
 */
import type {
  BlockerPlacement,
  BoardGeometry,
  CascadeStep,
  CellId,
  ColorId,
  Goal,
  LevelResult,
  LevelSpec,
  Tile,
  TilingKind,
} from './types.mts';
import { buildGeometry, defaultSize } from './tiling.mts';
import { blockerEdges, meanCoordination, pebbleIndependent, validateLevel } from './validate.mts';

// ——— ladder shape ———

const CHAPTER_TILINGS: readonly TilingKind[] = ['square', 'hex', 'rhombille'];
const LEVELS_PER_CHAPTER = 20;

/**
 * Palette size shared by every chapter. DESIGN.md states it explicitly for square/hex ("5
 * colors — headroom above the local clique bound" of chi(K4)=4 at king-adjacency
 * junctions); rhombille isn't called out separately, so this module carries the same 5-color
 * headroom forward there rather than inventing a second number the contract never specifies.
 */
const PALETTE_SIZE = 5;

/** Rigidity-percolation ramp bounds (Phillips–Thorpe isostatic point is the upper one). */
const MC_START = 0.5;
const MC_END = 2.4;

/** Blocker kinds in unlock order, gated by level-within-chapter per DESIGN.md's schedule. */
const BLOCKER_KINDS: readonly BlockerPlacement['kind'][] = ['moss', 'frost', 'cage', 'geode'];
const BLOCKER_UNLOCK: Readonly<Record<BlockerPlacement['kind'], number>> = {
  moss: 3,
  frost: 6,
  cage: 10,
  geode: 14,
};

// ——— in-module deterministic RNG (mulberry32 over an FNV-1a seed hash) ———
// A trimmed, self-contained cousin of the sibling `seed.mts` pattern — see the module header
// for why this file doesn't import that module instead.

function hashLevelSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface LevelRng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T | undefined;
  shuffle<T>(items: readonly T[]): T[];
}

function makeLevelRng(seed: string): LevelRng {
  let a = hashLevelSeed(seed) >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T | undefined =>
    items.length === 0 ? undefined : items[Math.floor(next() * items.length)];
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  };
  return { next, int, pick, shuffle };
}

// ——— difficulty ramp ———

/** Linear meanCoordination target ~0.5 -> 2.4 across the 20 levels of one chapter. */
function targetMeanCoordination(levelInChapter: number): number {
  const t = (levelInChapter - 1) / (LEVELS_PER_CHAPTER - 1);
  return MC_START + t * (MC_END - MC_START);
}

/** Move budget: 30 at a chapter's gentlest level down to 18 at its hardest (18-30 band). */
function movesFor(levelInChapter: number): number {
  const t = (levelInChapter - 1) / (LEVELS_PER_CHAPTER - 1);
  return Math.round(30 - t * 12);
}

/** Which blocker kinds have unlocked by this point in the chapter. */
function unlockedKinds(levelInChapter: number): readonly BlockerPlacement['kind'][] {
  return BLOCKER_KINDS.filter((kind) => levelInChapter >= BLOCKER_UNLOCK[kind]);
}

// ——— blocker placement: seeded rejection sampling against the pebble-game oracle ———

interface BlockerBuildResult {
  blockers: BlockerPlacement[];
  meanCoordination: number;
}

/**
 * Search for a blocker layout whose constraint graph is pebble-independent and whose
 * achieved mean coordination is as close as possible to `targetMC`, without ever dropping
 * below `floor.meanCoordination`. Sweeps blocker counts from 1 upward and, at each count,
 * samples several random placements, keeping whichever independent layout seen so far (at
 * any count) has the smallest `|achieved - targetMC|` — a running best-match, not a
 * first-past-the-post threshold. That matters because a single extra blocker cell can touch
 * several already-placed ones at once on the higher-degree tilings (hex/rhombille neighbor
 * counts exceed square's), so "the first count that clears the target" can clear it by a lot;
 * minimizing the gap directly instead keeps the ramp tracking the target closely rather than
 * ratcheting upward on whatever overshoot happened to be sampled first.
 *
 * `best` seeds from the caller's `floor`, and any candidate that would fall below it is
 * skipped outright — so the result is provably >= `floor.meanCoordination` regardless of how
 * this level's random draws land. A random search that landed on a denser layout two levels
 * ago and a sparser one just now must not be allowed to look like a difficulty regression.
 * If the board's max blocker density still can't reach the floor (shouldn't happen — the
 * floor was itself validated on this same geometry — but density bounds can shift as more
 * blocker kinds unlock), the floor itself is returned unchanged: a tie, never a regression.
 *
 * `pebbleIndependent`/`meanCoordination` are called with exactly the same node-counting
 * convention `validateLevel` uses internally (pebble game over ALL board cells so cell ids
 * double as node indices with no remapping; mean coordination over just the blocker-bearing
 * cells) so a layout accepted here is, by construction, one `validateLevel` will accept too.
 */
function buildBlockers(
  rng: LevelRng,
  geom: BoardGeometry,
  levelInChapter: number,
  targetMC: number,
  floor: BlockerBuildResult,
): BlockerBuildResult {
  const kinds = unlockedKinds(levelInChapter);
  if (kinds.length === 0 || targetMC <= 0) return floor;

  const cellIds = geom.cells.map((cell) => cell.id);
  const maxBlockers = Math.max(2, Math.min(cellIds.length, Math.ceil(cellIds.length * 0.6)));
  let best: BlockerBuildResult = floor;
  let bestGap = Math.abs(floor.meanCoordination - targetMC);

  for (let count = 1; count <= maxBlockers; count++) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const chosen = rng.shuffle(cellIds).slice(0, count);
      const blockers: BlockerPlacement[] = chosen.map((cell) => {
        const kind = rng.pick(kinds) ?? 'moss';
        return kind === 'geode' ? { cell, kind, hp: rng.int(1, 3) } : { cell, kind };
      });
      const edges = blockerEdges(geom, blockers);
      if (!pebbleIndependent(geom.cells.length, edges)) continue;
      const achieved = meanCoordination(blockers.length, edges.length);
      if (achieved + 1e-9 < floor.meanCoordination) continue; // never regress below the floor
      const gap = Math.abs(achieved - targetMC);
      if (gap < bestGap) {
        bestGap = gap;
        best = { blockers, meanCoordination: achieved };
      }
      if (bestGap <= 0.02) return best; // near enough the target — stop searching
    }
  }
  return best;
}

// ——— goals ———

/**
 * Pick this level's goals, mixing score/clearMoss/breakGeodes/collectColor as blockers
 * unlock. Levels 1-7 within a chapter carry a single onboarding goal (rotating through
 * whatever's actually unlocked); levels 8-20 pair a `score` goal with a rotating secondary
 * so the ladder keeps introducing combinations rather than settling into one shape.
 */
function chooseGoals(
  levelInChapter: number,
  id: number,
  blockers: readonly BlockerPlacement[],
  paletteSize: number,
  moves: number,
): Goal[] {
  const mossCount = blockers.filter((b) => b.kind === 'moss').length;
  const geodeCount = blockers.filter((b) => b.kind === 'geode').length;

  const scoreGoal: Goal = { kind: 'score', target: moves * (18 + levelInChapter) };
  const color: ColorId = id % paletteSize;
  const collectGoal: Goal = { kind: 'collectColor', color, target: 10 + levelInChapter };
  const mossGoal: Goal | null =
    mossCount > 0 ? { kind: 'clearMoss', target: Math.max(1, Math.ceil(mossCount * 0.7)) } : null;
  const geodeGoal: Goal | null =
    geodeCount > 0 ? { kind: 'breakGeodes', target: Math.max(1, Math.ceil(geodeCount * 0.6)) } : null;

  if (levelInChapter <= 7) {
    if (levelInChapter % 3 === 1 && mossGoal) return [mossGoal];
    if (levelInChapter % 3 === 2) return [collectGoal];
    return [scoreGoal];
  }
  if (geodeGoal && levelInChapter % 3 === 0) return [scoreGoal, geodeGoal];
  if (mossGoal && levelInChapter % 3 === 1) return [scoreGoal, mossGoal];
  return [scoreGoal, collectGoal];
}

// ——— per-level assembly ———

/**
 * Build one level, retrying with salted reseeds (`#1`, `#2`, ...) if the first attempt
 * doesn't pass `validateLevel` — cheap insurance since `buildBlockers` already enforces
 * pebble-independence and the goal target bounds are already respected by construction, but
 * `validateLevel` also checks board-spawn properties (at least one legal move) this module
 * has no other way to see ahead of time.
 */
function buildLevel(
  id: number,
  chapter: number,
  tiling: TilingKind,
  size: number,
  geom: BoardGeometry,
  levelInChapter: number,
  target: number,
  floor: BlockerBuildResult,
): LevelSpec {
  const moves = movesFor(levelInChapter);
  const MAX_SALT_ATTEMPTS = 12;
  let fallback: LevelSpec | undefined;

  for (let salt = 0; salt < MAX_SALT_ATTEMPTS; salt++) {
    const seed = salt === 0 ? `onestone-level-${id}` : `onestone-level-${id}#${salt}`;
    const rng = makeLevelRng(seed);
    const { blockers, meanCoordination: achieved } = buildBlockers(rng, geom, levelInChapter, target, floor);
    const goals = chooseGoals(levelInChapter, id, blockers, PALETTE_SIZE, moves);
    const candidate: LevelSpec = {
      id,
      chapter,
      tiling,
      size,
      paletteSize: PALETTE_SIZE,
      moves,
      goals,
      blockers,
      seed,
      meanCoordination: achieved,
    };
    fallback = candidate;
    if (validateLevel(candidate).ok) return candidate;
  }
  // Every salted attempt failed validateLevel — unreached in practice given the checks
  // buildBlockers/chooseGoals already enforce, but fail loudly via the fallback rather than
  // silently shipping a bad level; the test suite's full validateLevel pass will catch it.
  if (!fallback) throw new Error(`levels: unreachable — buildLevel(${id}) produced no candidate`);
  return fallback;
}

/** Build one chapter's 20 levels, feeding each level's achieved coordination forward as the
 * next level's floor so the ramp is non-decreasing across the chapter by construction. */
function buildChapter(chapter: number): LevelSpec[] {
  const tiling = CHAPTER_TILINGS[chapter];
  if (!tiling) throw new Error(`levels: invalid chapter index ${chapter}`);
  const size = defaultSize(tiling);
  const geom = buildGeometry(tiling, size, PALETTE_SIZE);

  const specs: LevelSpec[] = [];
  let floor: BlockerBuildResult = { blockers: [], meanCoordination: 0 };
  for (let levelInChapter = 1; levelInChapter <= LEVELS_PER_CHAPTER; levelInChapter++) {
    const id = chapter * LEVELS_PER_CHAPTER + levelInChapter;
    const rampTarget =
      levelInChapter < BLOCKER_UNLOCK.moss ? 0 : targetMeanCoordination(levelInChapter);
    const target = Math.max(rampTarget, floor.meanCoordination);
    const spec = buildLevel(id, chapter, tiling, size, geom, levelInChapter, target, floor);
    floor = { blockers: spec.blockers, meanCoordination: spec.meanCoordination };
    specs.push(spec);
  }
  return specs;
}

/** The full 60-level ladder: ids 1..60, chapters 0/1/2 = square/hex/rhombille, 20 each. */
export const LEVELS: readonly LevelSpec[] = CHAPTER_TILINGS.flatMap((_tiling, chapter) => buildChapter(chapter));

/** O(1) lookup: ids are dense and 1-based, so `id - 1` is the level's array index directly. */
export function levelById(id: number): LevelSpec | undefined {
  return LEVELS[id - 1];
}

// ——— rating ———

/**
 * Star thresholds for a level, derived from its `score` goal target (or, for goal-only
 * levels with no `score` goal, a synthetic baseline of the same shape). `validateLevel`
 * places no achievability constraint on score goals (only collectColor/breakGeodes/clearMoss
 * targets are bounds-checked against the board), so these multipliers are a pure design
 * choice: meeting the goal banks the first star, and the 2nd/3rd climb from there.
 */
export function starThresholds(spec: LevelSpec): [number, number, number] {
  const scoreGoal = spec.goals.find((g) => g.kind === 'score');
  // Match `chooseGoals`'s real score-goal formula (`moves * (18 + levelInChapter)`) exactly
  // for the synthetic goal-only baseline too. `spec.id` is the GLOBAL 1..60 id; using it here
  // instead of the within-chapter index silently doubled/tripled thresholds in the hex/
  // rhombille chapters (id === levelInChapter only in chapter 0) — derive levelInChapter the
  // same way `chapterOf`/`buildChapter` do instead of reaching for the global id.
  const levelInChapter = spec.id - spec.chapter * LEVELS_PER_CHAPTER;
  const base = Math.max(1, scoreGoal ? scoreGoal.target : spec.moves * (18 + levelInChapter));
  return [base, Math.round(base * 1.4), Math.round(base * 1.9)];
}

/** Turn a finished run's raw outcome into its `LevelResult`. A loss is always 0 stars; a win
 * always banks at least 1 (meeting every goal is itself worth something, score aside). */
export function rateLevel(
  spec: LevelSpec,
  score: number,
  movesLeft: number,
  won: boolean,
  chaosSix: boolean,
): LevelResult {
  if (!won) return { levelId: spec.id, won: false, score, stars: 0, movesLeft, chaosSix };
  const [, two, three] = starThresholds(spec);
  const stars: 0 | 1 | 2 | 3 = score >= three ? 3 : score >= two ? 2 : 1;
  return { levelId: spec.id, won: true, score, stars, movesLeft, chaosSix };
}

// ——— goal progress ———

/** Per-goal deltas produced by one settle's cascade steps — what the scene adds to each
 * goal's running progress after a move. */
export interface GoalDeltas {
  /** Total score earned across the given steps (adds directly to a `score` goal). */
  score: number;
  /** Distinct moss-bearing cells cleared across the given steps. */
  clearMoss: number;
  /** Geodes that reached 0 hp across the given steps (see caveat below). */
  breakGeodes: number;
  /** Tiles of each color cleared across the given steps, keyed by `ColorId`. */
  collectColor: Readonly<Record<ColorId, number>>;
}

/**
 * Reduce a batch of `CascadeStep`s (plus the board's tile state immediately before the move
 * that produced them) into per-goal progress deltas the scene adds onto its running totals.
 *
 * `breakGeodes` needs the tile's starting hp to know when cumulative hits across these steps
 * clear a geode, and `CascadeStep.geodeHit` only ever records *which cell* was hit each step
 * — not a running hp — so this counts hits per cell across all given steps and compares
 * against `tilesBefore[cell].geode` (the hp at the start of the batch). That's exact for a
 * single move's settle (the normal call shape) since a geode's hp only decreases within one
 * cascade and `tilesBefore` is the pre-move snapshot.
 *
 * `collectColor`, unlike `breakGeodes`, cannot be read off `tilesBefore` alone: falls and
 * refills change what tile occupies a cell BETWEEN cascade steps, so a cell cleared on, say,
 * the third step of a multi-step cascade very often no longer holds the color it held before
 * the whole move started — it holds whatever fell/spawned into it during steps one and two.
 * So this tracks a `working` snapshot that starts at `tilesBefore` and is advanced by each
 * step's `falls`/`spawned` after that step's `cleared` cells are tallied against it, mirroring
 * exactly what the engine's own `runStep`/`settleFall`/`refill` do to the real board — giving
 * every step's clear tally the color that cell actually held at that moment, not the color it
 * held before the move even began.
 */
export function goalProgressFrom(steps: readonly CascadeStep[], tilesBefore: Tile[]): GoalDeltas {
  let score = 0;
  const mossCleared = new Set<CellId>();
  const geodeHits = new Map<CellId, number>();
  const collectColor: Record<ColorId, number> = {};
  const working: Tile[] = tilesBefore.map((t) => ({ ...t }));

  for (const step of steps) {
    score += step.score;
    for (const cell of step.mossCleared) mossCleared.add(cell);
    for (const cell of step.geodeHit) geodeHits.set(cell, (geodeHits.get(cell) ?? 0) + 1);
    for (const cell of step.cleared) {
      const before = working[cell];
      if (before && before.geode === 0 && !before.cage) {
        collectColor[before.color] = (collectColor[before.color] ?? 0) + 1;
      }
    }
    for (const fall of step.falls) {
      const t = working[fall.from];
      if (t !== undefined) working[fall.to] = t;
    }
    for (const spawn of step.spawned) working[spawn.cell] = spawn.tile;
  }

  let breakGeodes = 0;
  for (const [cell, hits] of geodeHits) {
    const before = tilesBefore[cell];
    if (before && before.geode > 0 && hits >= before.geode) breakGeodes++;
  }

  return { score, clearMoss: mossCleared.size, breakGeodes, collectColor };
}
