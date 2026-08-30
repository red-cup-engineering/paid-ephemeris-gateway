/**
 * blackjack/cartridge.mts — blackjack's `@red-cup-engineering/cartridge` adoption. `createEngine`/
 * `applyIntent` (engine.mts) are already pure; this module changes not one line of them, it
 * only wraps them into a complete `Cartridge<BlackjackState, BlackjackIntent>` using
 * `@red-cup-engineering/cartridge/replay`'s own `defaultReplay` for `replay` — the same
 * thin-wrap discipline `parlor-service`'s sibling games use via `parlor-kernel/replay#buildCartridge`,
 * written out by hand here since this service does not depend on `parlor-kernel` (blackjack has
 * no multi-seat turn order for that package's `turns.mjs` to generalize — see engine.mts's own
 * header).
 *
 * `serialize`/`deserialize` are the identity function: `BlackjackState` is already plain JSON
 * (a `Shoe` is `{ cards: Card[], cursor, cutIndex, decks, penetration }`, a `Card` is
 * `{ suit, rank, faceUp }` — nothing here is a `Map`/`Set`/class instance), so
 * `deserialize(serialize(s))` deep-equals `s` by construction, exactly the contract
 * `@red-cup-engineering/cartridge/replay#Cartridge` documents.
 */
import { defaultReplay } from '@red-cup-engineering/cartridge/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type BlackjackState, type BlackjackIntent } from './engine.mts';

export const blackjackCartridge: Cartridge<BlackjackState, BlackjackIntent> = {
  createEngine,
  applyIntent,
  replay: (seed, intents, configId) => defaultReplay({ createEngine, applyIntent }, seed, intents, configId),
  serialize: (state) => state,
  deserialize: (data) => data as BlackjackState,
};
