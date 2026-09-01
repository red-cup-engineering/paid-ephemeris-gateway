/**
 * pig/manifest.mts — Pig's `CartridgeManifest` (per `@red-cup-engineering/cartridge/manifest`) and its
 * `replayVerifier` entry point, built from `rules.mts#PIG_RULES` so the manifest can never
 * drift out of sync with the actual target score.
 */
import type { CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent } from './engine.mts';
import { PIG_RULES } from './rules.mts';

export const verify = createVerifier({ createEngine, applyIntent });

export const manifest: CartridgeManifest = {
  id: PIG_RULES.id,
  displayName: PIG_RULES.displayName,
  description:
    `Hold-or-roll, first to ${PIG_RULES.target}. Every roll-or-hold decision shows the ` +
    'computed bust probability and expected value of rolling again — the teaching surface, not ' +
    'an afterthought. Earn-only, practice scorekeeping only: no wagering, nothing staked.',
  subdomain: 'parlor',
  entryPoints: {
    browser: '/pig/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'pig-cartridge-v1',
    schemaRef: 'src/games/pig/engine.mts#PigIntent',
  },
  replayVerifier: 'src/games/pig/manifest.mts#verify',
  keywords: ['pig', 'dice-game', 'hold-or-roll', 'expected-value', 'daily-puzzle', 'earn-only'],
};
