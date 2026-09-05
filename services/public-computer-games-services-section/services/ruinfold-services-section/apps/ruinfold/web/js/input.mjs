// input.mjs — keyboard (vi keys + arrows) and touch d-pad, both emitting the exact same intent
// SHAPES #engine/intents.mts already validates (design §6.3: "no new intent kinds anywhere,
// intents.mts stays the single trust boundary regardless of input device"). Every callback here
// hands `onIntent` a plain `{kind, ...}` object WITHOUT `actor` — session.mjs's act() fills that
// in and runs it through validate() itself, so this file makes no trust decisions of its own.

const DIR_KEYS = {
  ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e",
  k: "n", j: "s", h: "w", l: "e", // vi keys (design §6.3)
  w: "n", s: "s", a: "w", d: "e", // arrow-key-adjacent convenience alias
};
const ABILITY_KEYS = { "1": "heavy", "2": "cleave", "3": "bolt", "4": "second-wind" };

// bindKeyboard — `ctx.nearestHostile()` / `ctx.nearestGroundItem()` are called lazily, at keypress
// time, against whatever the caller's latest projected model is — this file holds no game state.
export function bindKeyboard(onIntent, ctx = {}) {
  function handler(e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

    const dir = DIR_KEYS[e.key];
    if (dir) {
      onIntent({ kind: "move", dir });
      e.preventDefault();
      return;
    }
    const ability = ABILITY_KEYS[e.key];
    if (ability) {
      onIntent({ kind: "ability", ability, target: ctx.nearestHostile ? ctx.nearestHostile() : null });
      e.preventDefault();
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      const t = ctx.nearestHostile ? ctx.nearestHostile() : null;
      if (t) onIntent({ kind: "attack", target: t });
      e.preventDefault();
      return;
    }
    if (e.key === "N") {
      onIntent({ kind: "portal", dir: "north" });
      e.preventDefault();
      return;
    }
    if (e.key === "S" || e.key === "b") {
      onIntent({ kind: "portal", dir: "south" });
      e.preventDefault();
      return;
    }
    if (e.key === "g" || e.key === ",") {
      const item = ctx.nearestGroundItem ? ctx.nearestGroundItem() : null;
      if (item) onIntent({ kind: "pickup", item });
      e.preventDefault();
    }
  }
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

// isTouchCapable — the design's "rendered only when touch-capable" gate for the d-pad overlay.
export function isTouchCapable() {
  return "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
}

// mountTouchDpad — builds a 5-button overlay (N/S/E/W + a center attack-nearest button) inside
// `container` and wires each to the same move/attack intents the keyboard emits. Returns an
// unmount function.
export function mountTouchDpad(container, onIntent, ctx = {}) {
  const el = document.createElement("div");
  el.className = "dpad";
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", "movement controls");

  const spec = [
    ["n", "▲", "north"],
    ["w", "◀", "west"],
    ["center", "⚔", "attack nearest"],
    ["e", "▶", "east"],
    ["s", "▼", "south"],
  ];
  const buttons = [];
  for (const [cls, label, aria] of spec) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = cls;
    btn.textContent = label;
    btn.setAttribute("aria-label", aria);
    btn.addEventListener("click", () => {
      if (cls === "center") {
        const t = ctx.nearestHostile ? ctx.nearestHostile() : null;
        if (t) onIntent({ kind: "attack", target: t });
      } else {
        onIntent({ kind: "move", dir: cls });
      }
    });
    el.appendChild(btn);
    buttons.push(btn);
  }
  container.appendChild(el);
  return () => {
    for (const b of buttons) b.remove();
    el.remove();
  };
}

// Announcer — a visually-hidden aria-live region for screen-reader event narration (design §6.3).
export class Announcer {
  constructor(el) {
    this.el = el;
  }
  say(message) {
    this.el.textContent = message;
  }
}
