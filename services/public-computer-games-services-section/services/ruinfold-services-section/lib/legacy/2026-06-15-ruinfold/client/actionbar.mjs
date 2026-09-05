// actionbar — the ability hotbar. A self-contained client module: it mounts a bottom-center row of
// four ability slots, draws each ability's icon onto a small canvas (no images, just 2D paths),
// shows a per-slot cooldown veil that sweeps down as the cooldown burns off, dims a slot when you
// can't afford its stamina cost, and lets you click a slot to fire the ability. It reads ONLY from
// the shared `ctx` (state snapshot + tick) and writes ONLY through `ctx.send`. It keeps no truth of
// its own — just the DOM elements it built and a cache of the last canvas size it painted at.
//
// Contract (see CLIENT MODULE CONTRACT in the brief):
//   init(ctx)         — build the bar once, inject styles, wire clicks.
//   frame(dt, now)    — every frame: update cooldown veils + stamina dimming from me()/tick().
//   ctx = { THREE, scene, camera, renderer, state, send, ME, dom:{mount(id)}, on, emit }
//   state.me()    -> my snapshot (or undefined before we've joined)
//   state.tick()  -> current server tick (int)
//   state.target()-> targeted entity id, or null
//   send({ kind:'ability', ability, target })

// --- ability table ------------------------------------------------------------------------------
// Slot order is the keybind order (1..4). `cd` is the key into snapshot.cooldowns (note Mend reads
// the server's 'heal' cooldown). `cost` is stamina. `cdTicks` is the cooldown LENGTH (for the
// tooltip, and as a fallback denominator for the sweep when we have no "started" estimate). `glyph`
// names which icon-drawing routine to use. `desc` is the tooltip blurb.
const ABILITIES = [
  { key: "1", ability: "heavy",       name: "Heavy",  cd: "heavy",  cost: 6, cdTicks: 4,  glyph: "heavy",  desc: "A crushing overhead blow to your target." },
  { key: "2", ability: "cleave",      name: "Cleave", cd: "cleave", cost: 8, cdTicks: 6,  glyph: "cleave", desc: "A wide arc that bites everything before you." },
  { key: "3", ability: "bolt",        name: "Bolt",   cd: "bolt",   cost: 5, cdTicks: 3,  glyph: "bolt",   desc: "A crackling lance of force at your target." },
  { key: "4", ability: "second-wind", name: "Mend",   cd: "heal",   cost: 8, cdTicks: 10, glyph: "mend",   desc: "Catch your breath and knit your wounds." },
];

// --- module-scope state -------------------------------------------------------------------------
let CTX = null;        // the shared ctx, captured in init
let mount = null;      // the mounted container element
let built = false;     // guard so we only build the DOM + styles once
const slots = [];      // per-ability runtime handles: { def, el, canvas, veil, cdText, lastReady, dimmed, painted }
let tip = null;        // the singleton tooltip element

// --- styling ------------------------------------------------------------------------------------
// All classes are prefixed `.ab-`. The veil is a div whose height we scale from the bottom up to
// represent remaining cooldown; transform-origin bottom so it "drains" downward as cooldown ends.
const STYLE = `
.ab-bar{
  position:absolute; left:50%; bottom:18px; transform:translateX(-50%);
  display:flex; gap:10px; padding:8px 10px;
  background:rgba(10,10,14,.55); border:1px solid rgba(255,255,255,.08);
  border-radius:12px; backdrop-filter:blur(3px);
  font-family:ui-monospace,Menlo,Consolas,monospace; user-select:none; z-index:30;
}
.ab-slot{
  position:relative; width:58px; height:58px; border-radius:10px; cursor:pointer;
  background:rgba(28,28,36,.9); border:1px solid rgba(255,255,255,.12);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  transition:border-color .12s ease, transform .06s ease;
}
.ab-slot:hover{ border-color:rgba(255,255,255,.4); }
.ab-slot:active{ transform:translateY(1px); }
.ab-canvas{ position:absolute; inset:0; width:100%; height:100%; }
.ab-key{
  position:absolute; top:2px; left:4px; font-size:11px; line-height:1;
  color:rgba(255,255,255,.85); text-shadow:0 1px 2px #000; pointer-events:none;
}
.ab-name{
  position:absolute; bottom:2px; left:0; right:0; text-align:center;
  font-size:10px; letter-spacing:.04em; color:rgba(255,255,255,.9);
  text-shadow:0 1px 2px #000; pointer-events:none;
}
.ab-veil{
  position:absolute; left:0; right:0; bottom:0; height:100%;
  background:rgba(6,8,14,.72); transform-origin:bottom; transform:scaleY(0);
  display:flex; align-items:flex-start; justify-content:center;
  pointer-events:none;
}
.ab-cdtext{
  margin-top:6px; font-size:14px; font-weight:600; color:#fff;
  text-shadow:0 1px 3px #000;
}
.ab-slot.ab-disabled{ cursor:not-allowed; opacity:.45; filter:grayscale(.5); }
.ab-slot.ab-disabled:hover{ border-color:rgba(255,80,80,.5); }
.ab-tip{
  position:absolute; z-index:40; max-width:220px; padding:8px 10px;
  background:rgba(8,8,12,.95); border:1px solid rgba(255,255,255,.16);
  border-radius:8px; color:#eee; font-family:ui-monospace,Menlo,Consolas,monospace;
  font-size:12px; line-height:1.35; pointer-events:none; display:none;
}
.ab-tip .ab-tip-name{ font-weight:700; color:#fff; }
.ab-tip .ab-tip-meta{ opacity:.75; margin-top:4px; }
`;

function injectStyle() {
  // Defensive: only add our <style> once, even if init somehow runs twice.
  if (document.getElementById("ab-style")) return;
  const s = document.createElement("style");
  s.id = "ab-style";
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// --- icon drawing -------------------------------------------------------------------------------
// Each icon is drawn into the slot's own canvas at device-pixel resolution. We paint on a unit-ish
// coordinate system by scaling to the canvas's CSS box, so paths read the same regardless of DPR.
// Evocative, not pretty: bold strokes, a glow, distinct silhouette per ability.

function paintIcon(slot) {
  const { canvas, def } = slot;
  const ctx2d = canvas.getContext && canvas.getContext("2d");
  if (!ctx2d) return; // canvas unsupported — slot still works, just no glyph
  // Size the backing store to the rendered box × DPR. Bail if the box has no size yet.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 58;
  const h = canvas.clientHeight || 58;
  if (w <= 0 || h <= 0) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.clearRect(0, 0, w, h);

  // Common stroke style for the glyph.
  ctx2d.lineWidth = 3;
  ctx2d.lineCap = "round";
  ctx2d.lineJoin = "round";
  const cx = w / 2, cy = h / 2;

  try {
    switch (def.glyph) {
      case "heavy":  drawHeavy(ctx2d, cx, cy, w, h); break;
      case "cleave": drawCleave(ctx2d, cx, cy, w, h); break;
      case "bolt":   drawBolt(ctx2d, cx, cy, w, h); break;
      case "mend":   drawMend(ctx2d, cx, cy, w, h); break;
      default: /* unknown glyph: leave blank */ break;
    }
  } catch {
    /* a drawing error must never break the frame loop */
  }
  slot.painted = `${canvas.width}x${canvas.height}`;
}

// heavy — a heavy downward chevron over a short hammer-haft, suggesting a crushing overhead blow.
function drawHeavy(c, cx, cy, w, h) {
  c.strokeStyle = "#ffce6b";
  c.shadowColor = "rgba(255,206,107,.6)";
  c.shadowBlur = 8;
  // double downward chevron
  for (let i = 0; i < 2; i++) {
    const yo = cy - 12 + i * 12;
    c.beginPath();
    c.moveTo(cx - 13, yo);
    c.lineTo(cx, yo + 11);
    c.lineTo(cx + 13, yo);
    c.stroke();
  }
  // short haft beneath, hinting at a hammer driving down
  c.beginPath();
  c.moveTo(cx, cy + 10);
  c.lineTo(cx, cy + 19);
  c.stroke();
  c.shadowBlur = 0;
}

// cleave — a sweeping arc/fan, like a wide blade carving across an enemy's front.
function drawCleave(c, cx, cy, w, h) {
  c.strokeStyle = "#9be7ff";
  c.shadowColor = "rgba(155,231,255,.6)";
  c.shadowBlur = 8;
  const r = Math.min(w, h) * 0.34;
  // the arc
  c.beginPath();
  c.arc(cx, cy + r * 0.5, r, Math.PI * 1.15, Math.PI * 1.85);
  c.stroke();
  // a couple of motion ticks fanning off the arc to imply the sweep
  const ticks = [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
  for (const a of ticks) {
    const ax = cx + Math.cos(a) * r;
    const ay = cy + r * 0.5 + Math.sin(a) * r;
    const bx = cx + Math.cos(a) * (r + 7);
    const by = cy + r * 0.5 + Math.sin(a) * (r + 7);
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.stroke();
  }
  c.shadowBlur = 0;
}

// bolt — a jagged lightning zigzag from top to bottom.
function drawBolt(c, cx, cy, w, h) {
  c.strokeStyle = "#c9a6ff";
  c.shadowColor = "rgba(201,166,255,.7)";
  c.shadowBlur = 9;
  c.beginPath();
  c.moveTo(cx + 6, cy - 16);
  c.lineTo(cx - 6, cy - 2);
  c.lineTo(cx + 4, cy - 2);
  c.lineTo(cx - 8, cy + 16);
  c.stroke();
  c.shadowBlur = 0;
}

// mend — a soft plus/cross, the universal sign of restoration.
function drawMend(c, cx, cy, w, h) {
  c.strokeStyle = "#8fe39a";
  c.shadowColor = "rgba(143,227,154,.6)";
  c.shadowBlur = 8;
  const a = 12;
  c.beginPath();
  c.moveTo(cx, cy - a);
  c.lineTo(cx, cy + a);
  c.moveTo(cx - a, cy);
  c.lineTo(cx + a, cy);
  c.stroke();
  c.shadowBlur = 0;
}

// --- build --------------------------------------------------------------------------------------
function buildSlot(def) {
  const el = document.createElement("div");
  el.className = "ab-slot";
  el.dataset.ability = def.ability;

  const canvas = document.createElement("canvas");
  canvas.className = "ab-canvas";

  const key = document.createElement("span");
  key.className = "ab-key";
  key.textContent = def.key;

  const name = document.createElement("span");
  name.className = "ab-name";
  name.textContent = def.name;

  const veil = document.createElement("div");
  veil.className = "ab-veil";
  const cdText = document.createElement("span");
  cdText.className = "ab-cdtext";
  veil.appendChild(cdText);

  el.append(canvas, veil, key, name);

  // click → fire the ability. Mend (second-wind) passes a null target; the rest pass the current
  // target (which may also be null — the server decides what a targetless attack does).
  el.addEventListener("click", () => fire(def));

  // tooltip on hover
  el.addEventListener("mouseenter", () => showTip(def, el));
  el.addEventListener("mousemove", (e) => moveTip(e));
  el.addEventListener("mouseleave", hideTip);

  const slot = { def, el, canvas, veil, cdText, lastReady: 0, dimmed: null, painted: "" };
  slots.push(slot);
  return el;
}

function fire(def) {
  if (!CTX) return;
  try {
    // Respect stamina gating on click too — a dimmed slot shouldn't send a doomed intent.
    const me = safeMe();
    if (me && typeof me.stamina === "number" && me.stamina < def.cost) return;
    const target = def.ability === "second-wind" ? null : (safeTarget() ?? null);
    CTX.send({ kind: "ability", ability: def.ability, target });
  } catch (e) {
    // Never let a click handler throw into the page.
    console.error("[actionbar] fire failed:", e);
  }
}

// --- tooltip ------------------------------------------------------------------------------------
function showTip(def, anchorEl) {
  if (!tip) return;
  tip.innerHTML =
    `<div class="ab-tip-name">${def.name}</div>` +
    `<div>${escapeHtml(def.desc)}</div>` +
    `<div class="ab-tip-meta">Cost ${def.cost} stamina · Cooldown ${def.cdTicks} ticks</div>`;
  tip.style.display = "block";
  // Position above the slot initially; mousemove refines it.
  const r = anchorEl.getBoundingClientRect();
  tip.style.left = `${Math.round(r.left)}px`;
  tip.style.top = `${Math.round(r.top - tip.offsetHeight - 8)}px`;
}
function moveTip(e) {
  if (!tip || tip.style.display === "none") return;
  // Keep the tip just above the cursor, clamped into the viewport.
  const pad = 12;
  let x = e.clientX + 8;
  let y = e.clientY - tip.offsetHeight - 10;
  x = Math.max(pad, Math.min(x, window.innerWidth - tip.offsetWidth - pad));
  y = Math.max(pad, y);
  tip.style.left = `${Math.round(x)}px`;
  tip.style.top = `${Math.round(y)}px`;
}
function hideTip() {
  if (tip) tip.style.display = "none";
}

// --- safe accessors -----------------------------------------------------------------------------
// All reads from `state` are wrapped: the snapshot may be undefined before join, and state methods
// could in principle throw. We always fall back to a safe default.
function safeMe() {
  try { return CTX && CTX.state && CTX.state.me ? CTX.state.me() : undefined; }
  catch { return undefined; }
}
function safeTick() {
  try { const t = CTX && CTX.state && CTX.state.tick ? CTX.state.tick() : 0; return Number.isFinite(t) ? t : 0; }
  catch { return 0; }
}
function safeTarget() {
  try { return CTX && CTX.state && CTX.state.target ? CTX.state.target() : null; }
  catch { return null; }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

// --- lifecycle: init ----------------------------------------------------------------------------
export function init(ctx) {
  CTX = ctx;
  if (built) return; // idempotent

  injectStyle();

  // Mount target — bottom-center container provided by main via ctx.dom.mount.
  try {
    mount = ctx && ctx.dom && typeof ctx.dom.mount === "function" ? ctx.dom.mount("actionbar") : null;
  } catch {
    mount = null;
  }
  if (!mount) {
    // No mount point: nothing to render. Stay silent but functional (frame() will no-op).
    console.error("[actionbar] no mount point; hotbar disabled");
    return;
  }

  const bar = document.createElement("div");
  bar.className = "ab-bar";
  for (const def of ABILITIES) bar.appendChild(buildSlot(def));
  mount.appendChild(bar);

  // singleton tooltip lives on <body> so it floats above everything.
  tip = document.createElement("div");
  tip.className = "ab-tip";
  document.body.appendChild(tip);

  // Paint the icons once now; frame() will repaint if the canvas backing size needs to change
  // (e.g. the box only got real dimensions after layout, or DPR changed).
  for (const s of slots) paintIcon(s);

  built = true;
}

// --- lifecycle: frame ---------------------------------------------------------------------------
// Called every frame. Cheap: a few reads + style writes. Guards everything so an undefined snapshot
// (before join) or a missing cooldown key never throws into main's frame loop.
export function frame(dt, now) {
  if (!built || !slots.length) return;

  const me = safeMe();
  const tick = safeTick();
  const cds = (me && me.cooldowns) || {};
  const stamina = me && typeof me.stamina === "number" ? me.stamina : null;

  for (const s of slots) {
    const def = s.def;

    // Repaint the icon if the canvas backing store doesn't match its rendered box yet (handles the
    // first frames before layout settled, and DPR/resize changes). Cheap string compare guards it.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wantW = Math.round((s.canvas.clientWidth || 58) * dpr);
    const wantH = Math.round((s.canvas.clientHeight || 58) * dpr);
    if (s.canvas.width !== wantW || s.canvas.height !== wantH) {
      paintIcon(s);
    }

    // --- cooldown veil ---
    // cooldowns[key] is the server TICK the ability is ready again. remaining = readyTick - tick.
    const readyTick = typeof cds[def.cd] === "number" ? cds[def.cd] : 0;
    const remaining = Math.max(0, readyTick - tick);

    if (remaining > 0) {
      // We have no authoritative "cooldown started" tick, so estimate the fraction from the known
      // cooldown LENGTH (cdTicks). If remaining exceeds the nominal length (e.g. a longer server
      // cooldown), clamp to a full veil. Veil scaleY: 1 = full (just used), 0 = ready.
      const denom = def.cdTicks > 0 ? def.cdTicks : remaining;
      const frac = Math.max(0, Math.min(1, remaining / denom));
      s.veil.style.transform = `scaleY(${frac})`;
      // show the remaining tick count as text inside the veil
      if (s.cdText.textContent !== String(remaining)) s.cdText.textContent = String(remaining);
      if (s.veil.style.display !== "flex") s.veil.style.display = "flex";
    } else {
      // ready: hide the veil entirely
      if (s.veil.style.transform !== "scaleY(0)") s.veil.style.transform = "scaleY(0)";
      if (s.veil.style.display !== "none") s.veil.style.display = "none";
      if (s.cdText.textContent !== "") s.cdText.textContent = "";
    }

    // --- stamina gating ---
    // Dim + mark unusable when we can't afford the cost. If we have no snapshot yet, leave enabled.
    const unusable = stamina != null && stamina < def.cost;
    if (s.dimmed !== unusable) {
      s.el.classList.toggle("ab-disabled", unusable);
      s.dimmed = unusable;
    }
  }
}
