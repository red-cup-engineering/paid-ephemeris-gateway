/**
 * `replay` — thin: delegates straight to `@red-cup-engineering/cartridge/replay`'s own reference
 * `defaultReplay`, exactly the pattern `@red-cup-engineering/cartridge/fixtures/toy-engine.mjs` itself
 * uses (its `replay` export is a one-line call to the same function). No hand-rolled replay loop
 * lives in this codebase — `engine.mts#createEngine`/`applyIntent` are already the pure functions
 * `defaultReplay` needs, so writing a second loop here would only be a second place for the
 * replay logic to drift from the package's own tested implementation.
 */
import { defaultReplay } from '@red-cup-engineering/cartridge/replay';
import type { ReplayResult } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent } from './engine.mts';
import type { BankrollState, WagerIntent } from './types.mts';

export function replay(
  seed: string,
  intents: readonly WagerIntent[],
  configId?: string,
): ReplayResult<BankrollState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}
