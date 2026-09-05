/**
 * yacht/daily.mts — thin wrapper over `@red-cup-engineering/parlor-kernel/seed`'s `dailySeed`. See
 * `pig/daily.mts`'s header for the shared rationale.
 */
import { dailySeed as kernelDailySeed } from '@red-cup-engineering/parlor-kernel/seed';

export const GAME_ID = 'yacht';

export function dailySeed(date: Date | string, configId?: string): string {
  return kernelDailySeed(GAME_ID, date, configId);
}
