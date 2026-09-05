/**
 * yacht/manifest.mts — Yacht's `CartridgeManifest`, built from `rules.mts#YACHT_RULES`.
 */
import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent } from './engine.mts';
import { YACHT_RULES } from './rules.mts';

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: YACHT_RULES.id,
  displayName: YACHT_RULES.displayName,
  description:
    `${YACHT_RULES.diceCount} dice, up to ${YACHT_RULES.maxRolls} rolls a turn, ${YACHT_RULES.categories.length} ` +
    'standard categories. Every category shows its exact score if you commit now and its exact expected value ' +
    'if you reroll once more, live, recomputed after every roll and every hold. Earn-only, practice scorekeeping only.',
  subdomain: 'parlor',
  entryPoints: {
    browser: '/yacht/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'yacht-cartridge-v1',
    schemaRef: 'src/games/yacht/engine.mts#YachtIntent',
  },
  replayVerifier: 'src/games/yacht/manifest.mts#verify',
  keywords: ['yacht', 'dice-game', 'category-scoring', 'expected-value', 'daily-puzzle', 'earn-only'],
};
