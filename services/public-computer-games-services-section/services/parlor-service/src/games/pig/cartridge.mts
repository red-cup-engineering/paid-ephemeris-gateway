/**
 * pig/cartridge.mts — Pig's `@red-cup-engineering/cartridge` adoption. `createEngine`/`applyIntent` are
 * already pure and already the kernel's own turn reducer (`engine.mts`); this module changes
 * not one line of them, it only wraps them via `@red-cup-engineering/parlor-kernel/replay`'s
 * `buildCartridge`, which supplies `replay` (via `defaultReplay`) and identity
 * `serialize`/`deserialize` for free — `PigState` is already plain JSON.
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type PigState, type PigIntent } from './engine.mts';

export const pigCartridge: Cartridge<PigState, PigIntent> = buildCartridge(createEngine, applyIntent);
