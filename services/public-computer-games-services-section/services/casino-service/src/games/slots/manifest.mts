/**
 * slots/manifest.mts — "Tideline Treasures"'s own `CartridgeManifest` and `replayVerifier`
 * export, built from `rules.mts`'s default ruleset and `ev.mts`'s computed math so neither can
 * drift out of sync with the game's actual numbers — the identical discipline
 * `blackjack/manifest.mts` establishes. A per-game manifest, deliberately not the same object as
 * `catalog-entry.json` — see that file's own `statusNote` (unchanged reasoning from blackjack's
 * pass: a service with more than one game on the floor cannot honestly point one top-level
 * `replayVerifier` at two unrelated engines at once).
 */
import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent } from './engine.mts';
import { SLOTS_RULESETS, DEFAULT_SLOTS_RULESET_ID } from './rules.mts';
import { computeHouseMath } from './ev.mts';

/** The module a settlement/verification backend calls to independently replay a logged slots
 *  round from `(seed, configId, intents)` and check the resulting state hash — built straight
 *  from `createEngine`/`applyIntent`, nothing hand-rolled. */
export const verify = createVerifier({ createEngine, applyIntent });

const DEFAULT_RULES = SLOTS_RULESETS[DEFAULT_SLOTS_RULESET_ID];
if (DEFAULT_RULES === undefined) throw new Error('slots/manifest: default ruleset missing from SLOTS_RULESETS');

const math = computeHouseMath(DEFAULT_RULES);

export const manifest: CartridgeManifest = {
  id: 'slots',
  displayName: DEFAULT_RULES.displayName,
  description:
    `A ${DEFAULT_RULES.reelCount}-reel, ${DEFAULT_RULES.rows}-row, ${DEFAULT_RULES.paylines.length}-payline video slot — ` +
    `wilds, a scatter-triggered (and retriggerable) free-spin bonus at ${DEFAULT_RULES.freeSpinMultiplier}x payouts, and a ` +
    `progressive jackpot fed by the house's shared pool. Exact reel RTP ${(math.reelRTP * 100).toFixed(2)}%, ` +
    `exact free-spin contribution +${(math.freeSpinRTPContribution * 100).toFixed(2)}%, overall ` +
    `${(math.overallRTP * 100).toFixed(2)}% — computed by full-grid enumeration over ${math.combinations.toLocaleString('en-US')} ` +
    `equally-likely reel-stop combinations, never asserted. Jackpot odds: 1 in ${math.jackpotOddsOneIn.toLocaleString('en-US')}, exact. ` +
    'Real chip stakes through the house economy (buy in with tickets, wager chips, a jackpot rake on every spin) — ' +
    'and an optional "House Math" panel disclosing every figure above, on request. No real money in or out, ever.',
  subdomain: 'casino',
  configs: Object.values(SLOTS_RULESETS).map((rules) => ({
    id: rules.id,
    displayName: rules.displayName,
    params: { reels: rules.reelCount, rows: rules.rows, paylines: rules.paylines.length },
  })),
  entryPoints: {
    browser: '/slots.html',
  },
  seedPolicy: { kind: 'client-supplied' },
  intentLog: {
    schemaVersion: 'slots-cartridge-v1',
    schemaRef: 'src/games/slots/engine.mts#SlotsIntent',
  },
  replayVerifier: 'src/games/slots/manifest.mts#verify',
  energy: {
    hooksRef: 'src/games/slots/table.mts#SlotsTable',
    accountNamespace: 'casino',
  },
  keywords: ['slots', 'video-slot', 'wild', 'scatter', 'free-spins', 'progressive-jackpot', 'house-math', 'chips', 'jackpot-rake', 'cartridge', 'tideline-treasures'],
};
