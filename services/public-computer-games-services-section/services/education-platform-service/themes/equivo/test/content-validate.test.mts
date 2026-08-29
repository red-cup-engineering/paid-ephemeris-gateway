/**
 * Curriculum content validation -- the build's central "wrong content cannot ship" gate. Compiles
 * the REAL `themes/equivo/corpus/` (not a fixture) through the REAL compiler and REAL checker
 * registry, then for every compiled exercise INDEPENDENTLY re-derives the actual answer straight
 * from `@lenticule-science/metrologic` (never by calling the checker to ask itself what its own answer is --
 * that would be circular) and asserts:
 *
 *   1. the independently-derived correct answer passes the exercise's real checker;
 *   2. a genuinely wrong answer fails it (the checker actually discriminates, not just accepts);
 *   3. every room meets the platform's gate minimum (self-education-platform-design.md §4);
 *   4. no `repair` exercise ships (equivo-design.md §8's MVP cut, enforced structurally, not just
 *      by policy);
 *   5. the unit's door graph is a genuine single-file progression (00 -> 01 -> ... -> 06), so the
 *      "30+ minute learning arc" claim is a graph property, not an assertion;
 *   6. the three MVP-in-scope presentation registers are honestly non-empty and the Lakotaean
 *      register is honestly fully-absent (equivo-design.md §6.3, re-checked at content build time,
 *      not only read once at authoring time).
 *
 * If a future corpus edit ever makes a spec malformed, ambiguous, or ungraded correctly, this
 * file fails -- that IS the guarantee "every exercise's answer verified by the math package at
 * test time" names.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { articulate, predicate, posit, settle } from '@lenticule-science/metrologic/bilattice';
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { settling, classify, h1 } from '@lenticule-science/metrologic/obstruction/settling';
import { buildEquivoWorld } from '../build-world.mts';
import { hydrateExercises, roomGateStatus, type GateExercise } from '../../../src/checker.mts';
import { equivoCheckers, MVP_KINDS } from '../registry.mts';
import { equivoRegisters, MVP_REGISTER_IDS } from '../registers/index.mts';
import { isFullyAbsent } from '../../../src/register.mts';
import type { DistinguishSpec, RelateSpec, MeasureSpec, SettleSpec, ObserveSpec } from '../registry.mts';

const world = buildEquivoWorld();
const { exercises, unregisteredKinds } = hydrateExercises(world.exercises, equivoCheckers);

// --- independent re-derivation of the "actual" answer per kind, straight from real math --------

function actualDistinguishAnswer(spec: DistinguishSpec) {
  return { potential: articulate(spec.utterance).potential };
}

function actualRelateAnswer(spec: RelateSpec) {
  const cellSet = (predicate(articulate(spec.utterance)) as { 'cell-set': { 'entity-set': { entities: unknown[] }; 'predicate-set': { predicates: unknown[] } } })['cell-set'];
  return { entities: cellSet['entity-set'].entities, predicates: cellSet['predicate-set'].predicates };
}

function actualMeasureAnswer(spec: MeasureSpec) {
  const settled = settle(posit(predicate(articulate(spec.utterance))) as Parameters<typeof settle>[0]);
  const cell = (settled as { sheaf: { section: { 'fiber-algebras': { assignments: { charge: { value: [boolean, boolean] } } }[] } } }).sheaf.section['fiber-algebras'][0]?.assignments[0];
  if (!cell) throw new Error('measure spec produced no settled cell');
  return { value: cell.charge.value };
}

function actualSettleAnswer(spec: SettleSpec) {
  return { claim: cohomologyOfRelation(spec.cells).H0.rank === 1 };
}

function actualObserveAnswer(spec: ObserveSpec) {
  const v = settling(spec.stages, spec.opts ?? {});
  return { regime: classify(v).regime, h1Vanishes: h1(v).vanishes };
}

describe('the world compiles clean', () => {
  test('every exercise kind resolved to a real checker -- no typo\'d/unregistered kind', () => {
    assert.deepEqual(unregisteredKinds, []);
  });

  test('zero compiler warnings (every door/link in the corpus resolves)', () => {
    assert.deepEqual(world.warnings, []);
  });

  test('the corpus has real content -- not an empty stub', () => {
    assert.ok(world.rooms.length >= 6, `expected at least 6 rooms, got ${world.rooms.length}`);
    assert.ok(exercises.length >= 15, `expected at least 15 graded exercises for a genuine 30+ minute arc, got ${exercises.length}`);
  });
});

describe('no repair (type F) content ships -- equivo-design.md §8', () => {
  test('MVP_KINDS excludes repair', () => {
    assert.ok(!MVP_KINDS.includes('repair'));
  });

  test('literally zero compiled exercises have kind "repair"', () => {
    const repairs = exercises.filter((e) => e.kind === 'repair');
    assert.deepEqual(repairs, [], `found ${repairs.length} repair exercise(s) in shipped content -- MVP cut violated`);
  });

  test('every shipped exercise kind is in MVP_KINDS', () => {
    for (const e of exercises) {
      assert.ok(MVP_KINDS.includes(e.kind), `exercise ${e.id} has kind "${e.kind}", not in MVP_KINDS`);
    }
  });
});

describe('every exercise: independently-derived answer passes, a wrong answer fails', () => {
  for (const ex of exercises) {
    test(`${ex.id}`, () => {
      let correctAnswer: unknown;
      let wrongAnswer: unknown;
      switch (ex.kind) {
        case 'distinguish': {
          const spec = ex.spec as DistinguishSpec;
          correctAnswer = actualDistinguishAnswer(spec);
          wrongAnswer = { potential: [spec.utterance[1], spec.utterance[0]] }; // reversed -- guaranteed wrong unless palindromic
          break;
        }
        case 'relate': {
          const spec = ex.spec as RelateSpec;
          const real = actualRelateAnswer(spec);
          correctAnswer = real;
          wrongAnswer = { entities: real.predicates, predicates: real.entities };
          break;
        }
        case 'measure': {
          const spec = ex.spec as MeasureSpec;
          const real = actualMeasureAnswer(spec);
          correctAnswer = real;
          wrongAnswer = { value: [!real.value[0], !real.value[1]] as [boolean, boolean] };
          break;
        }
        case 'settle': {
          const spec = ex.spec as SettleSpec;
          const real = actualSettleAnswer(spec);
          correctAnswer = real;
          wrongAnswer = { claim: !real.claim };
          break;
        }
        case 'observe': {
          const spec = ex.spec as ObserveSpec;
          const real = actualObserveAnswer(spec);
          correctAnswer = real;
          wrongAnswer = { regime: real.regime === 'finite' ? 'scott' : 'finite', h1Vanishes: !real.h1Vanishes };
          break;
        }
        default:
          throw new Error(`content-validate.test.mts: no independent verifier wired for kind "${ex.kind}" -- add one before shipping this kind`);
      }
      const passVerdict = ex.checker(ex.spec, correctAnswer);
      assert.equal(passVerdict.pass, true, `${ex.id}: independently-derived correct answer did not pass -- ${passVerdict.diagnosis}`);
      const failVerdict = ex.checker(ex.spec, wrongAnswer);
      assert.equal(failVerdict.pass, false, `${ex.id}: a deliberately wrong answer incorrectly passed -- checker does not discriminate`);
    });
  }
});

describe('gate minimum -- self-education-platform-design.md §4', () => {
  const contentRooms = world.rooms.filter((r) => exercises.some((e) => e.roomId === r.id));

  test('every room that carries exercises meets the gate minimum', () => {
    for (const room of contentRooms) {
      const status = roomGateStatus(room.id, exercises as GateExercise[]);
      assert.ok(status.meetsMinimum, `${room.id}: gate minimum not met -- ${status.exerciseCount} exercise(s), ${status.distinctKinds} distinct kind(s)`);
    }
  });

  test('the overview room (00-welcome) intentionally carries no exercises -- orientation only', () => {
    const welcome = world.rooms.find((r) => r.id.endsWith('00-welcome.md'));
    assert.ok(welcome, 'expected the welcome room to exist');
    assert.equal(exercises.filter((e) => e.roomId === welcome!.id).length, 0);
  });
});

describe('the unit is a genuine single-file progression -- the 30+ minute arc is a graph property', () => {
  const order = [
    '00-welcome.md',
    '01-marks-and-utterances.md',
    '02-relating-cells.md',
    '03-measuring-charge.md',
    '04-settling-equivalence.md',
    '05-observing-regimes.md',
    '06-capstone-reading-obstruction.md',
  ];

  test('every consecutive pair is linked by a hard door (prerequisite -> dependent)', () => {
    for (let i = 1; i < order.length; i++) {
      const from = `unit-1-the-descent/${order[i - 1]}`;
      const to = `unit-1-the-descent/${order[i]}`;
      const linked = world.doors.some((d) => d.from === from && d.to === to && d.weight === 'hard');
      assert.ok(linked, `expected a hard door ${from} -> ${to}`);
    }
  });

  test('00-welcome is the only room with zero incoming doors (the sole entry point)', () => {
    const roots = world.rooms.filter((r) => !world.doors.some((d) => d.to === r.id));
    assert.deepEqual(roots.map((r) => r.id), ['unit-1-the-descent/00-welcome.md']);
  });
});

describe('presentation registers -- equivo-design.md §6, re-checked at content build time', () => {
  test('all three MVP lenses are registered and honestly non-empty', () => {
    assert.equal(MVP_REGISTER_IDS.length, 3);
    for (const id of MVP_REGISTER_IDS) {
      const reg = equivoRegisters[id];
      assert.ok(reg, `expected register "${id}" to exist`);
      assert.equal(isFullyAbsent(reg!), false, `register "${id}" is fully absent -- should be at least thin-but-real`);
    }
  });

  test('the Lakotaean register is honestly and completely absent -- non-negotiable per §6.3', () => {
    const lakotaean = equivoRegisters['equivo-lakotaean'];
    assert.ok(lakotaean);
    assert.equal(isFullyAbsent(lakotaean!), true, 'Lakotaean register must be fully absent, never backfilled from another lens');
    assert.ok(!MVP_REGISTER_IDS.includes('equivo-lakotaean'), 'Lakotaean must not be listed as an MVP-shippable lens');
  });
});
