/**
 * blackjack/manifest.mts — blackjack's own `CartridgeManifest` (per
 * `@red-cup-engineering/cartridge/manifest`) and its `replayVerifier` export, built from
 * `rules.mts`'s default ruleset so it can never drift out of sync with the game's actual
 * numbers. This is a *per-game* manifest, deliberately not the same object as the service's
 * top-level `catalog-entry.json` — see that file's own `statusNote` for why a service with more
 * than one thing on the floor cannot honestly claim one `replayVerifier` for everything (the
 * same reasoning `parlor-service/catalog-entry.json` gives today for its five games).
 */
import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent } from './engine.mts';
import { BLACKJACK_RULESETS, DEFAULT_RULESET_ID } from './rules.mts';

/** The module a settlement/verification backend calls to independently replay a logged
 *  blackjack round from `(seed, configId, intents)` and check the resulting state hash — built
 *  straight from `createEngine`/`applyIntent`, nothing hand-rolled. */
export const verify = createVerifier({ createEngine, applyIntent });

const DEFAULT_RULES = BLACKJACK_RULESETS[DEFAULT_RULESET_ID];
if (DEFAULT_RULES === undefined) throw new Error('blackjack/manifest: default ruleset missing from BLACKJACK_RULESETS');

export const manifest: CartridgeManifest = {
  id: 'blackjack',
  displayName: 'Blackjack',
  description:
    `A ${DEFAULT_RULES.decks}-deck shoe, dealer ${DEFAULT_RULES.hitSoft17 ? 'hits' : 'stands on'} soft 17, ` +
    `blackjack pays ${DEFAULT_RULES.blackjackPayoutNum}:${DEFAULT_RULES.blackjackPayoutDen}, double/split/late-surrender all in play. ` +
    'Real chip stakes through the house economy (buy in with tickets, wager chips, a jackpot rake on every ' +
    'bet) — and an optional "House Math" panel that computes the exact expected value of standing, ' +
    'hitting, doubling, and splitting against the table’s own live shoe composition, on request, never ' +
    'a static strategy card. No real money in or out, ever.',
  subdomain: 'casino',
  configs: Object.values(BLACKJACK_RULESETS).map((rules) => ({ id: rules.id, displayName: rules.displayName, params: { hitSoft17: rules.hitSoft17 } })),
  entryPoints: {
    browser: '/blackjack.html',
  },
  seedPolicy: { kind: 'client-supplied' },
  intentLog: {
    schemaVersion: 'blackjack-cartridge-v1',
    schemaRef: 'src/games/blackjack/engine.mts#BlackjackIntent',
  },
  replayVerifier: 'src/games/blackjack/manifest.mts#verify',
  energy: {
    hooksRef: 'src/games/blackjack/table.mts#BlackjackTable',
    accountNamespace: 'casino',
  },
  keywords: ['blackjack', 'card-table', 'shoe', 'expected-value', 'house-math', 'chips', 'jackpot-rake', 'cartridge'],
};
