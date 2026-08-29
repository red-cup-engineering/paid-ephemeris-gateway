/**
 * `levels` test suite.
 *
 * NOTE (pre-integration): `levels.mts` imports `tiling.mts` (already landed) and
 * `validate.mts` (already landed, but `validate.mts` itself imports `engine.mts`, which is
 * being written in parallel by a sibling agent and may not exist yet at the time this file
 * is first run). If `engine.mts` is missing, `node --test` fails to even load this module —
 * that failure is EXPECTED pre-integration and is not a defect in `levels.mts`. Re-run once
 * `engine.mts` lands; every case below (including the heavy `validateLevel` sweep) is
 * written to run as soon as that import resolves, no changes needed on this side.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  goalProgressFrom,
  levelById,
  rateLevel,
  starThresholds,
} from './levels.mts';
import { validateLevel } from './validate.mts';
import type { CascadeStep, LevelSpec, Tile } from './types.mts';

const CHAPTER_TILINGS = ['square', 'hex', 'rhombille'] as const;

test('LEVELS has exactly 60 entries', () => {
  assert.equal(LEVELS.length, 60);
});

test('ids are 1..60, dense and in order', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    Array.from({ length: 60 }, (_, i) => i + 1),
  );
});

test('chapters and tilings line up: 0/1/2 = square/hex/rhombille, 20 each', () => {
  for (const spec of LEVELS) {
    const expectedChapter = Math.floor((spec.id - 1) / 20);
    assert.equal(spec.chapter, expectedChapter, `level ${spec.id} chapter`);
    assert.equal(spec.tiling, CHAPTER_TILINGS[expectedChapter], `level ${spec.id} tiling`);
  }
  for (let chapter = 0; chapter < 3; chapter++) {
    const inChapter = LEVELS.filter((l) => l.chapter === chapter);
    assert.equal(inChapter.length, 20, `chapter ${chapter} level count`);
  }
});

test('levelById is the inverse of id, and misses return undefined', () => {
  for (const spec of LEVELS) {
    assert.equal(levelById(spec.id), spec);
  }
  assert.equal(levelById(0), undefined);
  assert.equal(levelById(61), undefined);
  assert.equal(levelById(-3), undefined);
});

test('moves stay within the 18-30 sensible budget', () => {
  for (const spec of LEVELS) {
    assert.ok(spec.moves >= 18 && spec.moves <= 30, `level ${spec.id} moves ${spec.moves}`);
  }
});

test('blocker kinds only appear once unlocked (moss 3, frost 6, cage 10, geode 14 within chapter)', () => {
  const unlockAt: Record<string, number> = { moss: 3, frost: 6, cage: 10, geode: 14 };
  for (const spec of LEVELS) {
    const levelInChapter = spec.id - spec.chapter * 20;
    for (const b of spec.blockers) {
      const at = unlockAt[b.kind] ?? Infinity;
      assert.ok(
        levelInChapter >= at,
        `level ${spec.id} (in-chapter ${levelInChapter}) has ${b.kind}, unlocked at ${at}`,
      );
    }
  }
});

test('meanCoordination ramps monotone-ish (allow ties) within each chapter, 0.5 -> 2.4 territory', () => {
  for (let chapter = 0; chapter < 3; chapter++) {
    const inChapter = LEVELS.filter((l) => l.chapter === chapter).sort((a, b) => a.id - b.id);
    for (let i = 1; i < inChapter.length; i++) {
      const prev = inChapter[i - 1] as LevelSpec;
      const cur = inChapter[i] as LevelSpec;
      assert.ok(
        cur.meanCoordination >= prev.meanCoordination - 1e-9,
        `chapter ${chapter} level-in-chapter ${i + 1} regressed: ${cur.meanCoordination} < ${prev.meanCoordination}`,
      );
    }
    const last = inChapter[inChapter.length - 1] as LevelSpec;
    assert.ok(last.meanCoordination > 0, `chapter ${chapter} never ramps above 0`);
    // The ramp targets 2.4 (Phillips-Thorpe isostatic point) but the generator's search
    // picks the closest reachable blocker layout, not an exact hit, so a small overshoot is
    // expected and fine — this just guards against landing wildly past the target.
    assert.ok(last.meanCoordination <= 2.4 + 0.25, `chapter ${chapter} overshoots the isostatic point by a lot`);
  }
});

test('goals only reference achievable targets given each level\'s own blockers/palette', () => {
  for (const spec of LEVELS) {
    const mossCount = spec.blockers.filter((b) => b.kind === 'moss').length;
    const geodeCount = spec.blockers.filter((b) => b.kind === 'geode').length;
    for (const g of spec.goals) {
      if (g.kind === 'collectColor') {
        assert.ok(g.color !== undefined && g.color >= 0 && g.color < spec.paletteSize, `level ${spec.id} collectColor color`);
      }
      if (g.kind === 'clearMoss') assert.ok(g.target <= mossCount, `level ${spec.id} clearMoss target`);
      if (g.kind === 'breakGeodes') assert.ok(g.target <= geodeCount, `level ${spec.id} breakGeodes target`);
      assert.ok(g.target > 0, `level ${spec.id} ${g.kind} target must be positive`);
    }
    assert.ok(spec.goals.length > 0, `level ${spec.id} has no goals`);
  }
});

test('goals mix all four kinds across the ladder', () => {
  const seen = new Set(LEVELS.flatMap((l) => l.goals.map((g) => g.kind)));
  for (const kind of ['score', 'clearMoss', 'breakGeodes', 'collectColor']) {
    assert.ok(seen.has(kind), `no level ever uses goal kind ${kind}`);
  }
});

test('starThresholds is a strictly increasing triple', () => {
  for (const spec of LEVELS) {
    const [one, two, three] = starThresholds(spec);
    assert.ok(one > 0 && two > one && three > two, `level ${spec.id} thresholds ${one},${two},${three}`);
  }
});

test('rateLevel: a loss is always 0 stars regardless of score', () => {
  const spec = LEVELS[0] as LevelSpec;
  const result = rateLevel(spec, 999_999, 0, false, false);
  assert.equal(result.won, false);
  assert.equal(result.stars, 0);
  assert.equal(result.levelId, spec.id);
});

test('rateLevel: a win always banks at least 1 star, and stars climb with score', () => {
  const spec = LEVELS[0] as LevelSpec;
  const [one, two, three] = starThresholds(spec);
  assert.equal(rateLevel(spec, 0, 5, true, false).stars, 1);
  assert.equal(rateLevel(spec, one, 5, true, false).stars, 1);
  assert.equal(rateLevel(spec, two, 5, true, false).stars, 2);
  assert.equal(rateLevel(spec, three, 5, true, false).stars, 3);
});

test('rateLevel carries movesLeft/chaosSix/score through untouched', () => {
  const spec = LEVELS[0] as LevelSpec;
  const result = rateLevel(spec, 42, 7, true, true);
  assert.equal(result.movesLeft, 7);
  assert.equal(result.chaosSix, true);
  assert.equal(result.score, 42);
});

test('goalProgressFrom: score sums across steps', () => {
  const steps: CascadeStep[] = [
    step({ score: 10 }),
    step({ score: 25 }),
  ];
  const deltas = goalProgressFrom(steps, []);
  assert.equal(deltas.score, 35);
});

test('goalProgressFrom: clearMoss counts distinct moss cells across steps', () => {
  const steps: CascadeStep[] = [
    step({ mossCleared: [1, 2] }),
    step({ mossCleared: [2, 3] }), // cell 2 repeated should not double-count
  ];
  const deltas = goalProgressFrom(steps, []);
  assert.equal(deltas.clearMoss, 3);
});

test('goalProgressFrom: breakGeodes only counts cells whose cumulative hits reach starting hp', () => {
  const tilesBefore: Tile[] = [
    blankTile(), // cell 0: not a geode
    { ...blankTile(), geode: 2 }, // cell 1: needs 2 hits
    { ...blankTile(), geode: 3 }, // cell 2: needs 3 hits
  ];
  const steps: CascadeStep[] = [
    step({ geodeHit: [1, 2] }),
    step({ geodeHit: [1, 2] }), // cell 1 now at 2/2 (broken), cell 2 at 2/3 (not yet)
  ];
  const deltas = goalProgressFrom(steps, tilesBefore);
  assert.equal(deltas.breakGeodes, 1);
});

test('goalProgressFrom: collectColor tallies cleared tiles by their pre-move color', () => {
  const tilesBefore: Tile[] = [
    { ...blankTile(), color: 0 },
    { ...blankTile(), color: 0 },
    { ...blankTile(), color: 2 },
    { ...blankTile(), geode: 1, color: 3 }, // geode: not a color-collectible clear
  ];
  const steps: CascadeStep[] = [step({ cleared: [0, 1, 2, 3] })];
  const deltas = goalProgressFrom(steps, tilesBefore);
  assert.deepEqual(deltas.collectColor, { 0: 2, 2: 1 });
});

test('every one of the 60 levels passes validateLevel', () => {
  const problems: string[] = [];
  for (const spec of LEVELS) {
    const report = validateLevel(spec);
    if (!report.ok) problems.push(`level ${spec.id}: ${report.problems.join('; ')}`);
  }
  assert.deepEqual(problems, []);
});

// ——— fixtures ———

function blankTile(): Tile {
  return { color: 0, special: 'none', moss: false, frost: false, cage: false, geode: 0 };
}

function step(overrides: Partial<CascadeStep>): CascadeStep {
  return {
    matches: [],
    cleared: [],
    fired: [],
    mossCleared: [],
    frostBroken: [],
    cageBroken: [],
    geodeHit: [],
    falls: [],
    spawned: [],
    score: 0,
    ...overrides,
  };
}
