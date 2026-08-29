/**
 * `manifest` — Kelly's Wager's `CartridgeManifest` (per `@red-cup-engineering/cartridge/manifest`) and its
 * `replayVerifier` entry point, built from `wagers.mts#WAGER_CONFIGS` directly (onestone's
 * `LEVELS`-driven `configs` pattern) so this list can never drift out of sync with the actual
 * difficulty/variance tracks the way a hand-copied list could.
 *
 * `energy` is deliberately OMITTED — not stubbed, not a placeholder field waiting to be filled
 * in. Kelly's Wager is a practice-only bankroll (HARD ECONOMY LINE): no real currency enters or
 * leaves, and nothing in this game settles against `@red-cup-engineering/energy-bank`. This is the exact
 * distinction wilder-conceptions-01.md item 7's own scoping note draws: the by-hand chart of
 * accounts (DESIGN.md) types the practice-bankroll wagering loop's spends (reversible/priced/
 * terminal), which is a *different* exercise from item 1's Carrier Audit (which types real
 * energy-bank settlement backends — e.g. a future ad-revenue-shared completion reward). If this
 * game ever ships a real-currency-adjacent reward path, that is a separate `energy` block added
 * later with its own Carrier Audit entry — not something to guess at now.
 */
import type { CartridgeConfig, CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { applyIntent, createEngine } from './cartridge.mts';
import { WAGER_CONFIGS } from './wagers.mts';

export const verify = createVerifier({ createEngine, applyIntent });

const configs: readonly CartridgeConfig[] = WAGER_CONFIGS.map((spec) => ({
  id: spec.id,
  displayName: spec.displayName,
  params: { offerCount: spec.offerCount, trapRate: spec.trapRate },
}));

export const manifest: CartridgeManifest = {
  id: 'gambling-trainer',
  displayName: "Kelly's Wager",
  description:
    'A daily-seeded, practice-bankroll trainer for expected value, variance, and Kelly-criterion ' +
    'sizing. Every offer is graded against the real Kelly optimum, adversarially-framed traps are ' +
    'labeled honestly by the numbers even when the pitch lies, and every spend is typed on screen ' +
    'as freely reversible, priced, or terminal. Earn-only: no real currency ever enters or leaves.',
  subdomain: 'gambling-trainer',
  configs,
  entryPoints: {
    browser: '/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'gambling-trainer-cartridge-v1',
    schemaRef: 'src/cartridge.mts#WagerIntent',
  },
  replayVerifier: 'src/manifest.mts#verify',
  keywords: ['kelly-criterion', 'bankroll-management', 'expected-value', 'daily-puzzle', 'practice-bankroll'],
};
