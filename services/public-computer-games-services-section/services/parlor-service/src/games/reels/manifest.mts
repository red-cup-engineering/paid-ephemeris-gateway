/**
 * manifest.mts — Fair Spin's `CartridgeManifest`. `energy` is deliberately omitted, not
 * stubbed: `bankroll` is a practice-only number that never enters or leaves via any real
 * settlement path, so there is nothing for an `energy` block to describe.
 */
import type { CartridgeConfig, CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { applyIntent, createEngine, STARTING_BANKROLL, MIN_BET, MAX_BET } from './engine.mts';

export const verify = createVerifier({ createEngine, applyIntent });

const configs: readonly CartridgeConfig[] = [
  { id: 'default', displayName: 'Fair Spin (practice)', params: { startingBankroll: STARTING_BANKROLL, minBet: MIN_BET, maxBet: MAX_BET } },
];

export const manifest: CartridgeManifest = {
  id: 'reels',
  displayName: 'Fair Spin',
  description:
    'A 3-reel practice slot that inverts the genre: computed RTP, exact per-symbol hit odds, and ' +
    'expected loss per 100 spins are shown permanently on the machine face, never behind a click. ' +
    'Practice bankroll only — no real currency ever enters or leaves. Every action is typed on ' +
    'screen as freely reversible or terminal, and a running session summary compares your actual ' +
    'spins against the published distribution.',
  subdomain: 'parlor',
  configs,
  entryPoints: {
    browser: '/reels/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'reels-cartridge-v1',
    schemaRef: 'src/games/reels/engine.mts#applyIntent',
  },
  replayVerifier: 'src/games/reels/manifest.mts#verify',
  keywords: ['slot-machine', 'practice-bankroll', 'published-odds', 'rtp', 'no-dark-patterns', 'earn-only'],
};
