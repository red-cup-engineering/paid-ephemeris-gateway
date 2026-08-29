// input — pointer-lock mouselook + the remappable keyboard, translated through keymap.mts's real
// `intentFromKeymap` (the SAME pure function movement.mts's own tests exercise — never a second,
// browser-only copy of the key->intent mapping). Mouse-look is enhancement only: every action also
// has a keyboard binding (keymap.mts's own CI-checked completeness), so the game is fully playable
// without a mouse, matching the design's "full keyboard completeness, mouse-look as enhancement only"
// amenity.

import { DEFAULT_KEYMAP, validateKeymap, intentFromKeymap } from "/src/keymap.mts";

const STORAGE_KEY = "bnsf:keymap";

export function loadKeymap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYMAP };
    const parsed = JSON.parse(raw);
    const result = validateKeymap(parsed);
    return result.valid ? parsed : { ...DEFAULT_KEYMAP };
  } catch {
    return { ...DEFAULT_KEYMAP };
  }
}

export function saveKeymap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resetKeymap() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_KEYMAP };
}

const MOUSE_CODES = { 0: "Mouse0", 1: "Mouse1", 2: "Mouse2" };

/** createInput(canvas, opts) — wires pointer lock + keyboard/mouse listeners on `canvas`, and
 *  returns { intent(), turnDelta(), setSensitivity, requestLock, isLocked } — a pure-ish polling
 *  surface the game loop reads once per tick rather than a stream of events the deterministic core
 *  would have to buffer itself (turn accumulates between polls, consumed and zeroed on each read —
 *  matching movement.mts's own `intent.turn` contract: "radians this tick"). */
export function createInput(canvas, opts = {}) {
  let keymap = opts.keymap ?? loadKeymap();
  const pressed = new Set();
  let turnAccum = 0;
  let sensitivity = opts.sensitivity ?? 0.35;
  let locked = false;

  function onKeyDown(e) {
    pressed.add(e.code);
  }
  function onKeyUp(e) {
    pressed.delete(e.code);
  }
  function onMouseDown(e) {
    const code = MOUSE_CODES[e.button];
    if (code) pressed.add(code);
    if (!locked) canvas.requestPointerLock?.();
  }
  function onMouseUp(e) {
    const code = MOUSE_CODES[e.button];
    if (code) pressed.delete(code);
  }
  function onMouseMove(e) {
    if (!locked) return;
    turnAccum += e.movementX * sensitivity * 0.002;
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
  }
  function onContextMenu(e) {
    e.preventDefault(); // right-click is altFire, not a browser context menu
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onLockChange);
  canvas.addEventListener("contextmenu", onContextMenu);

  return {
    /** intent() — one MoveIntent-shaped object for THIS tick, consuming (and zeroing) the
     *  accumulated mouse turn since the last call. */
    intent() {
      const base = intentFromKeymap(keymap, pressed);
      const turn = turnAccum;
      turnAccum = 0;
      return { ...base, turn };
    },
    isLocked: () => locked,
    requestLock: () => canvas.requestPointerLock?.(),
    exitLock: () => document.exitPointerLock?.(),
    setSensitivity: (s) => { sensitivity = s; },
    setKeymap: (map) => { keymap = map; },
    getKeymap: () => keymap,
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("contextmenu", onContextMenu);
    },
  };
}
