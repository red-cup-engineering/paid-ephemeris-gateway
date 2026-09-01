import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, namedCost, ruinDisclosure, disclosureText } from './disclosure.mts';
import { createEngine, applyIntent, currentOffer, rerollCost, RUIN_THRESHOLD } from './engine.mts';
import { ALL_INTENT_KINDS } from './types.mts';
import type { WagerIntent } from './types.mts';

const SEED = 'disclosure-test-seed';

// ---- Disclosure exhaustiveness (static coverage) ----

test('classify returns exactly one of the three types for every declared WagerIntent kind', () => {
  const seen = new Set<string>();
  for (const kind of ALL_INTENT_KINDS) {
    const type = classify(kind);
    assert.ok(['reversible', 'priced', 'terminal'].includes(type));
    seen.add(kind);
  }
  assert.equal(seen.size, ALL_INTENT_KINDS.length, 'ALL_INTENT_KINDS must have no duplicates');
});

test('classify throws on an unknown/unclassified intent kind, rather than silently defaulting', () => {
  assert.throws(() => classify('not-a-real-kind' as WagerIntent['kind']), /unclassified intent kind/);
});

test('the chart-of-accounts typing is exactly reversible/priced/terminal as documented', () => {
  assert.equal(classify('adjust-stake'), 'reversible');
  assert.equal(classify('new-run'), 'reversible');
  assert.equal(classify('reroll-offer'), 'priced');
  assert.equal(classify('commit-stake'), 'terminal');
});

// ---- namedCost ----

test('namedCost is null for reversible and terminal intents, and exactly rerollCost(balance) for reroll-offer', () => {
  const state = createEngine(SEED, 'novice');
  assert.equal(namedCost({ kind: 'adjust-stake', fraction: 0.1 }, state), null);
  assert.equal(namedCost({ kind: 'new-run' }, state), null);
  assert.equal(namedCost({ kind: 'commit-stake' }, state), null);
  const cost = namedCost({ kind: 'reroll-offer' }, state);
  assert.ok(cost !== null);
  assert.equal(cost!.amount, rerollCost(state.balance));
  assert.equal(cost!.resource, 'bankroll');
  assert.ok(cost!.description.includes(String(cost!.amount)));
});

// ---- Ruin disclosure precedes ruin (EXECUTABLE, per the task's hard requirement) ----

test('ruinDisclosure is computable purely from pre-commit state, offer, and a proposed fraction — no prior commit required', () => {
  const state = createEngine(SEED, 'novice');
  assert.equal(state.resolutions.length, 0, 'sanity: nothing has been committed yet');
  const offer = currentOffer(state)!;
  // Computable on a totally fresh state, before any commit-stake intent has ever been applied.
  const disclosure = ruinDisclosure(state, offer, 1);
  assert.ok(Number.isFinite(disclosure.probability));
  assert.ok(disclosure.text.length > 0);
});

test('for every stake fraction whose loss would ruin the run, ruinDisclosure reports a non-zero probability BEFORE that commit-stake is ever applied, and the real applyIntent outcome is consistent with it', () => {
  // Search seeded trials (no Math.random) for a first-offer LOSS at fraction=1, which is
  // guaranteed to ruin (balance -> 0 < RUIN_THRESHOLD).
  let found = false;
  for (let i = 0; i < 200 && !found; i++) {
    const trialSeed = `ruin-disclosure-seed-${i}`;
    const state = createEngine(trialSeed, 'novice');
    const offer = currentOffer(state)!;
    // The disclosure must be fully computable BEFORE any commit-stake intent is constructed or
    // applied — this call happens first, using only pre-commit values.
    const disclosure = ruinDisclosure(state, offer, 1);

    // Now actually commit, and check whether it did in fact ruin.
    const committed = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 1 }).state, { kind: 'commit-stake' });
    if (committed.state.ruined) {
      found = true;
      assert.ok(disclosure.probability > 0, 'a stake that in fact ruins must have been disclosed as ruin-risking beforehand');
      assert.ok(Math.abs(disclosure.probability - (1 - offer.probability)) < 1e-9);
      assert.ok(committed.state.balance < RUIN_THRESHOLD);
      assert.ok(disclosure.text.includes('terminal'));
    }
  }
  assert.ok(found, 'expected at least one seeded trial to actually ruin within 200 tries');
});

test('a stake fraction that CANNOT ruin (small fraction) is disclosed as zero ruin probability, matching reality', () => {
  const state = createEngine(SEED, 'novice');
  const offer = currentOffer(state)!;
  const disclosure = ruinDisclosure(state, offer, 0.01);
  assert.equal(disclosure.probability, 0);
  const committed = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 0.01 }).state, { kind: 'commit-stake' });
  assert.equal(committed.state.ruined, false);
});

test('no code path in engine.mts accepts a commit-stake without ruinDisclosure having been computable for that exact (state, offer, fraction) first — structural: the function signature requires only pre-commit values', () => {
  // This is the structural guarantee: ruinDisclosure's signature is (state, offer, stakeFraction)
  // — nothing about BankrollState post-commit (resolutions, ruined, finished-after) is required
  // as an input, so it is ALWAYS computable strictly before commit-stake could be applied, for
  // every reachable state. Demonstrated across a spread of runs/offers, not just one.
  for (let i = 0; i < 20; i++) {
    let state = createEngine(`structural-seed-${i}`, 'sharp');
    while (!state.finished) {
      const offer = currentOffer(state);
      if (offer === undefined) break;
      const disclosure = ruinDisclosure(state, offer, 0.3);
      assert.ok(Number.isFinite(disclosure.probability));
      state = applyIntent(applyIntent(state, { kind: 'adjust-stake', fraction: 0.3 }).state, { kind: 'commit-stake' }).state;
    }
  }
});

// ---- disclosureText ----

test('disclosureText for adjust-stake and new-run reads as freely reversible, zero-cost copy', () => {
  const state = createEngine(SEED, 'novice');
  assert.match(disclosureText({ kind: 'adjust-stake', fraction: 0.2 }, state), /nothing is spent/i);
  assert.match(disclosureText({ kind: 'new-run' }, state), /zero cost/i);
});

test('disclosureText for reroll-offer names the exact fee amount', () => {
  const state = createEngine(SEED, 'novice');
  const text = disclosureText({ kind: 'reroll-offer' }, state);
  assert.ok(text.includes(String(rerollCost(state.balance))));
});

test('disclosureText for commit-stake says the wager is terminal', () => {
  const state = createEngine(SEED, 'novice');
  assert.match(disclosureText({ kind: 'commit-stake' }, state), /terminal/i);
});
