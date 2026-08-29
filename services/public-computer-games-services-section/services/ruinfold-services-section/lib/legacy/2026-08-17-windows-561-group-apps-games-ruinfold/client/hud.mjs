// hud — the heads-up display module. It is a CLIENT MODULE: it gets the shared `ctx` in init(),
// mounts a handful of DOM surfaces (player frame, target frame, party list, world-event banner,
// quest tracker), and re-renders them in reaction to the state store's SEMANTIC events. It never
// touches the network and never reads SSE frames directly — it asks `ctx.state` for the current
// view and listens on `ctx.on(...)` for the moments that change that view.
//
// Surfaces and the mount points they live in (see ctx.dom.mount):
//   #hud            player frame   (top-left)
//   #target-frame   target frame   (top-center)            — hidden unless a target is set
//   #party          party frames   (left, under player)    — empty when solo
//   #event-banner   world event    (top-center, under target) — hidden during calm
//   #quest-tracker  quest tracker  (right)                 — hidden with no bounty
//
// Re-render policy: we CACHE element references at build time and, on each relevant event, update
// text content / bar widths rather than rebuilding the DOM. Bars carry a CSS width transition, so
// updating their width animates for free. Effect chips show remaining duration = until - tick;
// they refresh on every 'snapshot' (server tick), and a tiny frame() smooths the countdown.
//
// This module is PURE DOM (no three.js). All injected styles are prefixed `.hud-` to avoid
// colliding with the existing 2D overlay in ui.mjs / index.html. It is written DEFENSIVELY:
// every state read is guarded, every snapshot field is treated as possibly-missing, and the whole
// init() is the caller's to wrap in try/catch (main.mjs already does).

// --- module-scope state ----------------------------------------------------------------------
// `ctx` is captured in init so the small helper functions and frame() can reach the store.
let ctx = null;

// Cached element references, grouped by surface. Built once in init(); thereafter we only mutate
// their text / style. `null` until init runs.
let els = null;

// --- small helpers ---------------------------------------------------------------------------

// clamp a fraction into [0,1] — bar widths must never overflow or go negative.
const clamp01 = (n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

// safe number: coerce to a finite number or fall back.
const num = (v, fallback = 0) => (Number.isFinite(+v) ? +v : fallback);

// escape user-controlled text before it ever reaches innerHTML. Mirrors ui.mjs's helper.
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// create an element with a class and optional text — keeps the build code terse.
function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

// the current server tick, defensively (state.tick may be absent in odd builds).
const tickNow = () => {
  try { return num(ctx?.state?.tick?.(), 0); } catch { return 0; }
};

// my snapshot, or undefined — every render path tolerates undefined.
const mine = () => {
  try { return ctx?.state?.me?.(); } catch { return undefined; }
};

// Effect chip styling. Known effects get a color class; unknown effects fall back to a neutral
// chip so a new server effect still shows (just without a bespoke color). `hud-fx-<name>` classes
// are defined in the injected stylesheet below.
const KNOWN_EFFECTS = new Set(["poison", "regen", "stun", "might", "weaken"]);

// World events that mean "nothing is happening" — the banner stays hidden for these. The contract
// lists 'calm' and 'Ruinfold'; we also treat empty / falsy as calm.
const CALM_EVENTS = new Set(["calm", "Ruinfold", "none", ""]);
const isLiveEvent = (name) => !!name && !CALM_EVENTS.has(name);

// --- style injection -------------------------------------------------------------------------
// One <style> with all `.hud-` rules. Injected once, idempotently (guarded by a marker id).
function injectStyle() {
  if (document.getElementById("hud-style")) return;
  const style = make("style");
  style.id = "hud-style";
  style.textContent = `
    /* shared frame chrome */
    .hud-frame {
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      color: #e8e4d8;
      background: rgba(14, 12, 10, 0.62);
      border: 1px solid rgba(180, 160, 120, 0.28);
      border-radius: 6px;
      padding: 6px 8px;
      pointer-events: none;
      user-select: none;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      box-sizing: border-box;
    }
    .hud-hidden { display: none !important; }

    /* name + level header */
    .hud-head { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
    .hud-name { font-weight: 600; font-size: 13px; }
    .hud-lvl  { font-size: 11px; opacity: 0.8; }

    /* bars: a track with an absolutely-positioned fill and a centered numeric label */
    .hud-bar {
      position: relative;
      height: 14px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.45);
      overflow: hidden;
      margin: 2px 0;
    }
    .hud-bar-sm { height: 9px; }
    .hud-fill {
      position: absolute; inset: 0;
      transform-origin: left center;
      transform: scaleX(1);
      transition: transform 220ms ease-out;
    }
    .hud-fill-hp { background: linear-gradient(#c0392b, #962d22); }
    .hud-fill-st { background: linear-gradient(#3fae5a, #2c8543); }
    .hud-bar-label {
      position: relative; z-index: 1;
      display: block; text-align: center;
      font-size: 10px; line-height: 14px;
      letter-spacing: 0.3px;
    }

    /* gold readout */
    .hud-gold { color: #e8c662; font-size: 12px; margin-top: 3px; }

    /* status tags */
    .hud-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; min-height: 0; }
    .hud-tag {
      font-size: 10px; padding: 1px 5px; border-radius: 8px;
      border: 1px solid rgba(200, 190, 160, 0.4);
      background: rgba(60, 55, 45, 0.5);
    }
    .hud-tag-undead { color: #b9d2ff; border-color: rgba(150, 180, 255, 0.5); }
    .hud-tag-curse  { color: #d9a4ff; border-color: rgba(200, 140, 255, 0.5); }
    .hud-tag-ghost  { color: #cfeaff; opacity: 0.85; }

    /* effect chips */
    .hud-fx { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
    .hud-chip {
      font-size: 9px; padding: 1px 4px; border-radius: 3px;
      background: rgba(70, 70, 70, 0.6); color: #ddd;
      white-space: nowrap;
    }
    .hud-fx-poison { background: rgba(95, 150, 50, 0.75); color: #eaffcf; }
    .hud-fx-regen  { background: rgba(40, 150, 90, 0.75); color: #d9ffe8; }
    .hud-fx-stun   { background: rgba(150, 130, 40, 0.78); color: #fff4cf; }
    .hud-fx-might  { background: rgba(170, 70, 40, 0.78); color: #ffe0cf; }
    .hud-fx-weaken { background: rgba(110, 70, 150, 0.78); color: #ecd9ff; }

    /* target frame: a touch wider, centered content */
    .hud-target { min-width: 160px; }

    /* party list */
    .hud-party-row { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
    .hud-party-name { font-size: 11px; flex: 0 0 auto; min-width: 60px; }
    .hud-party-row .hud-bar { flex: 1 1 auto; }

    /* world-event banner */
    .hud-banner {
      font-family: ui-serif, Georgia, serif;
      font-size: 18px; letter-spacing: 1px; text-align: center;
      padding: 8px 16px; border-radius: 6px;
      background: rgba(20, 16, 12, 0.7);
      border: 1px solid rgba(200, 180, 120, 0.4);
      color: #f0e6cf;
      pointer-events: none; user-select: none;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    }
    .hud-banner-bloodmoon {
      color: #ff6a5a; border-color: rgba(255, 60, 40, 0.7);
      background: rgba(50, 8, 8, 0.72);
      animation: hud-pulse-red 1.4s ease-in-out infinite;
    }
    .hud-banner-undeadtide {
      color: #9cff8a; border-color: rgba(120, 255, 110, 0.55);
      background: rgba(10, 34, 14, 0.72);
      text-shadow: 0 0 8px rgba(120, 255, 110, 0.5);
    }
    @keyframes hud-pulse-red {
      0%, 100% { box-shadow: 0 0 4px rgba(255, 40, 30, 0.4); }
      50%      { box-shadow: 0 0 18px rgba(255, 40, 30, 0.85); }
    }

    /* quest tracker */
    .hud-quest-name { color: #e8c662; font-size: 13px; font-weight: 600; }
    .hud-quest-prog { font-size: 11px; opacity: 0.9; margin-top: 2px; }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// --- build the player frame ------------------------------------------------------------------
// Returns a struct of refs we update later. Built once.
function buildPlayer(mount) {
  mount.classList.add("hud-frame");

  const head = make("div", "hud-head");
  const name = make("span", "hud-name", "—");
  const lvl = make("span", "hud-lvl", "");
  head.append(name, lvl);

  // HP bar
  const hpBar = make("div", "hud-bar");
  const hpFill = make("div", "hud-fill hud-fill-hp");
  const hpLabel = make("span", "hud-bar-label", "");
  hpBar.append(hpFill, hpLabel);

  // Stamina bar
  const stBar = make("div", "hud-bar");
  const stFill = make("div", "hud-fill hud-fill-st");
  const stLabel = make("span", "hud-bar-label", "");
  stBar.append(stFill, stLabel);

  const gold = make("div", "hud-gold", "⊙ 0");
  const tags = make("div", "hud-tags");
  const fx = make("div", "hud-fx");

  mount.append(head, hpBar, stBar, gold, tags, fx);
  return { name, lvl, hpFill, hpLabel, stFill, stLabel, gold, tags, fx };
}

// --- build the target frame ------------------------------------------------------------------
function buildTarget(mount) {
  mount.classList.add("hud-frame", "hud-target", "hud-hidden");

  const head = make("div", "hud-head");
  const name = make("span", "hud-name", "—");
  const lvl = make("span", "hud-lvl", "");
  head.append(name, lvl);

  const hpBar = make("div", "hud-bar");
  const hpFill = make("div", "hud-fill hud-fill-hp");
  const hpLabel = make("span", "hud-bar-label", "");
  hpBar.append(hpFill, hpLabel);

  const fx = make("div", "hud-fx");

  mount.append(head, hpBar, fx);
  return { mount, name, lvl, hpFill, hpLabel, fx };
}

// --- build the party container (rows are created on demand, keyed by id) ----------------------
function buildParty(mount) {
  // The party mount holds zero-or-more rows; when empty we leave it visually empty (no frame
  // chrome) so a solo player sees nothing. We track a Map id -> row refs for reuse.
  return { mount, rows: new Map() };
}

// --- build the world-event banner ------------------------------------------------------------
function buildBanner(mount) {
  mount.classList.add("hud-banner", "hud-hidden");
  return { mount };
}

// --- build the quest tracker -----------------------------------------------------------------
function buildQuest(mount) {
  mount.classList.add("hud-frame", "hud-hidden");
  const name = make("div", "hud-quest-name", "");
  const prog = make("div", "hud-quest-prog", "");
  mount.append(name, prog);
  return { mount, name, prog };
}

// --- effect chips: render a snapshot's effects[] into a container ----------------------------
// Rebuilds the chip list (effects are few and change rarely; full rebuild is cheap and simplest).
function renderEffects(container, snap) {
  if (!container) return;
  const effects = Array.isArray(snap?.effects) ? snap.effects : [];
  const tick = tickNow();
  // Clear and rebuild.
  container.textContent = "";
  for (const e of effects) {
    if (!e || !e.name) continue;
    const remaining = num(e.until, 0) - tick;
    // The contract: show remaining only when positive. A non-positive remaining means expired or
    // unknown-duration; we still show the chip name (without a countdown) so the effect is visible.
    const chip = make("span", "hud-chip");
    const safeName = String(e.name).toLowerCase();
    if (KNOWN_EFFECTS.has(safeName)) chip.classList.add(`hud-fx-${safeName}`);
    chip.textContent = remaining > 0 ? `${e.name} ${remaining}` : `${e.name}`;
    // stash for the lightweight frame() countdown refresh.
    chip.dataset.until = String(num(e.until, 0));
    chip.dataset.name = String(e.name);
    container.appendChild(chip);
  }
}

// frame()-driven refresh of just the countdown numbers already on screen — no rebuild. Reads the
// stashed `until` off each chip and recomputes against the live tick.
function refreshCountdowns(container) {
  if (!container) return;
  const tick = tickNow();
  for (const chip of container.children) {
    const until = num(chip.dataset?.until, 0);
    const name = chip.dataset?.name ?? "";
    const remaining = until - tick;
    chip.textContent = remaining > 0 ? `${name} ${remaining}` : `${name}`;
  }
}

// --- render the player frame -----------------------------------------------------------------
function renderPlayer() {
  if (!els) return;
  const me = mine();
  const p = els.player;
  if (!me) {
    // Not joined yet: show a placeholder rather than stale data.
    p.name.textContent = "—";
    p.lvl.textContent = "joining…";
    p.hpFill.style.transform = "scaleX(0)";
    p.hpLabel.textContent = "—";
    p.stFill.style.transform = "scaleX(0)";
    p.stLabel.textContent = "—";
    p.gold.textContent = "⊙ 0";
    p.tags.textContent = "";
    p.fx.textContent = "";
    return;
  }

  p.name.textContent = me.name ?? ctx.ME ?? "—";
  p.lvl.textContent = `Lv ${num(me.level, 1)}`;

  const hp = Math.max(0, num(me.health, 0));
  const maxHp = num(me.maxHealth, 0);
  p.hpFill.style.transform = `scaleX(${clamp01(hp / (maxHp || 1))})`;
  p.hpLabel.textContent = `${hp}/${maxHp}`;

  const st = Math.max(0, num(me.stamina, 0));
  const maxSt = num(me.maxStamina, 0);
  p.stFill.style.transform = `scaleX(${clamp01(st / (maxSt || 1))})`;
  p.stLabel.textContent = `${st}/${maxSt}`;

  p.gold.textContent = `⊙ ${num(me.gold, 0)}`;

  // status tags row
  p.tags.textContent = "";
  if (me.aliveGlyph === "⊤") p.tags.appendChild(make("span", "hud-tag hud-tag-undead", "⊤ undying"));
  if (me.formGlyph === "⊤") p.tags.appendChild(make("span", "hud-tag hud-tag-curse", "⊤ lycanthrope"));
  if (me.status === "ghost") p.tags.appendChild(make("span", "hud-tag hud-tag-ghost", "ghost"));

  renderEffects(p.fx, me);
}

// --- render the target frame -----------------------------------------------------------------
function renderTarget() {
  if (!els) return;
  const t = els.target;
  let id = null;
  try { id = ctx.state?.target?.() ?? null; } catch { id = null; }
  const snap = id ? safeGet(id) : null;

  if (!id || !snap) {
    t.mount.classList.add("hud-hidden");
    return;
  }
  t.mount.classList.remove("hud-hidden");

  t.name.textContent = snap.name ?? id;
  t.lvl.textContent = `Lv ${num(snap.level, 1)}`;

  const hp = Math.max(0, num(snap.health, 0));
  const maxHp = num(snap.maxHealth, 0);
  t.hpFill.style.transform = `scaleX(${clamp01(hp / (maxHp || 1))})`;
  t.hpLabel.textContent = `${hp}/${maxHp}`;

  renderEffects(t.fx, snap);
}

// state.get guarded.
function safeGet(id) {
  try { return ctx.state?.get?.(id); } catch { return undefined; }
}

// --- render the party list -------------------------------------------------------------------
// Lists the OTHER players sharing my zone whose snap.party === my party. Reuses rows by id.
function renderParty() {
  if (!els) return;
  const party = els.party;
  const me = mine();
  const myParty = me?.party ?? null;

  // gather the members (exclude me; require same party; require player kind)
  let members = [];
  if (myParty != null) {
    let zoneSnaps = [];
    try { zoneSnaps = ctx.state?.inZone?.() ?? []; } catch { zoneSnaps = []; }
    members = zoneSnaps.filter((s) => s && s.kind === "player" && s.id !== ctx.ME && s.party === myParty);
  }

  const seen = new Set();
  for (const s of members) {
    seen.add(s.id);
    let row = party.rows.get(s.id);
    if (!row) {
      const wrap = make("div", "hud-frame hud-party-row");
      const name = make("span", "hud-party-name", "");
      const bar = make("div", "hud-bar hud-bar-sm");
      const fill = make("div", "hud-fill hud-fill-hp");
      bar.appendChild(fill);
      wrap.append(name, bar);
      party.mount.appendChild(wrap);
      row = { wrap, name, fill };
      party.rows.set(s.id, row);
    }
    row.name.textContent = s.name ?? s.id;
    const hp = Math.max(0, num(s.health, 0));
    const maxHp = num(s.maxHealth, 0);
    row.fill.style.transform = `scaleX(${clamp01(hp / (maxHp || 1))})`;
  }

  // remove rows for members who left the party / zone
  for (const [id, row] of party.rows) {
    if (!seen.has(id)) {
      row.wrap.remove();
      party.rows.delete(id);
    }
  }
}

// --- render the world-event banner -----------------------------------------------------------
function renderBanner() {
  if (!els) return;
  const b = els.banner;
  const me = mine();
  const name = me?.event;

  // reset themed classes each render
  b.mount.classList.remove("hud-banner-bloodmoon", "hud-banner-undeadtide");

  if (!isLiveEvent(name)) {
    b.mount.classList.add("hud-hidden");
    b.mount.textContent = "";
    return;
  }

  b.mount.classList.remove("hud-hidden");
  b.mount.textContent = prettyEvent(name);
  const key = String(name).toLowerCase();
  if (key === "blood-moon" || key === "bloodmoon") b.mount.classList.add("hud-banner-bloodmoon");
  else if (key === "undead-tide" || key === "undeadtide") b.mount.classList.add("hud-banner-undeadtide");
}

// turn an event id like "blood-moon" into "Blood Moon" for display.
function prettyEvent(name) {
  return String(name)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- render the quest tracker ----------------------------------------------------------------
function renderQuest() {
  if (!els) return;
  const q = els.quest;
  const me = mine();
  const bounty = me?.bounty;

  if (!bounty || bounty.id == null) {
    q.mount.classList.add("hud-hidden");
    return;
  }
  q.mount.classList.remove("hud-hidden");
  q.name.textContent = `✦ ${bounty.id}`;
  q.prog.textContent = `${num(bounty.progress, 0)}/${num(bounty.goal, 0)} ${bounty.targetKind ?? "target"}s`;
}

// --- init ------------------------------------------------------------------------------------
export function init(context) {
  ctx = context;
  if (!ctx || !ctx.dom || typeof ctx.dom.mount !== "function") {
    console.error("[hud] missing ctx.dom.mount — cannot mount HUD");
    return;
  }

  injectStyle();

  // mount each surface; mount() is guaranteed to return an element (it creates one if absent).
  const mPlayer = ctx.dom.mount("hud");
  const mTarget = ctx.dom.mount("target-frame");
  const mParty = ctx.dom.mount("party");
  const mBanner = ctx.dom.mount("event-banner");
  const mQuest = ctx.dom.mount("quest-tracker");

  els = {
    player: buildPlayer(mPlayer),
    target: buildTarget(mTarget),
    party: buildParty(mParty),
    banner: buildBanner(mBanner),
    quest: buildQuest(mQuest),
  };

  // Initial paint — the store may already hold a snapshot if events fired before init.
  renderPlayer();
  renderTarget();
  renderParty();
  renderBanner();
  renderQuest();

  // --- subscriptions ---------------------------------------------------------------------------
  // 'me' — my snapshot changed: redraw the player frame, banner, quest, and party (party membership
  // and my party id both live on / derive from my snapshot).
  ctx.on?.("me", () => {
    renderPlayer();
    renderBanner();
    renderQuest();
    renderParty();
  });

  // 'target' — selected target changed (id or null): redraw the target frame.
  ctx.on?.("target", () => {
    renderTarget();
  });

  // 'snapshot' — a full/delta world frame landed (every server tick): refresh the views that read
  // OTHER entities — the target's stats and the party members' stats — and let effect countdowns
  // re-tick. The player frame is driven by 'me', but a snapshot is a fine moment to refresh it too.
  ctx.on?.("snapshot", () => {
    renderPlayer();
    renderTarget();
    renderParty();
  });

  // 'world-event' — the ambient event changed: redraw the banner immediately (also covered by 'me').
  ctx.on?.("world-event", () => {
    renderBanner();
  });
}

// --- frame -----------------------------------------------------------------------------------
// Optional light loop: only smooths the on-screen effect-chip countdowns between server ticks. It
// does NOT rebuild anything — it just rewrites the numeric text on chips already rendered. Cheap
// enough to run every frame; fully guarded so a missing surface is a no-op.
export function frame() {
  if (!els) return;
  refreshCountdowns(els.player?.fx);
  refreshCountdowns(els.target?.fx);
}
