/**
 * cartridge.mts — the thin `Cartridge<State, Intent>` wrapper, built from
 * `@red-cup-engineering/parlor-kernel/replay`'s `buildCartridge` (no hand-rolled `replay`/`serialize`/
 * `deserialize` — `State` is already plain JSON).
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent } from './engine.mts';

export const reelsCartridge = buildCartridge(createEngine, applyIntent);
export { createEngine, applyIntent };
