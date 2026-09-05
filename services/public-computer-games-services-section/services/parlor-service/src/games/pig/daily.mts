/**
 * pig/daily.mts — thin wrapper over `@red-cup-engineering/parlor-kernel/seed`'s `dailySeed(gameId, date,
 * configId)`, which itself namespaces every parlor game under `parlor:<gameId>` before
 * delegating to `@red-cup-engineering/cartridge/seed`. This file's only job is fixing Pig's own `gameId`
 * so every call site in this game shares one constant, and so today's dice really are the
 * daily seed's dice, identically, for every player, everywhere this constant is used.
 */
import { dailySeed as kernelDailySeed } from '@red-cup-engineering/parlor-kernel/seed';

export const GAME_ID = 'pig';

export function dailySeed(date: Date | string, configId?: string): string {
  return kernelDailySeed(GAME_ID, date, configId);
}
