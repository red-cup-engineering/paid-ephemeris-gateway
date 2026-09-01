/**
 * blackjack/cartridge.mts — blackjack's `@red-cup-engineering/cartridge` adoption. `createEngine`/
 * `applyIntent` (engine.mts) are already pure; this module changes not one line of them, it
 * only wraps them into a complete `Cartridge<BlackjackState, BlackjackIntent>` using
 * `@red-cup-engineering/parlor-kernel/replay`'s generic `buildCartridge` factory. Blackjack
 * does not need parlor-kernel's multi-seat turn order merely to obtain standard replay wiring.
 *
 * `serialize`/`deserialize` are the identity function: `BlackjackState` is already plain JSON
 * (a `Shoe` is `{ cards: Card[], cursor, cutIndex, decks, penetration }`, a `Card` is
 * `{ suit, rank, faceUp }` — nothing here is a `Map`/`Set`/class instance), so
 * `deserialize(serialize(s))` deep-equals `s` by construction, exactly the contract
 * `@red-cup-engineering/cartridge/replay#Cartridge` documents.
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type BlackjackState, type BlackjackIntent } from './engine.mts';

export const blackjackCartridge: Cartridge<BlackjackState, BlackjackIntent> = buildCartridge(createEngine, applyIntent);
