/**
 * `daily` — thin wrapper over `@red-cup-engineering/cartridge/seed`'s `dailySeed(gameId, date, configId)`.
 *
 * Unlike solitaire-service (which predates `@red-cup-engineering/cartridge` and hand-rolls its own daily
 * hashing) or crucible-service (which also predates it), this service ships after cartridge
 * 0.1.0, so there is no reason to re-derive the `daily-utc` seed policy locally — cartridge
 * already owns that hashing, tested, in one place every cartridge-adopting game shares. This
 * file's only job is naming Kelly's Wager's own `gameId` so every call site shares one constant.
 */
import { dailySeed as cartridgeDailySeed } from '@red-cup-engineering/cartridge/seed';

export const GAME_ID = 'gambling-trainer';

/** `dailySeed(date, configId?)` — `date` may be a `Date` (its UTC calendar day is used) or an
 * already-formatted `YYYY-MM-DD` string, matching cartridge's own `dailySeed` signature exactly,
 * minus the `gameId` parameter (fixed to `GAME_ID` here so every call site in this service shares
 * the same seed namespace without repeating the id). */
export function dailySeed(date: Date | string, configId?: string): string {
  return cartridgeDailySeed(GAME_ID, date, configId);
}
