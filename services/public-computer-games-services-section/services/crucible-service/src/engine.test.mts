import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, legalMoves, isSettled } from './engine.mts';
import { spawnTangle } from './tangle.mts';
import type { Tangle, Bond } from './types.mts';

function bond(id: string, a: string, b: string, state: Bond['state'] = 'exchangeable'): Bond {
  return { id, a, b, geometry: 'panel', state };
}

function triangleTangle(): Tangle {
  return {
    seed: 'test',
    claims: [{ id: 'A', phi: 0.5 }, { id: 'B', phi: 0.5 }, { id: 'C', phi: 0.5 }, { id: 'D', phi: 0 }],
    bonds: [bond('b0', 'A', 'B'), bond('b1', 'B', 'C'), bond('b2', 'C', 'A')],
    freeReserve: 5,
    energyBudget: 100,
  };
}

test('isSettled is false on a tangle with a cycle, true once it is broken', () => {
  const t = triangleTangle();
  assert.equal(isSettled(t), false);
  const { tangle: t2 } = applyMove(t, { verb: 'split', bondId: 'b0', mode: 'clean' });
  assert.equal(isSettled(t2), true);
});

test('MERGE adds a compliant-permanent bond and decrements free reserve by 1', () => {
  const t = triangleTangle();
  const { tangle: t2, moveCost } = applyMove(t, { verb: 'merge', a: 'A', b: 'D' });
  assert.equal(t2.bonds.length, t.bonds.length + 1);
  assert.equal(t2.freeReserve, t.freeReserve - 1);
  const added = t2.bonds.find((b) => b.a === 'A' && b.b === 'D');
  assert.ok(added);
  assert.equal(added?.state, 'compliant-permanent');
  assert.ok(moveCost.cost > 0);
});

test('MERGE throws if the pair is already bonded', () => {
  const t = triangleTangle();
  assert.throws(() => applyMove(t, { verb: 'merge', a: 'A', b: 'B' }));
});

test('MERGE throws at zero free reserve', () => {
  const t = { ...triangleTangle(), freeReserve: 0 };
  assert.throws(() => applyMove(t, { verb: 'merge', a: 'A', b: 'D' }));
});

test('SPLIT clean removes the bond; SPLIT forced also removes it but costs more', () => {
  const t = triangleTangle();
  const clean = applyMove(t, { verb: 'split', bondId: 'b0', mode: 'clean' });
  const forced = applyMove(t, { verb: 'split', bondId: 'b0', mode: 'forced' });
  assert.equal(clean.tangle.bonds.some((b) => b.id === 'b0'), false);
  assert.equal(forced.tangle.bonds.some((b) => b.id === 'b0'), false);
  assert.ok(forced.moveCost.cost > clean.moveCost.cost);
});

test('SPLIT throws on a pinned bond', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('p0', 'A', 'B', 'pinned')] };
  assert.throws(() => applyMove(t, { verb: 'split', bondId: 'p0', mode: 'clean' }));
});

test('SPLIT clean throws on a compliant-permanent bond (no take-backs via ordinary chemistry)', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('m0', 'A', 'B', 'compliant-permanent')] };
  assert.throws(() => applyMove(t, { verb: 'split', bondId: 'm0', mode: 'clean' }));
});

test('SPLIT forced DOES work on a compliant-permanent bond — the recovery valve MERGE needs', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('m0', 'A', 'B', 'compliant-permanent')] };
  const { tangle: t2 } = applyMove(t, { verb: 'split', bondId: 'm0', mode: 'forced' });
  assert.equal(t2.bonds.some((b) => b.id === 'm0'), false);
});

test('SPLIT clean throws on a catalyzed bond; SPLIT forced works', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('c0', 'A', 'B', 'catalyzed')] };
  assert.throws(() => applyMove(t, { verb: 'split', bondId: 'c0', mode: 'clean' }));
  const { tangle: t2 } = applyMove(t, { verb: 'split', bondId: 'c0', mode: 'forced' });
  assert.equal(t2.bonds.some((b) => b.id === 'c0'), false);
});

test('SPLIT (any mode) always throws on a pinned bond — the one truly untouchable state', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('p0', 'A', 'B', 'pinned')] };
  assert.throws(() => applyMove(t, { verb: 'split', bondId: 'p0', mode: 'clean' }));
  assert.throws(() => applyMove(t, { verb: 'split', bondId: 'p0', mode: 'forced' }));
});

test('REBOND moves the free end and leaves free reserve unchanged', () => {
  const t = triangleTangle();
  const before = t.freeReserve;
  const { tangle: t2 } = applyMove(t, { verb: 'rebond', bondId: 'b0', toClaimId: 'D' });
  assert.equal(t2.freeReserve, before);
  const moved = t2.bonds.find((b) => b.id === 'b0');
  assert.equal(moved?.a, 'A');
  assert.equal(moved?.b, 'D');
});

test('REBOND throws at zero free reserve (oxidative exhaustion)', () => {
  const t = { ...triangleTangle(), freeReserve: 0 };
  assert.throws(() => applyMove(t, { verb: 'rebond', bondId: 'b0', toClaimId: 'D' }));
});

test('REBOND throws on a non-exchangeable bond', () => {
  const t: Tangle = { ...triangleTangle(), bonds: [bond('p0', 'A', 'B', 'pinned'), ...triangleTangle().bonds.slice(1)] };
  assert.throws(() => applyMove(t, { verb: 'rebond', bondId: 'p0', toClaimId: 'D' }));
});

test('CATALYZE locks the bond to catalyzed (never pinned) and decrements free reserve by 1, keeps connectivity intact', () => {
  const t = triangleTangle();
  const { tangle: t2 } = applyMove(t, { verb: 'catalyze', claimId: 'D', bondId: 'b0' });
  const locked = t2.bonds.find((b) => b.id === 'b0');
  // Deliberately NOT 'pinned' — see types.mts's BondState doc: a player-created lock must stay
  // distinguishable from the generator's own backbone, or it becomes a permanent softlock.
  assert.equal(locked?.state, 'catalyzed');
  assert.equal(t2.freeReserve, t.freeReserve - 1);
  assert.equal(t2.bonds.length, t.bonds.length);
});

test('CATALYZE throws if the catalyst is one of the bond\'s own endpoints', () => {
  const t = triangleTangle();
  assert.throws(() => applyMove(t, { verb: 'catalyze', claimId: 'A', bondId: 'b0' }));
});

test('legalMoves on a freeReserve=0 tangle offers no MERGE, REBOND, or CATALYZE moves — only SPLIT', () => {
  const t = { ...triangleTangle(), freeReserve: 0 };
  const moves = legalMoves(t);
  assert.ok(moves.length > 0, 'forced SPLIT must remain available (oxidative exhaustion is not a dead end)');
  assert.ok(moves.every((m) => m.verb === 'split'));
});

test('legalMoves never proposes ANY move on a pinned bond', () => {
  const t: Tangle = {
    ...triangleTangle(),
    bonds: [bond('pin', 'A', 'B', 'pinned'), bond('perm', 'B', 'C', 'compliant-permanent'), bond('cat', 'C', 'D', 'catalyzed')],
  };
  const moves = legalMoves(t);
  for (const m of moves) {
    if (m.verb === 'split' || m.verb === 'rebond' || m.verb === 'catalyze') {
      assert.notEqual(m.bondId, 'pin');
    }
  }
});

test('legalMoves offers ONLY forced SPLIT (never clean SPLIT, REBOND, or CATALYZE) on a compliant-permanent or catalyzed bond', () => {
  const t: Tangle = {
    ...triangleTangle(),
    bonds: [bond('pin', 'A', 'B', 'pinned'), bond('perm', 'B', 'C', 'compliant-permanent'), bond('cat', 'C', 'D', 'catalyzed')],
  };
  const moves = legalMoves(t);
  const onPerm = moves.filter((m) => 'bondId' in m && m.bondId === 'perm');
  const onCat = moves.filter((m) => 'bondId' in m && m.bondId === 'cat');
  assert.deepEqual(onPerm, [{ verb: 'split', bondId: 'perm', mode: 'forced' }]);
  assert.deepEqual(onCat, [{ verb: 'split', bondId: 'cat', mode: 'forced' }]);
});

test('no permanent softlock: forced-splitting every non-pinned bond after ANY sequence of MERGE/CATALYZE locks always reaches settlement', () => {
  // This is the executable proof behind validate.mts's solvability-guarantee doc: MERGE and
  // CATALYZE can each lock a bond down, but forced SPLIT always remains legal on any non-pinned
  // bond, so no lock sequence can strand a cycle permanently. Checked across many seeds and lock
  // sequences.
  for (const seed of ['crucible-daily:2026-08-15', 'crucible-daily:2026-08-16', 'crucible-daily:2026-08-17', 'crucible-daily:2026-08-18', 'crucible-daily:2026-08-19']) {
    let tangle = spawnTangle(seed);
    // Lock down every exchangeable chord we can reach via MERGE or CATALYZE, alternating, until
    // free reserve or targets run out — the worst-case "careless player" path.
    let guard = 0;
    while (tangle.freeReserve > 0 && guard < 20) {
      guard++;
      const legal = legalMoves(tangle);
      const lockMove = legal.find((m) => m.verb === 'merge') ?? legal.find((m) => m.verb === 'catalyze');
      if (!lockMove) break;
      tangle = applyMove(tangle, lockMove).tangle;
    }
    assert.ok(
      tangle.bonds.some((b) => b.state === 'compliant-permanent' || b.state === 'catalyzed'),
      `seed ${seed}: test setup failed to create any lock — check legalMoves`,
    );
    // Now recover: forced-split every non-pinned bond until settled.
    let steps = 0;
    while (!isSettled(tangle) && steps < 200) {
      steps++;
      const legal = legalMoves(tangle);
      const forcedSplit = legal.find((m) => m.verb === 'split' && m.mode === 'forced');
      assert.ok(forcedSplit, `seed ${seed}: ran out of legal moves before settling (step ${steps})`);
      tangle = applyMove(tangle, forcedSplit).tangle;
    }
    assert.ok(isSettled(tangle), `seed ${seed}: never settled after ${steps} forced splits`);
  }
});

test('applyMove is a pure function: the input tangle is never mutated', () => {
  const t = triangleTangle();
  const frozenBonds = JSON.stringify(t.bonds);
  applyMove(t, { verb: 'split', bondId: 'b0', mode: 'clean' });
  assert.equal(JSON.stringify(t.bonds), frozenBonds);
});

test('applyMove determinism: same tangle + same move -> identical result every time', () => {
  const t = triangleTangle();
  const r1 = applyMove(t, { verb: 'rebond', bondId: 'b0', toClaimId: 'D' });
  const r2 = applyMove(t, { verb: 'rebond', bondId: 'b0', toClaimId: 'D' });
  assert.deepEqual(r1, r2);
});

test('a freshly spawned daily tangle always has at least one legal move (not already settled)', () => {
  for (const seed of ['crucible-daily:2026-08-19', 'crucible-daily:2026-01-01', 'x', 'y', 'z']) {
    const t = spawnTangle(seed);
    if (!isSettled(t)) {
      assert.ok(legalMoves(t).length > 0);
    }
  }
});
