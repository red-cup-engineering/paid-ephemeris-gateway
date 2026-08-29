/**
 * Exercises the REAL `@lenticule-science/metrologic` output on hand-built bond lists — nothing mocked. This is
 * the test that actually proves "not a designer spreadsheet": every assertion below is checking
 * a number that came out of `cohomologyOfRelation`/`settling`/`classify`/`h1` in the real
 * installed package, not a stub.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cohomologyOfRelation } from '@lenticule-science/metrologic/obstruction/cochain';
import { spatialH1Rank, localSpatialH1Rank, costOfMove, REGIME_MULT, GENERATOR_WEIGHT, SPATIAL_WEIGHT } from './obstruction.mts';
import type { Bond } from './types.mts';

function bond(id: string, a: string, b: string): Bond {
  return { id, a, b, geometry: 'panel', state: 'exchangeable' };
}

test('spatialH1Rank on an acyclic tree is 0 (matches direct cohomologyOfRelation call)', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'B', 'D')];
  const direct = cohomologyOfRelation(bonds.map((b) => ({ subject: b.a, predicate: 'bond', object: b.b })));
  assert.equal(direct.H1.rank, 0);
  assert.equal(spatialH1Rank(bonds), 0);
});

test('spatialH1Rank on a single 3-cycle is 1', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A')];
  assert.equal(spatialH1Rank(bonds), 1);
});

test('spatialH1Rank on a figure-8 (two cycles sharing a vertex) is 2', () => {
  const bonds = [
    bond('b0', 'A', 'B'),
    bond('b1', 'B', 'C'),
    bond('b2', 'C', 'A'),
    bond('b3', 'A', 'D'),
    bond('b4', 'D', 'E'),
    bond('b5', 'E', 'A'),
  ];
  assert.equal(spatialH1Rank(bonds), 2);
});

test('spatialH1Rank on a disconnected pair of edges is 0 (H0=2, H1=0)', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'C', 'D')];
  const cells = bonds.map((b) => ({ subject: b.a, predicate: 'bond', object: b.b }));
  const r = cohomologyOfRelation(cells);
  assert.equal(r.H0.rank, 2);
  assert.equal(r.H1.rank, 0);
  assert.equal(spatialH1Rank(bonds), 0);
});

test('spatialH1Rank on an empty bond list is 0', () => {
  assert.equal(spatialH1Rank([]), 0);
});

test('localSpatialH1Rank scopes to a 2-hop neighborhood: a far-away cycle does not count', () => {
  // A-B-C-A is a cycle far from Z; Z is bonded only to A.
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A'), bond('b3', 'A', 'Z')];
  // Z's neighborhood is {Z, A}; the only edge among {Z,A} is b3 -> no cycle locally.
  assert.equal(localSpatialH1Rank(bonds, 'Z'), 0);
  // A's neighborhood is {A, B, C, Z} -> the full triangle is visible.
  assert.equal(localSpatialH1Rank(bonds, 'A'), 1);
});

test('MERGE cost is finite/depth-0 with the spatial term as the only variable part', () => {
  const bonds = [bond('b0', 'A', 'B')];
  const c = costOfMove({ verb: 'merge', a: 'X', b: 'Y' }, bonds);
  assert.equal(c.regime, 'finite');
  assert.equal(c.depth, 0);
  assert.equal(c.temporalH1, 0);
  assert.equal(c.spatialH1, 0);
  assert.equal(c.cost, REGIME_MULT.finite * 1);
});

test('MERGE that closes a loop costs strictly more than one that does not', () => {
  const noLoop = [bond('b0', 'A', 'B')];
  const closesLoop = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A')];
  const cheap = costOfMove({ verb: 'merge', a: 'X', b: 'Y' }, noLoop);
  const expensive = costOfMove({ verb: 'merge', a: 'X', b: 'Y' }, closesLoop);
  assert.ok(expensive.cost > cheap.cost);
  assert.equal(expensive.spatialH1, 1);
});

test('REBOND is finite regime, depth 1 (two ordinary successor firings)', () => {
  const bonds = [bond('b0', 'A', 'C')];
  const c = costOfMove({ verb: 'rebond', bondId: 'b0', toClaimId: 'C' }, bonds);
  assert.equal(c.regime, 'finite');
  assert.equal(c.depth, 1);
  assert.equal(c.temporalH1, 0);
  assert.equal(c.cost, REGIME_MULT.finite * 2);
});

test('SPLIT clean is scott regime, strictly cheaper than SPLIT forced on the same bond', () => {
  const bonds: Bond[] = [];
  const clean = costOfMove({ verb: 'split', bondId: 'b0', mode: 'clean' }, bonds);
  const forced = costOfMove({ verb: 'split', bondId: 'b0', mode: 'forced' }, bonds);
  assert.equal(clean.regime, 'scott');
  assert.equal(forced.regime, 'transfinite');
  assert.ok(forced.cost > clean.cost, `forced (${forced.cost}) should cost more than clean (${clean.cost})`);
});

test('SPLIT forced has a nonzero temporal H1 (a genuine non-Scott-continuous firing)', () => {
  const c = costOfMove({ verb: 'split', bondId: 'b0', mode: 'forced' }, []);
  assert.equal(c.temporalH1, 2); // reform:a and reform:b both first appear at the limit
  assert.equal(c.regime, 'transfinite');
});

test('CATALYZE cost rises with the catalyst local cycle count, not the whole tangle', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A'), bond('b3', 'A', 'Z')];
  const onCycle = costOfMove({ verb: 'catalyze', claimId: 'A', bondId: 'b0' }, bonds);
  const offCycle = costOfMove({ verb: 'catalyze', claimId: 'Z', bondId: 'b3' }, bonds);
  assert.ok(onCycle.cost > offCycle.cost);
  assert.equal(offCycle.spatialH1, 0);
  assert.equal(onCycle.spatialH1, 1);
});

test('cost formula matches REGIME_MULT * (1+depth) + GENERATOR_WEIGHT*temporal + SPATIAL_WEIGHT*spatial exactly', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A')];
  const c = costOfMove({ verb: 'split', bondId: 'b0', mode: 'forced' }, bonds);
  const expected = REGIME_MULT[c.regime] * (1 + c.depth) + GENERATOR_WEIGHT * c.temporalH1 + SPATIAL_WEIGHT * c.spatialH1;
  assert.equal(c.cost, expected);
});

test('costOfMove is deterministic: same move, same bonds, same cost every time', () => {
  const bonds = [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A')];
  const move = { verb: 'rebond' as const, bondId: 'b0', toClaimId: 'C' };
  const a = costOfMove(move, bonds);
  const b = costOfMove(move, bonds);
  assert.deepEqual(a, b);
});
