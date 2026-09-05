/**
 * `cartridge.manifest` — solitaire's `CartridgeManifest` and its `replayVerifier` entry point.
 * `configs` is generated directly from `engine.mts::VARIANT_LIST` — every shipped variant, each a
 * legal `configId` for `cartridge.mts`'s `createEngine` — rather than hand-enumerated, so this
 * list can never drift out of sync with the actual variant roster.
 *
 * `seedPolicy: { kind: "daily-utc" }` names `daily.mts::dailySeed(date, variantId)`. Solitaire's
 * live app also accepts a client-supplied `?seed=` for arbitrary seeded play; the manifest states
 * `daily-utc` as the one all-players-converge-on-the-same-board policy — `createEngine`/`replay`
 * themselves remain agnostic to which policy produced the seed string they were handed.
 *
 * `energy` is omitted: solitaire has no ledger/payments module (README's "No accounts, payments,
 * or ledger").
 */
import type { CartridgeConfig, CartridgeManifest } from '@red-cup-engineering/cartridge/manifest';
import { createVerifier } from '@red-cup-engineering/cartridge/replay';
import { applyIntent, createEngine } from './cartridge.mts';
import { VARIANT_LIST } from './engine.mts';

/** The standalone replay-verifier entry point named by `manifest.replayVerifier` below — callable
 * with nothing but this module, per the spec's intent ("tooling... can verify a playthrough
 * without importing the game's full engine module graph, only this one function"). */
export const verify = createVerifier({ createEngine, applyIntent });

const configs: readonly CartridgeConfig[] = VARIANT_LIST.map((variant) => ({
  id: variant.id,
  displayName: variant.name,
  params: { decks: variant.decks, suitsInPlay: variant.suitsInPlay, drawCount: variant.drawCount },
}));

export const manifest: CartridgeManifest = {
  id: 'solitaire',
  displayName: 'Solitaire',
  description:
    'One rules engine, variant rules as data: Klondike, FreeCell, Spider (1/2/4-suit), Yukon, Forty Thieves, Golf, TriPeaks, and Pyramid all read from the same declarative VariantSpec, with deterministic seeded deals, a solver-certified FreeCell deal generator, and a move-log that doubles as undo/redo and replay source.',
  subdomain: 'solitaire',
  configs,
  entryPoints: {
    browser: '/',
  },
  seedPolicy: { kind: 'daily-utc' },
  intentLog: {
    schemaVersion: 'solitaire-cartridge-v1',
    schemaRef: 'src/cartridge.mts#SolitaireIntent',
  },
  replayVerifier: 'src/cartridge.manifest.mts#verify',
  keywords: ['klondike', 'freecell', 'spider', 'yukon', 'solitaire', 'card-game'],
};
