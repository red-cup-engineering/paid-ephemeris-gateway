/**
 * farkle/manifest.mts — Farkle's `CartridgeManifest`, built from `rules.mts#FARKLE_RULES`.
 */
import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent } from './engine.mts';
import { FARKLE_RULES } from './rules.mts';

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: FARKLE_RULES.id,
  displayName: FARKLE_RULES.displayName,
  description:
    `Dice-set scoring, hot dice, and a real chance to bust the whole turn. First to ${FARKLE_RULES.targetScore} ` +
    `wins (${FARKLE_RULES.entryThreshold} to get on the board). Every roll-or-bank decision shows the computed ` +
    'bust probability and expected value of rolling again. Earn-only, practice scorekeeping only.',
  subdomain: 'parlor',
  entryPoints: {
    browser: '/farkle/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'farkle-cartridge-v1',
    schemaRef: 'src/games/farkle/engine.mts#FarkleIntent',
  },
  replayVerifier: 'src/games/farkle/manifest.mts#verify',
  keywords: ['farkle', 'dice-game', 'hot-dice', 'expected-value', 'daily-puzzle', 'earn-only'],
};
