/**
 * `app` — `table.html`'s bootstrap. Reads the URL (`?variant=&seed=` or `?variant=&daily=1`),
 * resolves a `VariantSpec` + seed via the kernel (never re-deriving either itself — `dailySeed`
 * and `VARIANTS` are the only source for them), deals the table, mounts a `GameController`, and
 * wires the surrounding page chrome (toolbar buttons, keymap overlay, theme toggle, move-log
 * export) to it. This file owns `document`/`location`/`localStorage`; the game logic it calls
 * into does not.
 */
import { VARIANTS, VARIANT_LIST, dealTable, dailySeed } from './kernel.mjs';
import { GameController, KEYMAP } from './game-controller.mjs';

const DEFAULT_VARIANT = 'klondike-draw1';

function randomSeed() {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return `${Date.now().toString(36)}-${rand[0].toString(36)}${rand[1].toString(36)}`;
}

function resolveGame() {
  const params = new URLSearchParams(location.search);
  const variantId = params.get('variant') ?? DEFAULT_VARIANT;
  const variant = VARIANTS[variantId] ?? VARIANTS[DEFAULT_VARIANT];
  const isDaily = params.get('daily') === '1';

  let seed;
  let modeLabel;
  if (isDaily) {
    const dateParam = params.get('date');
    seed = dailySeed(dateParam ?? new Date(), variant.id);
    modeLabel = `Daily — ${dateParam ?? new Date().toISOString().slice(0, 10)}`;
  } else if (params.get('seed')) {
    seed = params.get('seed');
    modeLabel = `Seed: ${seed}`;
  } else {
    seed = randomSeed();
    modeLabel = `Seed: ${seed}`;
    params.set('variant', variant.id);
    params.set('seed', seed);
    history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
  }
  return { variant, seed, isDaily, modeLabel };
}

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function initThemeToggle(btn) {
  const stored = localStorage.getItem('solitaire-theme');
  applyTheme(stored);
  const label = () => (document.documentElement.dataset.theme === 'dark' ? '☀️ Light' : '🌙 Dark');
  btn.textContent = label();
  btn.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : current === 'light' ? null : 'dark';
    applyTheme(next);
    if (next) localStorage.setItem('solitaire-theme', next);
    else localStorage.removeItem('solitaire-theme');
    btn.textContent = label();
  });
}

function buildKeymapOverlay(overlayEl) {
  const dl = overlayEl.querySelector('dl');
  dl.innerHTML = '';
  for (const { key, description } of KEYMAP) {
    const dt = document.createElement('dt');
    dt.textContent = key === ' ' ? 'Space' : key;
    const dd = document.createElement('dd');
    dd.textContent = description;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
}

function moveLogJson(controller) {
  const { variant, state } = controller;
  return JSON.stringify(
    {
      seed: state.seed,
      variantId: variant.id,
      moveCount: state.cursor,
      log: state.log.slice(0, state.cursor),
    },
    null,
    2,
  );
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function main() {
  const { variant, seed, isDaily, modeLabel } = resolveGame();
  const state = dealTable(seed, variant);

  document.title = `${variant.name} — solitaire.561.group`;
  const nameEl = document.getElementById('variant-name');
  if (nameEl) nameEl.textContent = variant.name;
  const modeEl = document.getElementById('mode-label');
  if (modeEl) modeEl.textContent = modeLabel;

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status-text');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnAutoFinish = document.getElementById('btn-autofinish');
  const btnDraw = document.getElementById('btn-draw');
  const btnRedeal = document.getElementById('btn-redeal');
  const btnNewGame = document.getElementById('btn-newgame');
  const btnExport = document.getElementById('btn-export');
  const btnHelp = document.getElementById('btn-help');
  const btnTheme = document.getElementById('btn-theme');
  const exportPanel = document.getElementById('export-panel');
  const exportOutput = document.getElementById('export-output');
  const btnDownload = document.getElementById('btn-download');
  const keymapOverlay = document.getElementById('keymap-overlay');
  const winBanner = document.getElementById('win-banner');
  const btnWinClose = document.getElementById('btn-win-close');
  const drawToggle = document.getElementById('draw-toggle');

  function onChange(model) {
    statusEl.textContent = `${model.moveCount} move${model.moveCount === 1 ? '' : 's'}${
      model.hasStock ? ` · ${model.piles['stock']?.count ?? 0} in stock` : ''
    }${model.won ? ' · Won!' : ''}`;
    btnUndo.disabled = !model.canUndo;
    btnRedo.disabled = !model.canRedo;
    btnAutoFinish.disabled = !model.autoFinish;
    if (btnDraw) btnDraw.disabled = !model.hasStock || (model.piles['stock']?.count ?? 0) === 0;
    if (btnRedeal) btnRedeal.disabled = !model.redealAllowed;
    winBanner.hidden = !model.won;
  }

  const controller = new GameController({
    rootEl: boardEl,
    variant,
    state,
    onChange,
    onIllegalMove: () => {
      boardEl.classList.add('shake');
      setTimeout(() => boardEl.classList.remove('shake'), 200);
    },
  });

  btnUndo.addEventListener('click', () => controller.undo());
  btnRedo.addEventListener('click', () => controller.redo());
  btnAutoFinish.addEventListener('click', () => controller.autoFinish());
  if (btnDraw) btnDraw.addEventListener('click', () => controller.draw());
  if (btnRedeal) btnRedeal.addEventListener('click', () => controller.redeal());
  btnWinClose.addEventListener('click', () => {
    winBanner.hidden = true;
  });

  btnNewGame.addEventListener('click', () => {
    const params = new URLSearchParams();
    params.set('variant', variant.id);
    params.set('seed', randomSeed());
    location.search = params.toString();
  });

  btnExport.addEventListener('click', () => {
    exportPanel.hidden = !exportPanel.hidden;
    if (!exportPanel.hidden) exportOutput.value = moveLogJson(controller);
  });
  btnDownload.addEventListener('click', () => {
    downloadText(`solitaire-${variant.id}-${state.seed}.json`, moveLogJson(controller));
  });

  buildKeymapOverlay(keymapOverlay);
  btnHelp.addEventListener('click', () => {
    keymapOverlay.hidden = !keymapOverlay.hidden;
  });
  keymapOverlay.addEventListener('click', (e) => {
    if (e.target === keymapOverlay) keymapOverlay.hidden = true;
  });

  if (btnTheme) initThemeToggle(btnTheme);

  if (drawToggle && variant.id.startsWith('klondike')) {
    drawToggle.hidden = false;
    const other = variant.id === 'klondike-draw1' ? 'klondike-draw3' : 'klondike-draw1';
    const otherLabel = other === 'klondike-draw3' ? 'Switch to Draw 3' : 'Switch to Draw 1';
    const link = drawToggle.querySelector('a');
    link.textContent = `${otherLabel} (new deal)`;
    const params = new URLSearchParams();
    params.set('variant', other);
    params.set('seed', state.seed);
    link.href = `table.html?${params.toString()}`;
  }

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape') {
      keymapOverlay.hidden = true;
      winBanner.hidden = true;
      return;
    }
    if (e.key === 'n' || e.key === 'N') {
      btnNewGame.click();
      return;
    }
    if (e.key === '?') {
      keymapOverlay.hidden = !keymapOverlay.hidden;
      e.preventDefault();
      return;
    }
    if (!keymapOverlay.hidden) return;
    controller.handleKey(e);
  });

  onChange(controller.model);
}

main();
