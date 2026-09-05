/**
 * daily.mts — "the day's dice are the daily seed's dice": today's race, for every player,
 * everywhere. A thin wrapper over `@red-cup-engineering/parlor-kernel/seed`'s `dailySeed`, matching every
 * other parlor game's `daily.mts` shape.
 */
import { dailySeed as kernelDailySeed } from '@red-cup-engineering/parlor-kernel/seed';
import { GAME_ID } from './engine.mts';

export function dailySeed(date, configId) {
  return kernelDailySeed(GAME_ID, date, configId);
}
