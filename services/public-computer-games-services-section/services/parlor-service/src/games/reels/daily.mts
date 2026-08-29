/**
 * daily.mts — Fair Spin's daily seed. Unlike the dice trio or Chutes & Ladders, "today's spins"
 * is a weaker pedagogical hook for a solo practice machine than for a race or a shared board —
 * it is provided anyway, for consistency with every other parlor game's `daily.mts` shape and
 * because a shared daily seed still means "today's session looks the same for everyone who
 * hasn't started their own `'new-session'`" — a thin wrapper over
 * `@red-cup-engineering/parlor-kernel/seed`'s `dailySeed`.
 */
import { dailySeed as kernelDailySeed } from '@red-cup-engineering/parlor-kernel/seed';
import { GAME_ID } from './engine.mts';

export function dailySeed(date, configId) {
  return kernelDailySeed(GAME_ID, date, configId);
}
