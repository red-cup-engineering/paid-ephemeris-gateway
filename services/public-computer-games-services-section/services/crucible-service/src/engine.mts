/**
 * `engine` — pure move application for the four verbs (merge, split, rebond, catalyze).
 *
 * Everything here is a pure function of `(Tangle, Move) -> MoveResult`. No `Date.now()`, no
 * `Math.random()`, no mutation of the input tangle — house doctrine, and the entire basis for
 * `replay.mts`'s determinism guarantee: folding `applyMove` over a fresh `spawnTangle(seed)` for
 * the same move log always reaches the same final state, because nothing in this file can read
 * from anywhere but its own arguments.
 *
 * Legality (`legalMoves`) and cost (via `obstruction.mts`) are deliberately kept separate:
 * `legalMoves` answers "can this move be applied at all" (structural/resource questions —
 * bond state, free-thiol reserve); `obstruction.mts` answers "what does it cost" (the real
 * math). A move that is legal is never rejected for being expensive — high cost is a
 * consequence the player chooses to pay, never a rule that blocks the choice. This is the engine
 * half of the "never a solvability shortcut" doctrine (ANATOMY digest): nothing here can make a
 * move artificially cheap, and nothing prices a move by anything other than `obstruction.mts`'s
 * real settling/cohomology calls.
 */
import { costOfMove, spatialH1Rank } from './obstruction.mts';
import type { Tangle, Bond, Move, MoveResult } from './types.mts';

/** A fresh bond id derived purely from the tangle's own bond count/ids — never a counter or
 * clock read, so two calls given the same tangle always produce the same id (determinism). */
function nextBondId(tangle: Tangle): string {
  let n = tangle.bonds.length;
  const used = new Set(tangle.bonds.map((b) => b.id));
  let id = `bond-${n}`;
  while (used.has(id)) {
    n++;
    id = `bond-${n}`;
  }
  return id;
}

function findBond(tangle: Tangle, bondId: string): Bond | undefined {
  return tangle.bonds.find((b) => b.id === bondId);
}

function bonded(tangle: Tangle, a: string, b: string): boolean {
  return tangle.bonds.some((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
}

/** All moves currently legal on `tangle`. Pure, deterministic, and — per `validate.mts` — always
 * includes at least one move whenever the tangle is not yet settled. */
export function legalMoves(tangle: Tangle): Move[] {
  const moves: Move[] = [];
  const claimIds = tangle.claims.map((c) => c.id);

  // MERGE: any two distinct, not-yet-bonded claims, whenever there is free reserve to spend
  // (thiol-ene irreversibly consumes free thiol into a permanent thioether).
  if (tangle.freeReserve > 0) {
    for (let i = 0; i < claimIds.length; i++) {
      for (let j = i + 1; j < claimIds.length; j++) {
        const a = claimIds[i] as string;
        const b = claimIds[j] as string;
        if (!bonded(tangle, a, b)) moves.push({ verb: 'merge', a, b });
      }
    }
  }

  for (const bond of tangle.bonds) {
    if (bond.state === 'pinned') continue; // backbone: never selectable, at any cost, ever

    // SPLIT forced: the recovery valve. Legal on ANY non-pinned bond — exchangeable,
    // compliant-permanent (a player's own MERGE lock), or catalyzed (a player's own CATALYZE
    // lock) alike — so no lock a player creates can ever be a permanent, unrecoverable softlock.
    // See `types.mts`'s `BondState` doc for why this is load-bearing, not cosmetic.
    moves.push({ verb: 'split', bondId: bond.id, mode: 'forced' });

    if (bond.state !== 'exchangeable') continue; // no take-backs via the *ordinary* chemistry

    // SPLIT clean: only the un-locked, ordinary exchange chemistry gets the cheap route.
    moves.push({ verb: 'split', bondId: bond.id, mode: 'clean' });

    // REBOND: only when there is free reserve (oxidative exhaustion closes this route at zero),
    // and only to a claim not already bonded to the fixed end `a`. (`bond.state` is already known
    // `exchangeable` here, by the `continue` above.)
    if (tangle.freeReserve > 0) {
      for (const target of claimIds) {
        if (target === bond.a || target === bond.b) continue;
        if (bonded(tangle, bond.a, target)) continue;
        moves.push({ verb: 'rebond', bondId: bond.id, toClaimId: target });
      }
    }

    // CATALYZE: any claim (other than the bond's own two endpoints) may catalyze an exchangeable
    // bond, locking it to `catalyzed`, whenever there is free reserve (the "complement carrier"
    // the theme digest describes — catalysis is never actually free).
    if (tangle.freeReserve > 0) {
      for (const claimId of claimIds) {
        if (claimId === bond.a || claimId === bond.b) continue;
        moves.push({ verb: 'catalyze', claimId, bondId: bond.id });
      }
    }
  }

  return moves;
}

/** Apply one move to a tangle, returning the resulting tangle and its real, measured cost. Throws
 * if the move is not currently legal (mirrors `validate.mts`'s doctrine: a move either is or is
 * not legal, there is no silent no-op path a caller could mistake for success). */
export function applyMove(tangle: Tangle, move: Move): MoveResult {
  switch (move.verb) {
    case 'merge': {
      if (tangle.freeReserve <= 0) throw new Error('merge: no free-thiol reserve remaining (oxidative exhaustion)');
      if (bonded(tangle, move.a, move.b)) throw new Error(`merge: ${move.a} and ${move.b} are already bonded`);
      if (!tangle.claims.some((c) => c.id === move.a) || !tangle.claims.some((c) => c.id === move.b)) {
        throw new Error('merge: unknown claim id');
      }
      const newBond: Bond = { id: nextBondId(tangle), a: move.a, b: move.b, geometry: 'panel', state: 'compliant-permanent' };
      const afterBonds = [...tangle.bonds, newBond];
      const moveCost = costOfMove(move, afterBonds);
      const tangle2: Tangle = { ...tangle, bonds: afterBonds, freeReserve: tangle.freeReserve - 1 };
      return { tangle: tangle2, moveCost };
    }
    case 'split': {
      const bond = findBond(tangle, move.bondId);
      if (!bond) throw new Error(`split: unknown bond ${move.bondId}`);
      if (bond.state === 'pinned') {
        throw new Error(`split: bond ${move.bondId} is pinned (backbone) and can never be split`);
      }
      if (move.mode === 'clean' && bond.state !== 'exchangeable') {
        throw new Error(
          `split: bond ${move.bondId} is ${bond.state} — no clean take-backs via the ordinary ` +
            'exchange chemistry; only a forced split (thermal homolysis) can reverse it',
        );
      }
      const afterBonds = tangle.bonds.filter((b) => b.id !== move.bondId);
      const moveCost = costOfMove(move, afterBonds);
      const tangle2: Tangle = { ...tangle, bonds: afterBonds };
      return { tangle: tangle2, moveCost };
    }
    case 'rebond': {
      const bond = findBond(tangle, move.bondId);
      if (!bond) throw new Error(`rebond: unknown bond ${move.bondId}`);
      if (bond.state !== 'exchangeable') throw new Error(`rebond: bond ${move.bondId} is not exchangeable`);
      if (tangle.freeReserve <= 0) throw new Error('rebond: no free-thiol reserve remaining (oxidative exhaustion)');
      if (move.toClaimId === bond.a || move.toClaimId === bond.b) {
        throw new Error('rebond: target is already one end of this bond');
      }
      if (!tangle.claims.some((c) => c.id === move.toClaimId)) throw new Error('rebond: unknown target claim');
      if (bonded(tangle, bond.a, move.toClaimId)) throw new Error('rebond: target already bonded to the fixed end');
      const newBond: Bond = { ...bond, b: move.toClaimId };
      const afterBonds = tangle.bonds.map((b) => (b.id === move.bondId ? newBond : b));
      const moveCost = costOfMove(move, afterBonds);
      // Free reserve is unchanged: "the sulfur that did the work is un-consumed and free."
      const tangle2: Tangle = { ...tangle, bonds: afterBonds };
      return { tangle: tangle2, moveCost };
    }
    case 'catalyze': {
      const bond = findBond(tangle, move.bondId);
      if (!bond) throw new Error(`catalyze: unknown bond ${move.bondId}`);
      if (bond.state !== 'exchangeable') throw new Error(`catalyze: bond ${move.bondId} is not exchangeable`);
      if (move.claimId === bond.a || move.claimId === bond.b) {
        throw new Error('catalyze: the catalyst must not be one of the bond\'s own endpoints');
      }
      if (!tangle.claims.some((c) => c.id === move.claimId)) throw new Error('catalyze: unknown catalyst claim');
      if (tangle.freeReserve <= 0) throw new Error('catalyze: no free-thiol reserve remaining (oxidative exhaustion)');
      // Locked to `catalyzed`, deliberately NOT `pinned`: this is a lock the *player* created, not
      // the generator's backbone, so — unlike genuine backbone bonds — it must stay recoverable
      // via forced SPLIT (see `types.mts`'s `BondState` doc). Using `pinned` here would make a
      // catalyzed chord bond indistinguishable from the immovable spanning tree.
      const lockedBond: Bond = { ...bond, state: 'catalyzed' };
      const afterBonds = tangle.bonds.map((b) => (b.id === move.bondId ? lockedBond : b));
      const moveCost = costOfMove(move, afterBonds);
      const tangle2: Tangle = { ...tangle, bonds: afterBonds, freeReserve: tangle.freeReserve - 1 };
      return { tangle: tangle2, moveCost };
    }
  }
}

/** Settlement: the tangle's global spatial H¹ (independent cycle count of the whole bond graph)
 * has reached zero — the literal win condition (ANATOMY / brief: "H1 -> 0"). */
export function isSettled(tangle: Tangle): boolean {
  return spatialH1Rank(tangle.bonds) === 0;
}
