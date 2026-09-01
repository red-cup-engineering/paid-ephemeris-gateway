/**
 * farkle/cartridge.mts — Farkle's `@red-cup-engineering/cartridge` adoption. See `pig/cartridge.mts`'s
 * header for the shared rationale: `buildCartridge` supplies `replay`/`serialize`/
 * `deserialize` for free over an already-pure, already-plain-JSON `{ createEngine, applyIntent }`.
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type FarkleState, type FarkleIntent } from './engine.mts';

export const farkleCartridge: Cartridge<FarkleState, FarkleIntent> = buildCartridge(createEngine, applyIntent);
