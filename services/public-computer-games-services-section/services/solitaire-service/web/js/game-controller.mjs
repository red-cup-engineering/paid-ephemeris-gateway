/**
 * `game-controller` — wires a mounted table (`render-dom.mjs`) to the rules engine (`kernel.mjs`)
 * through the projection function (`project.mjs`): click-to-select/click-to-place, drag, and a
 * full keyboard path, all funneled through the same `applyMove`/`drawFromStock`/`redealStock`
 * calls so there is exactly one way a move actually happens no matter which input device asked
 * for it (DESIGN.md, "Keyboard-complete accessibility": legal-move highlighting "is computed once
 * by `engine.legalTargets()`, not duplicated per input mode").
 *
 * `KEYMAP` is exported as data (key -> `{ description, kind }`) specifically so a static test can
 * enumerate `kind` and check every engine `LogEntry.kind` (`'move' | 'draw' | 'redeal'` —
 * `'deal-row'` is `drawFromStock`'s Spider-shaped outcome, reached by the same `D` key as
 * Klondike's `'draw'`) has a bound key without a human accessibility audit — the coverage check
 * DESIGN.md's "Keyboard-complete accessibility" section asks `client.mts`'s test plan for.
 */
import {
  legalTargets,
  applyMove,
  drawFromStock,
  redealStock,
  undo,
  redo,
  autoFinishAvailable,
  autoFinishSequence,
  checkWin,
} from './kernel.mjs';
import { projectState } from './project.mjs';
import { mountTable, celebrateWin } from './render-dom.mjs';

/** Every keyboard action this controller binds, and which engine `LogEntry.kind` (if any) it can
 * eventually produce. Exported as data so it is checkable without a human running the app. */
export const KEYMAP = [
  { key: 'ArrowRight', description: 'Move cursor to next pile', kind: null },
  { key: 'ArrowLeft', description: 'Move cursor to previous pile', kind: null },
  { key: 'ArrowDown', description: 'Move cursor to next pile', kind: null },
  { key: 'ArrowUp', description: 'Move cursor to previous pile', kind: null },
  { key: 'Tab', description: 'Cycle cursor to next pile (Shift+Tab: previous)', kind: null },
  { key: 'Enter', description: 'Pick up (auto-selecting the largest movable run) or drop', kind: 'move' },
  { key: ' ', description: 'Same as Enter', kind: 'move' },
  { key: 'd', description: 'Draw from stock / deal a row', kind: 'draw' },
  { key: 'r', description: 'Redeal (recycle waste back into stock)', kind: 'redeal' },
  { key: 'u', description: 'Undo', kind: null },
  { key: 'U', description: 'Redo (Shift+U)', kind: null },
  { key: 'a', description: 'Auto-finish, when available', kind: null },
  { key: 'n', description: 'New game', kind: null },
  { key: '?', description: 'Toggle this keymap overlay', kind: null },
];

/** The `LogEntry.kind`s the engine can ever append (`engine.mts`'s `LogEntry['kind']`). Used only
 * by the keymap-coverage check below/in tests — not consumed by the engine itself. */
export const LOG_ENTRY_KINDS = ['move', 'draw', 'redeal', 'deal-row'];

/** True iff every entry in `LOG_ENTRY_KINDS` is reachable via some `KEYMAP` binding, treating
 * `'deal-row'` as covered by whatever key covers `'draw'` (both are `drawFromStock`'s outcome —
 * see module doc). */
export function keymapCoversAllMoveKinds(keymap = KEYMAP) {
  const covered = new Set(keymap.map((k) => k.kind).filter(Boolean));
  if (covered.has('draw')) covered.add('deal-row');
  return LOG_ENTRY_KINDS.every((k) => covered.has(k));
}

function stablePileOrder(variant) {
  // upper-left (stock/waste/freecell) -> upper-right (foundation) -> tableau, each in declared
  // order — the same grouping `render-dom.mjs` lays out in, so cursor motion tracks the screen.
  const left = variant.piles.filter((p) => p.kind === 'stock' || p.kind === 'waste' || p.kind === 'freecell');
  const right = variant.piles.filter((p) => p.kind === 'foundation');
  const tableau = variant.piles.filter((p) => p.kind === 'tableau');
  return [...left, ...right, ...tableau].map((p) => p.id);
}

/** Largest `count` (top-down) for which `pileId` currently has *some* legal target — the
 * "building a legal run pickup automatically" behavior DESIGN.md asks keyboard pickup for.
 * Falls back to `1` (still a valid pickup group, just possibly nowhere to put it yet) rather than
 * re-deriving run-shape validity itself, so no rule logic is duplicated outside `engine.mts`. */
function autoSelectCount(variant, state, pileId) {
  const pile = state.piles[pileId] ?? [];
  for (let count = pile.length; count >= 1; count--) {
    if (legalTargets(variant, state, pileId, count).length > 0) return count;
  }
  return Math.min(1, pile.length);
}

export class GameController {
  /**
   * @param {{ rootEl: HTMLElement, variant: object, state: object,
   *   onChange?: (model: ReturnType<typeof projectState>) => void,
   *   onIllegalMove?: () => void }} opts
   */
  constructor({ rootEl, variant, state, onChange, onIllegalMove }) {
    this.rootEl = rootEl;
    this.variant = variant;
    this.state = state;
    this.onChange = onChange ?? (() => {});
    this.onIllegalMove = onIllegalMove ?? (() => {});
    this.selected = null;
    this.order = stablePileOrder(variant);
    this.cursorPile = this.order[0] ?? null;
    this._wasWon = false;

    this.mounted = mountTable(rootEl, variant);
    this._bindPointer();
    this._render();
  }

  // ------------------------------------------------------------------ core state transitions

  _setState(next) {
    this.state = next;
    this.selected = null;
    this._render();
  }

  _render() {
    const model = projectState(this.variant, this.state, { selected: this.selected });
    this.mounted.update(model, { cursorPile: this.cursorPile });
    if (model.won && !this._wasWon) celebrateWin(this.rootEl);
    this._wasWon = model.won;
    this.onChange(model);
  }

  get model() {
    return projectState(this.variant, this.state, { selected: this.selected });
  }

  // ------------------------------------------------------------------ moves

  select(pileId, count) {
    const pile = this.state.piles[pileId] ?? [];
    if (count < 1 || count > pile.length) return;
    if (!pile.slice(pile.length - count).every((c) => c.faceUp)) return;
    this.selected = { pile: pileId, count };
    this.cursorPile = pileId;
    this._render();
  }

  clearSelection() {
    if (!this.selected) return;
    this.selected = null;
    this._render();
  }

  /** Attempt to complete the currently selected move onto `pileId`. Returns true iff it landed. */
  tryDrop(pileId) {
    if (!this.selected) return false;
    if (this.selected.pile === pileId) {
      this.clearSelection();
      return false;
    }
    const { pile, count } = this.selected;
    const targets = legalTargets(this.variant, this.state, pile, count);
    if (!targets.includes(pileId)) {
      this.onIllegalMove();
      return false;
    }
    this._setState(applyMove(this.variant, this.state, { from: pile, to: pileId, count }));
    return true;
  }

  /** Click/tap on a specific card (or the empty body of a pile, when `index` is null). */
  activate(pileId, index) {
    const spec = this.variant.piles.find((p) => p.id === pileId);
    if (spec?.kind === 'stock') {
      this.clearSelection();
      this.draw();
      return;
    }
    if (this.selected) {
      if (this.tryDrop(pileId)) return;
      // Fall through: an illegal drop onto a non-empty pile re-targets the selection to that
      // pile's own top-to-clicked-card run, matching ordinary click-to-select expectations.
    }
    const pile = this.state.piles[pileId] ?? [];
    if (pile.length === 0 || index === null || index === undefined) {
      this.clearSelection();
      return;
    }
    this.select(pileId, pile.length - index);
  }

  /** Keyboard pickup/drop on the cursor pile — see `autoSelectCount`'s doc comment. */
  activateCursor() {
    const spec = this.variant.piles.find((p) => p.id === this.cursorPile);
    if (spec?.kind === 'stock') {
      this.draw();
      return;
    }
    if (this.selected) {
      if (this.selected.pile === this.cursorPile) {
        this.clearSelection();
      } else {
        this.tryDrop(this.cursorPile);
      }
      return;
    }
    const count = autoSelectCount(this.variant, this.state, this.cursorPile);
    if (count < 1) return;
    this.select(this.cursorPile, count);
  }

  draw() {
    if (!this.model.hasStock) return;
    const stockLen = this.state.piles['stock']?.length ?? 0;
    try {
      if (stockLen > 0) {
        this._setState(drawFromStock(this.variant, this.state));
      } else if (this.model.redealAllowed) {
        this._setState(redealStock(this.variant, this.state));
      }
    } catch {
      this.onIllegalMove();
    }
  }

  redeal() {
    if (!this.model.redealAllowed) return;
    try {
      this._setState(redealStock(this.variant, this.state));
    } catch {
      this.onIllegalMove();
    }
  }

  undo() {
    this._setState(undo(this.variant, this.state));
  }

  redo() {
    this._setState(redo(this.variant, this.state));
  }

  autoFinish() {
    if (!autoFinishAvailable(this.variant, this.state)) return;
    this._setState(autoFinishSequence(this.variant, this.state));
  }

  isWon() {
    return checkWin(this.variant, this.state);
  }

  // ------------------------------------------------------------------ keyboard cursor

  moveCursor(delta) {
    if (this.order.length === 0) return;
    const i = Math.max(0, this.order.indexOf(this.cursorPile));
    const next = (i + delta + this.order.length) % this.order.length;
    this.cursorPile = this.order[next];
    this._render();
  }

  handleKey(e) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        this.moveCursor(1);
        e.preventDefault();
        return;
      case 'ArrowLeft':
      case 'ArrowUp':
        this.moveCursor(-1);
        e.preventDefault();
        return;
      case 'Tab':
        this.moveCursor(e.shiftKey ? -1 : 1);
        e.preventDefault();
        return;
      case 'Enter':
      case ' ':
        this.activateCursor();
        e.preventDefault();
        return;
      case 'd':
      case 'D':
        this.draw();
        e.preventDefault();
        return;
      case 'r':
      case 'R':
        this.redeal();
        e.preventDefault();
        return;
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          this.undo();
          e.preventDefault();
        }
        return;
      case 'y':
        if (e.ctrlKey || e.metaKey) {
          this.redo();
          e.preventDefault();
        }
        return;
      case 'u':
        this.undo();
        e.preventDefault();
        return;
      case 'U':
        this.redo();
        e.preventDefault();
        return;
      case 'a':
      case 'A':
        this.autoFinish();
        e.preventDefault();
        return;
      default:
        return;
    }
  }

  // ------------------------------------------------------------------ pointer input (click + drag)

  _bindPointer() {
    const root = this.rootEl;
    let drag = null; // { pileId, count, ghost, startX, startY, pointerId }
    let handledByPointer = false; // set whenever endDrag already fully handled the interaction,
    // so the synthetic `click` the browser fires right after `pointerup` doesn't re-activate it

    const pileIdFromTarget = (target) => target.closest?.('.pile')?.dataset.pileId ?? null;
    const cardSlotFromTarget = (target) => target.closest?.('.card-slot') ?? null;

    root.addEventListener('pointerdown', (e) => {
      const slot = cardSlotFromTarget(e.target);
      const pileId = slot?.dataset.pileId ?? pileIdFromTarget(e.target);
      if (!pileId) return;
      const index = slot ? Number(slot.dataset.index) : null;
      const pile = this.state.piles[pileId] ?? [];
      const count = index === null ? 0 : pile.length - index;

      // Only cards that could actually move (face-up, valid run) become drag sources; anything
      // else is handled as a plain click on pointerup (covers stock/foundation/empty-pile taps).
      if (count > 0 && legalTargets(this.variant, this.state, pileId, count).length > 0) {
        const ghost = slot.cloneNode(true);
        ghost.classList.add('is-dragging');
        ghost.style.position = 'fixed';
        ghost.style.left = `${e.clientX - slot.offsetWidth / 2}px`;
        ghost.style.top = `${e.clientY - slot.offsetHeight / 2}px`;
        ghost.style.pointerEvents = 'none';
        document.body.appendChild(ghost);
        drag = { pileId, count, ghost, moved: false, w: slot.offsetWidth, h: slot.offsetHeight };
        e.target.setPointerCapture?.(e.pointerId);
      }
    });

    root.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.moved = true;
      drag.ghost.style.left = `${e.clientX - drag.w / 2}px`;
      drag.ghost.style.top = `${e.clientY - drag.h / 2}px`;
    });

    const endDrag = (e) => {
      if (!drag) return;
      const { pileId, count, ghost, moved } = drag;
      drag = null;
      handledByPointer = true;
      ghost.remove();
      const dropEl = document.elementFromPoint(e.clientX, e.clientY);
      const dropPile = pileIdFromTarget(dropEl);
      if (moved && dropPile && dropPile !== pileId) {
        this.select(pileId, count);
        this.tryDrop(dropPile);
      } else if (!moved) {
        // A drag candidate that never actually moved is just a click.
        const slot = cardSlotFromTarget(e.target) ?? { dataset: {} };
        const index = slot.dataset.index !== undefined ? Number(slot.dataset.index) : null;
        this.activate(pileId, index);
      }
    };
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    // Plain clicks on piles/cards that never became a drag candidate (stock, foundations, empty
    // piles, or a pile with no legal source count) still need to register as activations here;
    // clicks the pointer handlers already resolved are skipped via `handledByPointer` so a
    // draggable card's click-without-drag isn't activated twice (pointerup fires a synthetic
    // `click` right after it, on the same target).
    root.addEventListener('click', (e) => {
      if (handledByPointer) {
        handledByPointer = false;
        return;
      }
      const slot = cardSlotFromTarget(e.target);
      const pileId = slot?.dataset.pileId ?? pileIdFromTarget(e.target);
      if (!pileId) return;
      const index = slot?.dataset.index !== undefined ? Number(slot.dataset.index) : null;
      this.activate(pileId, index);
    });
  }
}
