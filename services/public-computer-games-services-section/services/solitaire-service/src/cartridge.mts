/**
 * `cartridge` — solitaire's `@red-cup-engineering/cartridge` adoption: a pure, replayable engine over the
 * existing `GameState`, wrapping (never rewriting) `engine.mts`/`daily.mts`. `createEngine` is
 * `dealTable(seed, variant)`, `applyIntent` is the existing move-application step (`applyMove`/
 * `drawFromStock`/`redealStock`, already pure), and `replay`/`replayTo` already exist under this
 * exact shape — this module changes no line of `engine.mts`, `daily.mts`, or `cards.mts`, it only
 * names already-pure functions under the `Cartridge` object literal.
 *
 * `GameState.log` (a `LogEntry[]`) is already solitaire's move-log (README's "Move-log =
 * undo/redo backing = replay source") — it is exactly the `IntentLog` the cartridge interface
 * wants, just under a different name, with `applyMove`/`drawFromStock`/`redealStock` doing the
 * appending internally rather than a caller building `LogEntry` values by hand. `applyIntent`
 * below is the adapter: a `SolitaireIntent` carries exactly what a `Move` (or a draw/redeal
 * request) needs, plus the optional `ts` the intent-log envelope defines, passed straight through
 * as the `now` argument every mutating `engine.mts` function already takes.
 */
import type { Cartridge, ApplyResult, ReplayResult } from '@red-cup-engineering/cartridge/replay';
import { defaultReplay } from '@red-cup-engineering/cartridge/replay';
import type { GameEvent, Intent } from '@red-cup-engineering/cartridge/intent-log';
import type { Card } from './cards.mts';
import type { GameState, LogEntry, VariantSpec } from './engine.mts';
import { KLONDIKE_DRAW1, VARIANTS, applyMove, checkWin, dealTable, drawFromStock, redealStock } from './engine.mts';

/** Solitaire's `GameState` already *is* the `Cartridge<State>`'s `State` — plain JSON data
 * (`piles: Record<string, Card[]>`, `log: LogEntry[]`) with no further projection needed. Kept
 * as an alias so this module's exports read in cartridge vocabulary without inventing a second
 * state shape solitaire doesn't have. */
export type SolitaireState = GameState;

/** Every intent kind that maps onto one of `engine.mts`'s three mutating functions. `move`
 * carries exactly `Move`'s fields (`from`/`to`/`count`); `draw` and `redeal` take no payload
 * beyond the optional `ts`, since `drawFromStock` already dispatches Klondike- vs Spider-style
 * behavior structurally (on the variant's declared pile shape). `ts` defaults to `0` when absent,
 * matching every `now = 0` default already in `engine.mts`. */
export type SolitaireIntent =
  | { readonly kind: 'move'; readonly from: string; readonly to: string; readonly count: number; readonly ts?: number }
  | { readonly kind: 'draw'; readonly ts?: number }
  | { readonly kind: 'redeal'; readonly ts?: number };

function variantFor(state: SolitaireState): VariantSpec {
  const variant = VARIANTS[state.variantId];
  if (!variant) throw new RangeError(`applyIntent: unknown variantId "${state.variantId}"`);
  return variant;
}

function resolveVariant(configId: string | undefined): VariantSpec {
  if (configId === undefined) return KLONDIKE_DRAW1;
  const variant = VARIANTS[configId];
  if (!variant) throw new RangeError(`createEngine: unknown configId (variant id) "${configId}"`);
  return variant;
}

/** The `LogEntry` an `engine.mts` mutator just appended, and whether that transition won the
 * game, folded into the `GameEvent[]` a cartridge caller (audit page, animation layer) consumes
 * — `engine.mts` itself has no event concept, only the log, so this is purely a read of what the
 * mutator already recorded, never new domain logic. */
function eventsSince(variant: VariantSpec, before: SolitaireState, after: SolitaireState): GameEvent[] {
  if (after.cursor <= before.cursor) return [];
  const entry = after.log[after.cursor - 1] as LogEntry | undefined;
  if (!entry) return [];
  const events: GameEvent[] = [{ kind: entry.kind, from: entry.from, to: entry.to, count: entry.count, seq: entry.seq }];
  if (checkWin(variant, after)) events.push({ kind: 'win' });
  return events;
}

// ── the Cartridge contract ──────────────────────────────────────────────────────────────────

/** Pure. `configId` selects the `VariantSpec` (from `VARIANT_LIST`), defaulting to
 * `klondike-draw1` when omitted. `seed` is passed straight into `dealTable`, matching solitaire's
 * existing `?seed=…&variant=…` URL shape and `dailySeed(date, variantId)`'s output one-for-one —
 * the manifest's `seedPolicy` documents how a seed is chosen; this function only consumes the
 * resulting string. */
export function createEngine(seed: string, configId?: string): SolitaireState {
  const variant = resolveVariant(configId);
  return dealTable(seed, variant);
}

export function applyIntent(state: SolitaireState, intent: SolitaireIntent): ApplyResult<SolitaireState> {
  const variant = variantFor(state);
  switch (intent.kind) {
    case 'move': {
      const next = applyMove(variant, state, { from: intent.from, to: intent.to, count: intent.count }, intent.ts ?? 0);
      return { state: next, events: eventsSince(variant, state, next) };
    }
    case 'draw': {
      const next = drawFromStock(variant, state, intent.ts ?? 0);
      return { state: next, events: eventsSince(variant, state, next) };
    }
    case 'redeal': {
      const next = redealStock(variant, state, intent.ts ?? 0);
      return { state: next, events: eventsSince(variant, state, next) };
    }
    default: {
      const never: { kind: string } = intent;
      throw new TypeError(`applyIntent: unknown intent kind "${never.kind}"`);
    }
  }
}

/** Delegates to the package's own reference implementation — no hand-rolled replay loop lives in
 * this codebase, matching `onestone-service`/`flickering-delve-service`'s cartridge modules.
 * `engine.mts`'s own `replay`/`replayTo` remain the undo/redo backing inside the live app; this
 * is the cartridge-facing entry point tooling outside this service calls. */
export function replay(
  seed: string,
  intents: readonly SolitaireIntent[],
  configId?: string,
): ReplayResult<SolitaireState> {
  return defaultReplay({ createEngine, applyIntent }, seed, intents, configId);
}

/** `GameState` is already plain JSON data; serialize/deserialize round-trip it structurally with
 * a cheap shape check, matching `onestone-service/src/cartridge.mts`'s posture. */
export function serialize(state: SolitaireState): unknown {
  const piles: Record<string, Card[]> = {};
  for (const [id, pile] of Object.entries(state.piles)) piles[id] = pile.map((c) => ({ ...c }));
  return { ...state, piles, log: state.log.map((e) => ({ ...e })) };
}

export function deserialize(data: unknown): SolitaireState {
  if (typeof data !== 'object' || data === null) throw new TypeError('deserialize: malformed GameState');
  const d = data as Record<string, unknown>;
  if (typeof d['seed'] !== 'string' || typeof d['variantId'] !== 'string' || typeof d['piles'] !== 'object' || d['piles'] === null) {
    throw new TypeError('deserialize: malformed GameState');
  }
  return d as unknown as SolitaireState;
}

export const solitaireCartridge: Cartridge<SolitaireState, SolitaireIntent & Intent> = {
  createEngine,
  applyIntent: applyIntent as (state: SolitaireState, intent: SolitaireIntent & Intent) => ApplyResult<SolitaireState>,
  replay: replay as (seed: string, intents: readonly (SolitaireIntent & Intent)[], configId?: string) => ReplayResult<SolitaireState>,
  serialize,
  deserialize,
};
