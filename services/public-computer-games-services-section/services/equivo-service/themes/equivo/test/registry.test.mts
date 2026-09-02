/**
 * Direct unit tests of Equivo's checker registry (`themes/equivo/registry.mts`) -- one section per
 * exercise type, reproducing equivo-design.md §5's own worked examples (down to the printed
 * numbers) plus edge cases the design doc doesn't cover. Every assertion here runs the REAL
 * `@lenticule-science/metrologic` code, imported fresh in this file (not by calling into `registry.mts`'s own
 * helpers) -- an independent re-derivation, not a tautology that would pass even if the checker
 * silently stopped calling real math.
 */
import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { articulate, predicate, posit, settle } from '@lenticule-science/metrologic/bilattice';
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { settling, classify, h1 } from '@lenticule-science/metrologic/obstruction/settling';
import {
  distinguishChecker,
  relateChecker,
  measureChecker,
  settleChecker,
  observeChecker,
  repairChecker,
  nameOfCharge,
  equivoCheckers,
  MVP_KINDS,
} from '../registry.mts';

describe('nameOfCharge -- the FOUR-value bilattice naming table', () => {
  test('[F,F]=absurd, [T,F]=potential, [F,T]=active, [T,T]=stable', () => {
    assert.equal(nameOfCharge([false, false]), 'absurd');
    assert.equal(nameOfCharge([true, false]), 'potential');
    assert.equal(nameOfCharge([false, true]), 'active');
    assert.equal(nameOfCharge([true, true]), 'stable');
  });
});

describe('distinguishChecker (type A)', () => {
  const spec = { utterance: ['3-3 stone', 'corner-invasion'] as [unknown, unknown] };

  test('correct answer -- matches real articulate() output exactly', () => {
    const real = articulate(spec.utterance);
    const v = distinguishChecker(spec, { potential: real.potential });
    assert.equal(v.pass, true);
    assert.match(v.diagnosis, /correct/);
  });

  test('wrong answer (reordered) fails, with a diagnosis naming the real result', () => {
    const v = distinguishChecker(spec, { potential: ['corner-invasion', '3-3 stone'] });
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /3-3 stone, corner-invasion/);
  });

  test('a malformed spec (single-element utterance) fails loud with a diagnosis, never throws', () => {
    const v = distinguishChecker({ utterance: [undefined, 'x'] as unknown as [unknown, unknown] }, { potential: ['x'] });
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /malformed/);
  });
});

describe('relateChecker (type B)', () => {
  const spec = { utterance: ['a fossil layer', 'the site predates the eruption'] as [unknown, unknown] };

  test('correct answer -- matches real predicate(articulate()) structural output', () => {
    const real = predicate(articulate(spec.utterance)) as { 'cell-set': { 'entity-set': { entities: unknown[] }; 'predicate-set': { predicates: unknown[] } } };
    const cellSet = real['cell-set'];
    const v = relateChecker(spec, { entities: cellSet['entity-set'].entities, predicates: cellSet['predicate-set'].predicates });
    assert.equal(v.pass, true);
  });

  test('wrong answer (predicate/entity swapped) fails', () => {
    const v = relateChecker(spec, { entities: ['the site predates the eruption'], predicates: ['a fossil layer'] });
    assert.equal(v.pass, false);
  });
});

describe('measureChecker (type C) -- equivo-design.md §5.1', () => {
  const spec = { utterance: ['3-3 stone', 'corner-invasion'] as [unknown, unknown] };

  test('correct answer settles to [true,false] (potential), matching the design doc printed output exactly', () => {
    const v = measureChecker(spec, { value: [true, false] });
    assert.equal(v.pass, true);
    assert.match(v.diagnosis, /potential/);
  });

  test('wrong answer [true,true] (stable) fails, diagnosis names both the actual and claimed charge', () => {
    const v = measureChecker(spec, { value: [true, true] });
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /potential/);
    assert.match(v.diagnosis, /stable/);
  });

  test('independent re-derivation: for ANY two-element utterance, a bare descent always settles to potential -- a real structural fact about posit() seeding [T,F] with a single entity, not a checker assumption', () => {
    for (const u of [['x', 'y'], ['a rumor', 'the merger is happening'], ['sensor', 'sound']] as [unknown, unknown][]) {
      const settled = settle(posit(predicate(articulate(u))) as Parameters<typeof settle>[0]);
      const cell = (settled as { sheaf: { section: { 'fiber-algebras': { assignments: { charge: { value: [boolean, boolean] } } }[] } } }).sheaf.section['fiber-algebras'][0]?.assignments[0];
      assert.deepEqual(cell?.charge.value, [true, false]);
    }
  });
});

describe('settleChecker (type D) -- equivo-design.md §5.2', () => {
  test('connected chain: H0 rank 1, claim=equivalent passes', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
    ] };
    const real = cohomologyOfRelation(spec.cells);
    assert.equal(real.H0.rank, 1);
    assert.equal(real.H1.rank, 0);
    assert.equal(settleChecker(spec, { claim: true }).pass, true);
    assert.equal(settleChecker(spec, { claim: false }).pass, false);
  });

  test('disjoint pairs: H0 rank 2, claim=equivalent FAILS (matching the design doc\'s "should fail" case)', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'C', predicate: 'equivalent-to', object: 'D' },
    ] };
    assert.equal(cohomologyOfRelation(spec.cells).H0.rank, 2);
    const v = settleChecker(spec, { claim: true });
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /H0 rank is 2/);
    assert.equal(settleChecker(spec, { claim: false }).pass, true);
  });

  test('a genuine cycle: H0 rank 1 (equivalent) but H1 != 0 -- equivalence and obstruction are independent readings', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
      { subject: 'C', predicate: 'equivalent-to', object: 'A' },
    ] };
    const real = cohomologyOfRelation(spec.cells);
    assert.equal(real.H0.rank, 1);
    assert.equal(real.H1.rank, 1);
    assert.equal(real.H1.vanishes, false);
    // the checker's own claim is only about H0 (equivalence), so claim=true still passes even
    // though the relation is separately obstructed -- exactly the distinction the corpus teaches.
    assert.equal(settleChecker(spec, { claim: true }).pass, true);
  });
});

describe('observeChecker (type E) -- equivo-design.md §5.3', () => {
  test('finite settling: regime finite, depth 2, H1 vanishes', () => {
    const spec = { stages: [
      { designated: ['a'] }, { designated: ['a', 'b'] }, { designated: ['a', 'b', 'c'] },
    ] };
    const v = settling(spec.stages, {});
    assert.deepEqual(classify(v), { depth: 2, regime: 'finite' });
    assert.equal(h1(v).vanishes, true);
    assert.equal(observeChecker(spec, { regime: 'finite', h1Vanishes: true }).pass, true);
    assert.equal(observeChecker(spec, { regime: 'transfinite', h1Vanishes: false }).pass, false);
  });

  test('transfinite settling with TWO cells firing at the same limit stage: H1 rank 2, reproducing the design doc\'s own "honest artifact"', () => {
    const spec = { stages: [
      { designated: ['a'] }, { designated: ['a', 'b'] },
      { designated: ['a', 'b', 'c', 'd'], limit: true },
    ] };
    const v = settling(spec.stages, {});
    const ob = h1(v);
    assert.equal(classify(v).regime, 'transfinite');
    assert.equal(ob.rank, 2);
    assert.equal(ob.vanishes, false);
    assert.equal(observeChecker(spec, { regime: 'transfinite', h1Vanishes: false }).pass, true);
  });

  test('scott regime: a limit stage that fires nothing is NOT transfinite -- the naive-expectation trap the capstone lesson names explicitly', () => {
    const spec = { stages: [
      { designated: ['a'] }, { designated: ['a', 'b'] },
      { designated: ['a', 'b'], limit: true },
      { designated: ['a', 'b', 'c'] },
    ] };
    const v = settling(spec.stages, {});
    assert.equal(classify(v).regime, 'scott');
    assert.equal(h1(v).vanishes, true);
    assert.equal(observeChecker(spec, { regime: 'scott', h1Vanishes: true }).pass, true);
    assert.equal(observeChecker(spec, { regime: 'transfinite', h1Vanishes: true }).pass, false);
  });

  test('aperiodic regime requires the declared cofinal opt, not just a limit firing', () => {
    const spec = { stages: [{ designated: ['a'] }, { designated: ['a', 'z'], limit: true }], opts: { cofinal: 'uncountable' as const } };
    const v = settling(spec.stages, spec.opts);
    assert.equal(classify(v).regime, 'aperiodic');
    assert.equal(observeChecker(spec, { regime: 'aperiodic', h1Vanishes: false }).pass, true);
  });
});

describe('repairChecker (type F) -- implemented, tested, NOT shipped in any corpus content (MVP_KINDS excludes it)', () => {
  test('an edit that closes the obstruction while keeping every entity passes', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
      { subject: 'C', predicate: 'equivalent-to', object: 'A' },
    ] };
    // remove one edge of the triangle but keep all three entities present via the remaining two edges
    const editedCells = [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
    ];
    const v = repairChecker(spec, { cells: editedCells });
    assert.equal(cohomologyOfRelation(editedCells).H1.rank, 0);
    assert.equal(v.pass, true);
  });

  test('the disclosed evasion case: deleting an entity closes H1 but is rejected', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
      { subject: 'C', predicate: 'equivalent-to', object: 'A' },
    ] };
    const editedCells = [{ subject: 'A', predicate: 'equivalent-to', object: 'B' }]; // C dropped entirely
    const v = repairChecker(spec, { cells: editedCells });
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /deleted rather than reconciled/);
  });

  test('an edit that leaves the obstruction unresolved fails', () => {
    const spec = { cells: [
      { subject: 'A', predicate: 'equivalent-to', object: 'B' },
      { subject: 'B', predicate: 'equivalent-to', object: 'C' },
      { subject: 'C', predicate: 'equivalent-to', object: 'A' },
    ] };
    const v = repairChecker(spec, { cells: spec.cells }); // unedited -- still obstructed
    assert.equal(v.pass, false);
    assert.match(v.diagnosis, /still carries an obstruction/);
  });
});

describe('registry wiring', () => {
  test('equivoCheckers registers exactly the six §3 kinds', () => {
    assert.deepEqual(Object.keys(equivoCheckers).sort(), ['distinguish', 'measure', 'observe', 'relate', 'repair', 'settle']);
  });

  test('MVP_KINDS is a strict subset of the full registry and excludes repair', () => {
    for (const k of MVP_KINDS) assert.ok(k in equivoCheckers);
    assert.ok(!MVP_KINDS.includes('repair'));
  });
});
