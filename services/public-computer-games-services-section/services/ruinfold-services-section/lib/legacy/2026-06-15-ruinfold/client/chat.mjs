// chat — one client module owning THREE overlay surfaces, wired entirely through the shared `ctx`
// event bus and never touching the network directly:
//
//   1) CHAT BOX  (ctx.dom.mount('chat'), bottom-left) — a scrolling LOG that folds together player
//      chatter and a dimmer COMBAT LOG (damage/heal/death/level/effect), plus an INPUT that stays
//      hidden until the main orchestrator emits 'focus-chat' (the player pressed Enter). Enter sends
//      {kind:'say',text} and hides the input; Esc just hides it.
//   2) TOAST     (ctx.dom.mount('toast'))           — a brief centered message that fades out, shown
//      on the 'toast' event.
//   3) MINIMAP   (ctx.dom.mount('minimap'), top-right) — a ~160px 2D <canvas> redrawn at ~8 fps from
//      frame(), plotting the current zone's square and a colored dot per entity in the zone, with
//      exit markers on the edges and the zone name as a title.
//
// The module owns all of its own CSS: it injects one <style> block, scoping every rule under classes
// prefixed `.chat-` (chat box / toast) and `.mm-` (minimap) so it cannot collide with the host page.
// It is written defensively: every ctx read is guarded, because the contract surface may be partial
// and the state may be empty before the first snapshot arrives.

// --- module-scope state ------------------------------------------------------------------------
let CTX = null; // the shared context, stashed at init for frame() to reuse
let logEl = null; // the scrolling LOG element inside the chat box
let inputEl = null; // the (initially hidden) chat INPUT element
let toastEl = null; // the centered toast text element
let toastTimer = null; // pending fade-out timer for the toast
let canvas = null; // the minimap <canvas>
let mmCtx = null; // its 2D drawing context
let titleEl = null; // the minimap zone-name title element
let mmAccum = 0; // accumulated dt, so we can throttle the minimap redraw to ~8/sec

const MAX_LINES = 12; // hard cap on lines retained in the LOG (the brief says ~10)
const MM_INTERVAL = 1 / 8; // seconds between minimap redraws (~8 fps)
const MM_SIZE = 160; // logical px size of the (square) minimap canvas

// Dot colors by entity type/kind. The contract's entity snap exposes both `type` and `kind`; we try
// `type` first and fall back to `kind`, since sibling modules key on `kind` (npc/monster/item).
const DOT_COLORS = {
  player: "#ffffff",
  npc: "#5a86d6",
  monster: "#d24a33",
  item: "#e7c86a",
  shrine: "#cfc9e6",
};

// --- styles ------------------------------------------------------------------------------------
// Injected exactly once. All selectors are prefixed `.chat-` / `.mm-` and the <style> carries a
// data attribute so a second init() (hot reload) does not duplicate it.
function injectStyle() {
  if (document.querySelector("style[data-chat-module]")) return;
  const s = document.createElement("style");
  s.setAttribute("data-chat-module", "");
  s.textContent = `
    .chat-box { font: 12px ui-monospace, "SF Mono", Menlo, monospace; color: #d8d4cc; width: 340px; }
    .chat-log { display: flex; flex-direction: column; gap: 1px; max-height: 168px; overflow: hidden;
      text-shadow: 0 1px 2px #000; }
    .chat-line { line-height: 1.35; word-break: break-word; }
    .chat-line .chat-who { color: #efe9dd; font-weight: 600; }
    /* combat lines read dimmer + italic so chatter and combat are visually distinct in one scroll */
    .chat-combat { opacity: .62; font-style: italic; }
    .chat-combat.chat-dmg  { color: #e08a78; }
    .chat-combat.chat-heal { color: #8fd6ad; }
    .chat-combat.chat-die  { color: #b9b3a6; }
    .chat-combat.chat-lvl  { color: #e6e08a; }
    .chat-combat.chat-eff  { color: #c0a6e0; }
    .chat-input { display: none; margin-top: 6px; width: 100%; box-sizing: border-box;
      background: rgba(14,14,20,0.92); color: #efe9dd; border: 1px solid #34343f; border-radius: 6px;
      padding: 6px 9px; font: inherit; outline: none; }
    .chat-input:focus { border-color: #5a5a6a; }

    .chat-toast { font: 14px ui-monospace, "SF Mono", Menlo, monospace; color: #efe9dd; opacity: 0;
      transition: opacity .2s ease; text-shadow: 0 2px 6px #000; text-align: center; }

    .mm-wrap { width: ${MM_SIZE}px; text-align: center; }
    .mm-title { font: 11px ui-monospace, "SF Mono", Menlo, monospace; color: #d8d4cc; margin-bottom: 4px;
      letter-spacing: .04em; text-shadow: 0 1px 2px #000; opacity: .85; }
    .mm-canvas { display: block; width: ${MM_SIZE}px; height: ${MM_SIZE}px; border: 1px solid #34343f;
      border-radius: 8px; background: rgba(8,8,14,0.82); cursor: pointer; }
  `;
  document.head.appendChild(s);
}

// --- small helpers -----------------------------------------------------------------------------
// Escape user/server text before it touches innerHTML, so a name or message can never inject markup.
function esc(str) {
  return String(str ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Resolve a display name through state.nameOf when available, else fall back to the raw id.
function nameOf(id) {
  try {
    return CTX?.state?.nameOf ? CTX.state.nameOf(id) : id;
  } catch {
    return id;
  }
}

// Append one line to the LOG and trim from the top to honor MAX_LINES.
//   classes — extra class names (e.g. "chat-combat chat-dmg") for styling
//   html    — already-escaped inner HTML for the line
function pushLine(classes, html) {
  if (!logEl) return;
  const line = document.createElement("div");
  line.className = ["chat-line"].concat(classes || []).join(" ");
  line.innerHTML = html;
  logEl.appendChild(line);
  while (logEl.children.length > MAX_LINES) logEl.removeChild(logEl.firstChild);
  logEl.scrollTop = logEl.scrollHeight; // keep the newest line in view
}

// A combat-log line: short, dim, with a per-kind class for color.
function combatLine(kind, text) {
  pushLine(["chat-combat", "chat-" + kind], esc(text));
}

// --- chat box ----------------------------------------------------------------------------------
function buildChatBox() {
  const mount = CTX.dom.mount("chat");
  if (!mount) return;
  mount.classList.add("chat-box");
  mount.innerHTML = ""; // own this mount fully; clear any prior content
  logEl = document.createElement("div");
  logEl.className = "chat-log";
  inputEl = document.createElement("input");
  inputEl.className = "chat-input";
  inputEl.type = "text";
  inputEl.maxLength = 200;
  inputEl.placeholder = "say…";
  mount.append(logEl, inputEl);

  // The input is the only place this module sends an intent.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation(); // don't let main.mjs re-fire 'focus-chat' on this same Enter
      const text = inputEl.value.trim();
      if (text) {
        try {
          CTX.send?.({ kind: "say", text });
        } catch (err) {
          console.error("[chat] send failed:", err);
        }
      }
      inputEl.value = "";
      hideInput();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      inputEl.value = "";
      hideInput();
    }
  });
}

function showInput() {
  if (!inputEl) return;
  inputEl.style.display = "block";
  inputEl.focus();
}
function hideInput() {
  if (!inputEl) return;
  inputEl.style.display = "none";
  inputEl.blur();
}

// --- toast -------------------------------------------------------------------------------------
function buildToast() {
  const mount = CTX.dom.mount("toast");
  if (!mount) return;
  mount.classList.add("chat-toast");
  toastEl = mount;
}
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg ?? "");
  toastEl.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toastEl) toastEl.style.opacity = "0";
  }, 1500);
}

// --- minimap -----------------------------------------------------------------------------------
function buildMinimap() {
  const mount = CTX.dom.mount("minimap");
  if (!mount) return;
  mount.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "mm-wrap";
  titleEl = document.createElement("div");
  titleEl.className = "mm-title";
  titleEl.textContent = "—";
  canvas = document.createElement("canvas");
  canvas.className = "mm-canvas";
  // Render at devicePixelRatio for a crisp map while keeping a fixed CSS size.
  const dpr = Math.min(self.devicePixelRatio || 1, 2);
  canvas.width = MM_SIZE * dpr;
  canvas.height = MM_SIZE * dpr;
  wrap.append(titleEl, canvas);
  mount.appendChild(wrap);
  try {
    mmCtx = canvas.getContext("2d");
    if (mmCtx) mmCtx.scale(dpr, dpr); // draw in logical MM_SIZE px coordinates
  } catch (e) {
    console.error("[chat] minimap 2d context failed:", e);
    mmCtx = null;
  }

  // OPTIONAL nicety: click the map to target the nearest dot to the click point.
  canvas.addEventListener("click", onMinimapClick);
}

// COORDINATE CONVENTION (matches the server's portal axes):
//   world origin (0,0) maps to the CENTER of the canvas.
//   +x world  →  RIGHT   (east)      -x world  →  LEFT   (west)
//   +z world  →  DOWN    (south)     -z world  →  UP     (north)
// A zone is a square of half-extent `bound`, so world coords span [-bound,+bound] on each axis and
// map linearly onto [pad, MM_SIZE-pad] of the canvas. We keep a small uniform pad so edge dots and
// the exit markers are not clipped.
const MM_PAD = 12;
function worldToCanvas(x, z, bound) {
  const span = MM_SIZE - MM_PAD * 2;
  const b = bound > 0 ? bound : 1; // guard a zero/absent bound
  const cx = MM_PAD + ((x + b) / (2 * b)) * span; // +x → right
  const cy = MM_PAD + ((z + b) / (2 * b)) * span; // +z → down
  return [cx, cy];
}

// Normalize an exit key to its canvas edge. Accepts both short (n/s/e/w) and full
// (north/south/east/west) forms, since the world data files use the full names.
function exitEdge(dir) {
  const d = String(dir || "").toLowerCase();
  if (d === "n" || d === "north") return "n";
  if (d === "s" || d === "south") return "s";
  if (d === "e" || d === "east") return "e";
  if (d === "w" || d === "west") return "w";
  return null;
}

function drawMinimap() {
  if (!mmCtx || !CTX) return;
  const g = mmCtx;
  g.clearRect(0, 0, MM_SIZE, MM_SIZE);

  // Resolve the current zone snap defensively.
  let zoneId = null;
  let zone = null;
  try {
    zoneId = CTX.state?.currentZone?.() ?? null;
    zone = zoneId != null && CTX.state?.zone ? CTX.state.zone(zoneId) : null;
  } catch {
    zone = null;
  }
  const bound = Number(zone?.bound) > 0 ? Number(zone.bound) : 0;

  if (titleEl) titleEl.textContent = zone?.name || zoneId || "Ruinfold";

  // The zone square (only meaningful once we know its bound).
  if (bound > 0) {
    const [x0, y0] = worldToCanvas(-bound, -bound, bound);
    const [x1, y1] = worldToCanvas(bound, bound, bound);
    g.strokeStyle = "rgba(120,120,140,0.55)";
    g.lineWidth = 1;
    g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);

    // Exit markers: a short bright tick on the relevant edge, midway along it.
    const exits = zone?.exits && typeof zone.exits === "object" ? zone.exits : {};
    g.fillStyle = "#9fd6ff";
    const mid = MM_SIZE / 2;
    for (const dir of Object.keys(exits)) {
      const edge = exitEdge(dir);
      if (!edge) continue;
      if (edge === "n") g.fillRect(mid - 6, y0 - 2, 12, 4); // top
      else if (edge === "s") g.fillRect(mid - 6, y1 - 2, 12, 4); // bottom
      else if (edge === "e") g.fillRect(x1 - 2, mid - 6, 4, 12); // right
      else if (edge === "w") g.fillRect(x0 - 2, mid - 6, 4, 12); // left
    }
  }

  // Entities in my zone, as dots. Read defensively; the set may be empty pre-snapshot.
  let snaps = [];
  try {
    snaps = CTX.state?.inZone ? CTX.state.inZone() : [];
  } catch {
    snaps = [];
  }
  let target = null;
  try {
    target = CTX.state?.target ? CTX.state.target() : null;
  } catch {
    target = null;
  }
  const me = CTX.ME;
  const drawBound = bound > 0 ? bound : 32; // if bound is unknown, assume a roomy default for plotting

  for (const s of snaps || []) {
    if (!s || typeof s.x !== "number" || typeof s.z !== "number") continue;
    const kind = s.type || s.kind || "player";
    const color = DOT_COLORS[kind] || "#bdbdc6";
    const [cx, cy] = worldToCanvas(s.x, s.z, drawBound);

    g.beginPath();
    g.arc(cx, cy, 3, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();

    // The local player gets a bright white ring.
    if (s.id === me) {
      g.beginPath();
      g.arc(cx, cy, 5, 0, Math.PI * 2);
      g.strokeStyle = "#ffffff";
      g.lineWidth = 1.5;
      g.stroke();
    }
    // The current target gets a thin outline so it reads even atop its fill.
    if (target != null && s.id === target) {
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.strokeStyle = "#ffe39a";
      g.lineWidth = 1.5;
      g.stroke();
    }
  }
}

// OPTIONAL: clicking the map targets the nearest plotted dot (other than ME).
function onMinimapClick(e) {
  if (!CTX?.state?.setTarget || !canvas) return;
  let zone = null;
  try {
    const zid = CTX.state.currentZone?.();
    zone = zid != null && CTX.state.zone ? CTX.state.zone(zid) : null;
  } catch {
    zone = null;
  }
  const bound = Number(zone?.bound) > 0 ? Number(zone.bound) : 32;
  const rect = canvas.getBoundingClientRect();
  // Map the click (CSS px) into logical canvas px.
  const px = ((e.clientX - rect.left) / rect.width) * MM_SIZE;
  const py = ((e.clientY - rect.top) / rect.height) * MM_SIZE;

  let snaps = [];
  try {
    snaps = CTX.state.inZone ? CTX.state.inZone() : [];
  } catch {
    snaps = [];
  }
  let best = null;
  let bestD = 18 * 18; // only snap if within ~18 canvas px of a dot
  for (const s of snaps || []) {
    if (!s || s.id === CTX.ME || typeof s.x !== "number" || typeof s.z !== "number") continue;
    const [cx, cy] = worldToCanvas(s.x, s.z, bound);
    const d = (cx - px) ** 2 + (cy - py) ** 2;
    if (d <= bestD) {
      bestD = d;
      best = s.id;
    }
  }
  if (best) {
    try {
      CTX.state.setTarget(best);
    } catch (err) {
      console.error("[chat] setTarget failed:", err);
    }
  }
}

// --- event subscriptions -----------------------------------------------------------------------
// Wire every event this module reacts to, each guarded so one bad payload can't break the rest.
function subscribe() {
  const on = CTX.on;
  if (typeof on !== "function") {
    console.error("[chat] ctx.on is not a function; events unavailable");
    return;
  }

  // Player chatter → a normal line. The contract delivers {from,text} (from already a name).
  on("chat", (p) => {
    if (!p) return;
    pushLine([], `<span class="chat-who">${esc(p.from)}:</span> ${esc(p.text)}`);
  });

  // The COMBAT LOG, folded into the same scroll but styled dim. All ids resolve through nameOf.
  on("damage", (p) => {
    if (!p) return;
    combatLine("dmg", `${nameOf(p.id)} takes ${Math.round(p.amount ?? 0)}`);
  });
  on("heal", (p) => {
    if (!p) return;
    combatLine("heal", `${nameOf(p.id)} heals ${Math.round(p.amount ?? 0)}`);
  });
  on("died", (p) => {
    if (!p) return;
    combatLine("die", `${nameOf(p.id)} falls`);
  });
  on("levelup", (p) => {
    if (!p) return;
    combatLine("lvl", `${nameOf(p.id)} reaches Lv ${p.level ?? "?"}`);
  });
  on("effect-gain", (p) => {
    if (!p) return;
    combatLine("eff", `${nameOf(p.id)} is ${esc(p.name)}`);
  });

  // The main orchestrator tells us when the player pressed Enter to chat.
  on("focus-chat", () => showInput());

  // Centered, fading toast.
  on("toast", (msg) => showToast(typeof msg === "string" ? msg : (msg && msg.text) || ""));
}

// --- contract entry points ---------------------------------------------------------------------
export function init(ctx) {
  CTX = ctx;
  if (!CTX || !CTX.dom || typeof CTX.dom.mount !== "function") {
    console.error("[chat] init: ctx.dom.mount missing; module disabled");
    return;
  }
  try {
    injectStyle();
    buildChatBox();
    buildToast();
    buildMinimap();
    subscribe();
  } catch (e) {
    console.error("[chat] init failed:", e);
  }
}

// frame — only the minimap needs per-frame work, and only at ~8 fps. We accumulate dt and redraw
// when the interval elapses, so a fast render loop doesn't repaint the canvas needlessly.
export function frame(dt, now) {
  if (!mmCtx) return;
  mmAccum += typeof dt === "number" && dt > 0 ? dt : 0;
  if (mmAccum < MM_INTERVAL) return;
  mmAccum = 0;
  try {
    drawMinimap();
  } catch (e) {
    console.error("[chat] minimap draw failed:", e);
  }
}
