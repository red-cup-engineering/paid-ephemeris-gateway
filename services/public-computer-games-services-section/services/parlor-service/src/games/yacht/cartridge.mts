/**
 * yacht/cartridge.mts — Yacht's `@red-cup-engineering/cartridge` adoption. See `pig/cartridge.mts`'s
 * header for the shared rationale.
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import type { Cartridge } from '@red-cup-engineering/cartridge/replay';
import { createEngine, applyIntent, type YachtState, type YachtIntent } from './engine.mts';

export const yachtCartridge: Cartridge<YachtState, YachtIntent> = buildCartridge(createEngine, applyIntent);
