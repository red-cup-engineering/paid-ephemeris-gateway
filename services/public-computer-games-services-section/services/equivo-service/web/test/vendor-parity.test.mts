/**
 * `vendor-parity` -- proves the browser's grading is a REAL run of the same math the server/test
 * suite runs, not a client-side mock (self-education-platform-service's own top-level guarantee).
 * `sync-vendor.mjs` produces the vendored `web/js/vendor/**` copies MECHANICALLY (Node's own
 * `stripTypeScriptTypes` on the real `.mts` sources, plus a byte-identical copy of the real
 * `@lenticule-science/metrologic` sources it depends on) rather than by a hand-written port -- so this test
 * doesn't compare two independently-written implementations against each other (that would only
 * prove they happen to agree), it compares the vendored OUTPUT against the same independently-
 * derived-from-real-math answers `themes/equivo/test/content-validate.test.mts` already uses,
 * over the REAL compiled corpus, run through the REAL vendored checker registry -- i.e. it
 * re-runs that suite's own guarantee one layer further down the pipeline, at the exact module the
 * browser actually loads.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { articulate, predicate, posit, settle } from '@lenticule-science/metrologic/bilattice';
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { settling, classify, h1 } from '@lenticule-science/metrologic/obstruction/settling';

import { hydrateExercises as hydrateReal } from '@red-cup-engineering/education-platform-service/checker';
import { equivoCheckers as realCheckers } from '../../themes/equivo/registry.mts';
import { hydrateExercises as hydrateVendor } from '../js/vendor/src/checker.js';
import { equivoCheckers as vendorCheckers, nameOfCharge as vendorNameOfCharge } from '../js/vendor/themes/equivo/registry.js';
import { nameOfCharge as realNameOfCharge } from '../../themes/equivo/registry.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORLD_PATH = join(HERE, '..', '..', 'data', 'world-equivo.json');

const world = JSON.parse(await readFile(WORLD_PATH, 'utf8'));

test('fixture sanity: the compiled world has real exercises', () => {
  assert.ok(world.exercises.length >= 15);
});

test('vendored registry registers the exact same kinds as the real registry', () => {
  assert.deepEqual(Object.keys(vendorCheckers).sort(), Object.keys(realCheckers).sort());
});

test('nameOfCharge: vendored copy matches the real function on the full FOUR-value table', () => {
  for (const pair of [[false, false], [true, false], [false, true], [true, true]]) {
    assert.equal(vendorNameOfCharge(pair), realNameOfCharge(pair), JSON.stringify(pair));
  }
});

// --- same independent re-derivation content-validate.test.mts uses, kept in sync deliberately --

function actualDistinguishAnswer(spec) {
  return { potential: articulate(spec.utterance).potential };
}
function actualRelateAnswer(spec) {
  const cellSet = predicate(articulate(spec.utterance))['cell-set'];
  return { entities: cellSet['entity-set'].entities, predicates: cellSet['predicate-set'].predicates };
}
function actualMeasureAnswer(spec) {
  const settled = settle(posit(predicate(articulate(spec.utterance))));
  const cell = settled.sheaf.section['fiber-algebras'][0]?.assignments[0];
  if (!cell) throw new Error('measure spec produced no settled cell');
  return { value: cell.charge.value };
}
function actualSettleAnswer(spec) {
  return { claim: cohomologyOfRelation(spec.cells).H0.rank === 1 };
}
function actualObserveAnswer(spec) {
  const v = settling(spec.stages, spec.opts ?? {});
  return { regime: classify(v).regime, h1Vanishes: h1(v).vanishes };
}

function wrongAnswerFor(kind, spec, real) {
  switch (kind) {
    case 'distinguish':
      return { potential: [spec.utterance[1], spec.utterance[0]] };
    case 'relate':
      return { entities: real.predicates, predicates: real.entities };
    case 'measure':
      return { value: [!real.value[0], !real.value[1]] };
    case 'settle':
      return { claim: !real.claim };
    case 'observe':
      return { regime: real.regime === 'finite' ? 'scott' : 'finite', h1Vanishes: !real.h1Vanishes };
    default:
      throw new Error(`no wrong-answer rule for kind "${kind}"`);
  }
}

function actualAnswerFor(kind, spec) {
  switch (kind) {
    case 'distinguish': return actualDistinguishAnswer(spec);
    case 'relate': return actualRelateAnswer(spec);
    case 'measure': return actualMeasureAnswer(spec);
    case 'settle': return actualSettleAnswer(spec);
    case 'observe': return actualObserveAnswer(spec);
    default: throw new Error(`no independent verifier for kind "${kind}"`);
  }
}

const { exercises: realExercises } = hydrateReal(world.exercises, realCheckers);
const { exercises: vendorExercises } = hydrateVendor(world.exercises, vendorCheckers);

describe('every shipped exercise: vendored checker verdict matches the real checker verdict, both directions', () => {
  assert.equal(vendorExercises.length, realExercises.length);
  for (let i = 0; i < realExercises.length; i++) {
    const real = realExercises[i];
    const vendor = vendorExercises[i];
    test(`${real.id}`, () => {
      assert.equal(vendor.id, real.id);
      const correct = actualAnswerFor(real.kind, real.spec);
      const wrong = wrongAnswerFor(real.kind, real.spec, correct);

      const realPass = real.checker(real.spec, correct);
      const vendorPass = vendor.checker(vendor.spec, correct);
      assert.equal(realPass.pass, true, `real checker: independently-derived answer should pass -- ${realPass.diagnosis}`);
      assert.deepEqual(vendorPass, realPass, 'vendored checker disagreed with the real checker on a correct answer');

      const realFail = real.checker(real.spec, wrong);
      const vendorFail = vendor.checker(vendor.spec, wrong);
      assert.equal(realFail.pass, false, 'real checker: deliberately wrong answer should fail');
      assert.deepEqual(vendorFail, realFail, 'vendored checker disagreed with the real checker on a wrong answer');
    });
  }
});
