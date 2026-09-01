/**
 * `app` — bootstrap: resolve `?date=`/`?seed=` -> a seed via the kernel's `dailySeed`, spawn the
 * certified tangle, mount the SVG renderer, move panel, energy gauge, and history panel.
 *
 * This is the ONE place in the whole client that reads the real clock (`new Date()`) — every
 * other module downstream (`project.mjs`, `render-svg.mjs`, and everything in `src/*.mts` via
 * `kernel.mjs`) only ever sees the resulting seed string or already-computed state. That is the
 * house "injected clock" doctrine applied at the browser boundary.
 */
import {
  dailySeed, spawnCertifiedTangle, legalMoves, applyMove, isSettled, replayTo, undo, redo,
} from './kernel.mjs';
import { layoutClaims, projectTangle, nearestInDirection } from './project.mjs';
import { renderFrame } from './render-svg.mjs';
import { initAnnouncer, announce } from './a11y.mjs';
import { recordLocalRun, renderHistorySummary } from './history-ui.mjs';

function resolveSeed() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('seed');
  if (explicit) return explicit;
  const dateParam = params.get('date');
  return dailySeed(dateParam ?? new Date());
}

function moveLabel(move) {
  switch (move.verb) {
    case 'merge': return `MERGE ${move.a} + ${move.b}`;
    case 'split': return `SPLIT ${move.bondId} (${move.mode})`;
    case 'rebond': return `REBOND ${move.bondId} -> ${move.toClaimId}`;
    case 'catalyze': return `CATALYZE ${move.claimId} on ${move.bondId}`;
  }
}

function movesTouching(moves, selection) {
  if (!selection) return [];
  if (selection.type === 'claim') {
    return moves.filter((m) =>
      (m.verb === 'merge' && (m.a === selection.id || m.b === selection.id)) ||
      (m.verb === 'rebond' && m.toClaimId === selection.id) ||
      (m.verb === 'catalyze' && m.claimId === selection.id));
  }
  return moves.filter((m) => 'bondId' in m && m.bondId === selection.id);
}

function main() {
  const seed = resolveSeed();
  const svgRoot = document.getElementById('lattice');
  const movePanel = document.getElementById('move-panel');
  const energyRow = document.querySelector('.energy-row');
  const energyLabel = document.getElementById('energy-label');
  const statusPanel = document.getElementById('status-panel');
  const historyPanel = document.getElementById('history-panel');
  const seedLabel = document.getElementById('seed-label');
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (!svgRoot) return; // not on the play page

  initAnnouncer(document);
  seedLabel.textContent = seed;

  const tangle0 = spawnCertifiedTangle(seed);
  // `log` may hold entries beyond `cursor` — the redo tail, kept until a fresh move overwrites
  // it. `cursor` is the only thing `undo`/`redo` (from `replay.mts`, the trust anchor) ever move;
  // both are real folds over the log via `replayTo`, never a separate "client-side state" that
  // could drift from what a replay would recompute.
  const log = [];
  let cursor = 0;
  let selection = null;
  let focusedClaimId = tangle0.claims[0]?.id ?? null;

  function currentRun() {
    return replayTo(seed, log, cursor);
  }

  function doUndo() {
    const run = undo(seed, log, cursor);
    cursor = run.log.length;
    selection = null;
    announce('Undid last move.');
    render();
  }

  function doRedo() {
    const run = redo(seed, log, cursor);
    cursor = run.log.length;
    selection = null;
    announce('Redid move.');
    render();
  }

  undoBtn.addEventListener('click', doUndo);
  redoBtn.addEventListener('click', doRedo);
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
    e.preventDefault();
    if (e.shiftKey) doRedo(); else doUndo();
  });

  function render() {
    const run = currentRun();
    const tangle = run.tangle;
    const width = 480;
    const height = 480;
    const positions = layoutClaims(tangle.claims, { cx: width / 2, cy: height / 2, radius: Math.min(width, height) / 2 - 40 });
    const view = projectTangle(tangle, positions, {
      selectedBondId: selection?.type === 'bond' ? selection.id : null,
      selectedClaimId: selection?.type === 'claim' ? selection.id : null,
    });
    const spentFraction = tangle.energyBudget > 0 ? run.totalCost / tangle.energyBudget : 0;
    renderFrame(svgRoot, view, { width, height, spentFraction });

    // Wire click + keyboard activation on every claim/bond group.
    svgRoot.querySelectorAll('[data-claim-id]').forEach((node) => {
      const id = node.getAttribute('data-claim-id');
      node.addEventListener('click', () => select({ type: 'claim', id }));
      node.addEventListener('keydown', (e) => onClaimKeydown(e, id));
    });
    svgRoot.querySelectorAll('[data-bond-id]').forEach((node) => {
      const id = node.getAttribute('data-bond-id');
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.addEventListener('click', () => select({ type: 'bond', id }));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select({ type: 'bond', id }); }
      });
    });

    energyLabel.textContent = `${run.totalCost} / ${tangle.energyBudget} wits`;
    const overBudget = tangle.energyBudget > 0 && run.totalCost > tangle.energyBudget;
    energyRow.classList.toggle('over-budget', overBudget);
    statusPanel.classList.toggle('over-budget', overBudget);

    undoBtn.disabled = cursor <= 0;
    redoBtn.disabled = cursor >= log.length;

    const legal = legalMoves(tangle);
    renderMovePanel(legal);

    if (run.settled) {
      const budgetNote = tangle.energyBudget > 0
        ? overBudget
          ? ` (${run.totalCost - tangle.energyBudget} wits over budget)`
          : ` (${tangle.energyBudget - run.totalCost} wits under budget)`
        : '';
      statusPanel.textContent = `Settled. H¹ = 0. Total cost: ${run.totalCost} wits.${budgetNote}`;
      announce('Crucible settled.');
      const record = { seed, moveLog: log.slice(0, cursor), totalCost: run.totalCost, finishedAt: new Date().toISOString() };
      recordLocalRun(record);
      renderHistorySummary(historyPanel, { seed, totalCost: run.totalCost });
    } else {
      const budgetNote = overBudget ? ` — over budget by ${run.totalCost - tangle.energyBudget} wits` : '';
      statusPanel.textContent = `${legal.length} legal moves available.${budgetNote}`;
      historyPanel.innerHTML = '';
    }
  }

  function renderMovePanel(legal) {
    movePanel.innerHTML = '';
    const relevant = selection ? movesTouching(legal, selection) : legal;
    if (relevant.length === 0) {
      const p = document.createElement('p');
      p.textContent = selection ? 'No legal moves touch this selection.' : 'Select a claim or bond to see legal moves.';
      movePanel.appendChild(p);
      return;
    }
    for (const move of relevant) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'move-button';
      btn.textContent = moveLabel(move);
      btn.addEventListener('click', () => {
        const tangle = currentRun().tangle;
        try {
          const { moveCost } = applyMove(tangle, move);
          // A fresh move from a state reached via undo discards whatever redo tail followed it —
          // standard undo/redo semantics, same as any editor.
          if (cursor < log.length) log.length = cursor;
          log.push({ move });
          cursor = log.length;
          selection = null;
          announce(`${moveLabel(move)} — cost ${moveCost.cost} (${moveCost.regime}, depth ${moveCost.depth}).`);
          render();
        } catch (err) {
          announce(`Move failed: ${err.message}`);
        }
      });
      movePanel.appendChild(btn);
    }
  }

  function select(next) {
    selection = selection && selection.type === next.type && selection.id === next.id ? null : next;
    render();
  }

  function onClaimKeydown(e, id) {
    const view = projectTangle(currentRun().tangle, layoutClaims(currentRun().tangle.claims, { cx: 240, cy: 240, radius: 200 }));
    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (dirs[e.key]) {
      e.preventDefault();
      const [dx, dy] = dirs[e.key];
      const nextId = nearestInDirection(view.claims, id, dx, dy);
      if (nextId) {
        focusedClaimId = nextId;
        const node = svgRoot.querySelector(`[data-claim-id="${CSS.escape(nextId)}"]`);
        node?.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select({ type: 'claim', id });
    }
  }

  render();
  void focusedClaimId;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
