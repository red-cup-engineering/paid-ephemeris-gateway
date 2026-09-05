/**
 * cartridge.mts — the thin `Cartridge<State, Intent>` wrapper, built entirely from
 * `@red-cup-engineering/parlor-kernel/replay`'s `buildCartridge` (no hand-rolled `replay`/`serialize`/
 * `deserialize` here — `State` is already plain JSON, matching `pig-fixture`'s own case).
 */
import { buildCartridge } from '@red-cup-engineering/parlor-kernel/replay';
import { createEngine, applyIntent } from './engine.mts';

export const chutesCartridge = buildCartridge(createEngine, applyIntent);
export { createEngine, applyIntent };
