/**
 * slots/cartridge.mts — "Tideline Treasures"'s `@red-cup-engineering/cartridge` adoption, built
 * the identical way `blackjack/cartridge.mts` is: `createEngine`/`applyIntent` (engine.mts) are
 * already pure, so this module only wraps them into a complete
 * `Cartridge<SlotsState, SlotsIntent>` via `@red-cup-engineering/parlor-kernel/replay`'s
 * generic `buildCartridge` factory.
 *
 * `serialize`/`deserialize` are the identity function: `SlotsState` is already plain JSON (a
 * grid is `string[][]`, `lineWins`/`bonusSpins` are plain arrays of plain objects — nothing here
 * is a `Map`/`Set`/class instance), so `deserialize(serialize(s))` deep-equals `s` by
 * construction, exactly `@red-cup-engineering/cartridge/replay#Cartridge`'s own contract.
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type SlotsState, type SlotsIntent } from './engine.mts';

export const slotsCartridge: Cartridge<SlotsState, SlotsIntent> = buildCartridge(createEngine, applyIntent);
