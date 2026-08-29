// canvas-screen — the browser face's input+paint adapter. This is the "canvas target" half of the
// KEY PORT INSIGHT the digest named: abrash's Framebuffer already holds a Uint8ClampedArray RGBA raster
// in the exact byte layout a browser <canvas> wants, so painting a frame is one putImageData call
// (paintToCanvas, from @red-cup-engineering/abrash/framebuffer) — no re-encoding, no kitty/sixel, no
// daleske dependency.
//
// The KEY EVENT SHAPE below deliberately mirrors the legacy daleske/src/input.mjs's `parseKey` output —
// { name, char, ctrl, meta, shift, raw } with `name` one of "up"/"down"/"left"/"right"/"space"/"char" —
// so this module reads like a browser dialect of the same vocabulary the legacy terminal bin spoke, per
// the port digest's §4 recommendation ("the canvas shim should mirror this exact shape").
//
// ONE REAL BEHAVIORAL DIFFERENCE FROM THE LEGACY TERMINAL BIN, by design (digest §4): the terminal bin
// treated each keypress as a ONE-SHOT intent, cleared after one tick. A browser FPS wants HELD-KEY
// continuous movement. So `heldIntent()` here tracks a Set of currently-held keys (keydown/keyup) and
// derives { forward, strafe, turn } fresh every animation frame from whatever is CURRENTLY held — but
// `fire` stays EDGE-TRIGGERED on keydown with `!event.repeat`, matching the legacy "one shot per
// truthy fire" (OS key-repeat must never auto-fire the gun).

import { paintToCanvas } from "@red-cup-engineering/abrash/framebuffer";

// browserKeyName(event) — KeyboardEvent.code/.key -> the daleske-shaped `name`. Only the names this
// game's controls actually use are translated to a specific name; everything else falls through to
// "char" (mirroring parseKey's own fallback for an unrecognized printable key).
function browserKeyName(event) {
  switch (event.code) {
    case "ArrowUp": return "up";
    case "ArrowDown": return "down";
    case "ArrowLeft": return "left";
    case "ArrowRight": return "right";
    case "Space": return "space";
    case "Escape": return "escape";
    default: return "char";
  }
}

// toKeyEvent(event) — a browser KeyboardEvent -> the daleske-shaped record.
function toKeyEvent(event) {
  return {
    name: browserKeyName(event),
    char: event.key && event.key.length === 1 ? event.key.toLowerCase() : undefined,
    ctrl: !!event.ctrlKey,
    meta: !!event.metaKey,
    shift: !!event.shiftKey,
    raw: event.code,
  };
}

// MOVE_KEYS — every held-key code this game reads for continuous movement, and which axis/sign it
// drives. Arrow keys and WASD both drive the SAME axes (arrows for forward/turn, WASD mirrors them);
// Q/E strafe left/right — the one control the legacy terminal bin never bound (it had no strafe key),
// added here so the browser face is genuinely keyboard-COMPLETE (an FPS needs strafe to be playable
// without a mouse).
const MOVE_KEYS = {
  ArrowUp: { axis: "forward", sign: 1 },
  KeyW: { axis: "forward", sign: 1 },
  ArrowDown: { axis: "forward", sign: -1 },
  KeyS: { axis: "forward", sign: -1 },
  ArrowLeft: { axis: "turn", sign: -1 },
  KeyA: { axis: "turn", sign: -1 },
  ArrowRight: { axis: "turn", sign: 1 },
  KeyD: { axis: "turn", sign: 1 },
  KeyQ: { axis: "strafe", sign: -1 },
  KeyE: { axis: "strafe", sign: 1 },
};

// createInput(target) — wires keydown/keyup on `target` (typically `window`) and returns
// { heldIntent(), consumeFire(), onKey(fn), dispose() }. `heldIntent()` is pure w.r.t. its own held-key
// Set (no DOM access at call time) so it can be unit-tested by driving the Set directly if ever needed;
// the DOM listeners are the only impure edge.
export function createInput(target) {
  const held = new Set();
  let fireQueued = false;
  const keyListeners = [];

  function onKeyDown(event) {
    held.add(event.code);
    if (event.code === "Space" && !event.repeat) fireQueued = true; // edge-triggered, repeat-proof
    const ev = toKeyEvent(event);
    for (const fn of keyListeners) fn(ev);
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    // heldIntent() — { forward, strafe, turn } derived fresh from whatever is currently held. Opposing
    // keys held together cancel (e.g. W+S held both nets forward:0), matching the natural expectation.
    heldIntent() {
      const intent = { forward: 0, strafe: 0, turn: 0 };
      for (const code of held) {
        const spec = MOVE_KEYS[code];
        if (spec) intent[spec.axis] += spec.sign;
      }
      return intent;
    },
    // consumeFire() — true at most once per keydown edge; calling it clears the queued fire.
    consumeFire() {
      if (!fireQueued) return false;
      fireQueued = false;
      return true;
    },
    onKey(fn) { keyListeners.push(fn); },
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}

// paintFrame(ctx, frame) — the canvas-target implementation itself: one putImageData call over the
// frame's Framebuffer. Kept as a one-line named export so main.mjs's render loop reads as "paint the
// frame" rather than reaching into abrash internals directly.
export function paintFrame(ctx, frame) {
  paintToCanvas(ctx, frame.fb);
}
