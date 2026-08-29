// panels — the game windows: a set of styled, titled, draggable-feeling boxes that float over the
// 3D world. Each window is a self-contained DOM subtree mounted inside ctx.dom.mount('panels'),
// the full-screen pass-through layer. The layer itself ignores the pointer; each window opts back
// in (pointer-events:auto) so clicks on a window land on the window, but clicks on empty space
// fall through to the world beneath.
//
// This module owns NO knowledge of the network. It listens to the state store's SEMANTIC events
// ('me', 'snapshot', 'toggle-panel', 'interact-npc', 'close-panels') and reads snapshots via
// ctx.state. It writes back to the world only through ctx.send(intent). All truth lives on the
// server; this module renders sight and feel, and forwards the player's wishes.
//
// Module-scope state tracks which windows are open and, for the NPC window, which npc it is bound
// to — so that a fresh 'me'/'snapshot' frame can re-render whatever is open without re-deriving
// what the player was looking at.
//
// Pure DOM, no framework. Everything is defensive: snapshots may be missing, fields may be absent,
// arrays may be undefined. We always fall back to safe empties ("—", [], 0).

// ---------------------------------------------------------------------------------------------
// Module-scope state. `ctx` is captured at init; `mount` is the panels layer; `open` records which
// windows are visible. `npcId` is the id of the npc whose window is open (shop or dialogue), or
// null. We keep the id (not the snapshot) so re-renders always read the freshest npc data.
// ---------------------------------------------------------------------------------------------
let ctx = null;
let mount = null;
const open = { inventory: false, character: false, crafting: false, npc: false };
let npcId = null; // which npc the NPC window is bound to (vendor or quest-giver)

// The crafting recipe catalogue — a MIRROR of the server's engine/crafting.mjs RECIPES, kept here
// as plain display data so the window can list them without a round-trip. The server is the source
// of truth and validates inputs on craft; these strings are purely cosmetic labels. Keep in sync
// with engine/crafting.mjs RECIPES by hand (the contract specifies these exact display forms).
const RECIPES = [
  { id: "bind-charm", name: "Bone Charm", inputs: "2× bone-shard" },
  { id: "forge-cleaver", name: "Bone Cleaver", inputs: "3× ectoplasm + 1× iron-blade" },
  { id: "stitch-jerkin", name: "Leather Jerkin", inputs: "2× goblin-ear" },
];

// ---------------------------------------------------------------------------------------------
// init — wire up everything. Inject the stylesheet, grab the mount layer, build (hidden) window
// shells once, and subscribe to the events that open/close/refresh them.
// ---------------------------------------------------------------------------------------------
export function init(context) {
  ctx = context;
  // Defensive: if there is no mount factory we cannot do anything; bail quietly.
  if (!ctx || typeof ctx.dom?.mount !== "function") {
    console.error("[panels] no ctx.dom.mount — cannot mount windows");
    return;
  }
  mount = ctx.dom.mount("panels");
  // The mount layer is a full-screen pass-through: it must not eat pointer events on empty space.
  // Individual windows re-enable pointer events on themselves (see the .panel-win CSS rule).
  try {
    mount.style.position = mount.style.position || "absolute";
    mount.style.inset = "0";
    mount.style.pointerEvents = "none";
  } catch { /* style may be unavailable in odd hosts; ignore */ }

  injectStyle();
  buildWindows();

  // --- subscribe to semantic events ----------------------------------------------------------
  // toggle-panel(name): main fires this for the I and C keys. Toggle that window's visibility.
  ctx.on?.("toggle-panel", (name) => {
    if (name === "inventory") toggle("inventory");
    else if (name === "character") toggle("character");
    else if (name === "crafting") toggle("crafting");
  });

  // interact-npc({id}): open the right NPC window for that npc — shop for a vendor, quest dialogue
  // for a quest-giver. Only one NPC window may be open at once; binding a new id replaces the old.
  ctx.on?.("interact-npc", (payload) => openNpc(payload && payload.id));

  // close-panels (Esc): close everything.
  ctx.on?.("close-panels", () => closeAll());

  // me / snapshot: state changed — re-render any window that is currently open so it reflects the
  // new snapshot (gold spent, item equipped, bounty progress, etc.).
  ctx.on?.("me", () => renderOpen());
  ctx.on?.("snapshot", () => renderOpen());
}

// ---------------------------------------------------------------------------------------------
// Small DOM helpers — terse element builders so the render code below stays readable.
// ---------------------------------------------------------------------------------------------

// el(tag, props, ...children) — make an element, assign className/text/attrs, append children.
function el(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    if (props.class) node.className = props.class;
    if (props.text != null) node.textContent = props.text;
    if (props.html != null) node.innerHTML = props.html;
    if (props.title != null) node.title = props.title;
    if (props.onClick) node.addEventListener("click", props.onClick);
    if (props.disabled) node.disabled = true;
    if (props.style) for (const k of Object.keys(props.style)) node.style[k] = props.style[k];
  }
  for (const c of children) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

// btn(label, onClick, opts) — a styled action button, optionally disabled.
function btn(label, onClick, opts) {
  return el("button", { class: "panel-btn", text: label, onClick, disabled: opts && opts.disabled });
}

// row(...children) — a horizontal item row used in the lists.
function row(...children) {
  return el("div", { class: "panel-row" }, ...children);
}

// safe number with fallback
const num = (v, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

// ---------------------------------------------------------------------------------------------
// Window shells. We build one shell per window once at init; render functions only refill the
// .panel-body of each. A shell is a titled box with a ✕ close button. Windows start hidden.
// `bodies` maps window name → its body element, so renders are cheap.
// ---------------------------------------------------------------------------------------------
const bodies = {}; // name -> body element
const wins = {}; // name -> the outer .panel-win element

function buildWindows() {
  if (!mount) return;
  // Layout offsets so opening several windows doesn't stack them all in one spot.
  makeWindow("inventory", "Pack", { left: "24px", top: "60px" });
  makeWindow("character", "Character", { right: "24px", top: "60px" });
  makeWindow("crafting", "Crafting", { left: "24px", bottom: "120px" });
  makeWindow("npc", "—", { left: "50%", top: "80px", transform: "translateX(-50%)" });
}

// makeWindow — build a hidden titled box and remember its body. The whole header acts as a (loose)
// drag handle for the "draggable-feeling" requirement; see makeDraggable.
function makeWindow(name, titleText, pos) {
  const win = el("div", { class: "panel-win" });
  win.dataset.win = name;
  // position the window via the provided corner offsets
  if (pos) for (const k of Object.keys(pos)) win.style[k] = pos[k];
  win.style.display = "none";

  const title = el("span", { class: "panel-title", text: titleText });
  const closeBtn = el("button", { class: "panel-x", text: "✕", title: "close", onClick: () => close(name) });
  const header = el("div", { class: "panel-head" }, title, closeBtn);
  const body = el("div", { class: "panel-body" });

  win.append(header, body);
  makeDraggable(win, header);
  mount.appendChild(win);

  wins[name] = win;
  bodies[name] = body;
  // remember the title node so the NPC window can rename itself per-npc
  win._titleNode = title;
}

// makeDraggable — give a window the FEEL of being movable: press on the header, drag, the window
// follows the pointer (switched to top/left positioning). Defensive against missing pointer APIs.
function makeDraggable(win, handle) {
  let dragging = false;
  let startX = 0, startY = 0, baseX = 0, baseY = 0;
  handle.style.cursor = "move";
  handle.addEventListener("pointerdown", (e) => {
    // don't start a drag from the ✕ button
    if (e.target && e.target.classList && e.target.classList.contains("panel-x")) return;
    dragging = true;
    const rect = win.getBoundingClientRect();
    // pin to absolute top/left so dragging is unambiguous regardless of original corner anchoring
    win.style.left = rect.left + "px";
    win.style.top = rect.top + "px";
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.transform = "none";
    baseX = rect.left;
    baseY = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    try { handle.setPointerCapture(e.pointerId); } catch { /* not all hosts support capture */ }
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    win.style.left = baseX + (e.clientX - startX) + "px";
    win.style.top = baseY + (e.clientY - startY) + "px";
  });
  const end = (e) => {
    dragging = false;
    try { if (e && e.pointerId != null) handle.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

// ---------------------------------------------------------------------------------------------
// Open / close / toggle plumbing.
// ---------------------------------------------------------------------------------------------

function show(name, on) {
  const win = wins[name];
  if (win) win.style.display = on ? "block" : "none";
  open[name] = !!on;
}

function close(name) {
  if (name === "npc") npcId = null; // unbind the npc when its window closes
  show(name, false);
}

function toggle(name) {
  if (open[name]) close(name);
  else openWindow(name);
}

// openWindow — show a window and immediately render its current contents.
function openWindow(name) {
  show(name, true);
  render(name);
}

// closeAll — Esc / global close. Hide every window and unbind the npc.
function closeAll() {
  for (const name of Object.keys(open)) show(name, false);
  npcId = null;
}

// openNpc — bind the NPC window to an npc and render shop or dialogue per its role. Only one NPC
// window open at a time, so we just rebind npcId. A missing/unknown npc closes the window.
function openNpc(id) {
  const snap = id != null ? safeGet(id) : null;
  if (!snap) { close("npc"); return; }
  npcId = id;
  show("npc", true);
  render("npc");
}

// ---------------------------------------------------------------------------------------------
// Snapshot accessors — every read is guarded; the store or its fields may be absent.
// ---------------------------------------------------------------------------------------------
function safeMe() {
  try { return ctx.state?.me?.() || null; } catch { return null; }
}
function safeGet(id) {
  try { return ctx.state?.get?.(id) || null; } catch { return null; }
}

// ---------------------------------------------------------------------------------------------
// renderOpen — refresh every currently-open window from the latest snapshot.
// renderOpen runs on every 'me'/'snapshot' event; it must be cheap and never throw.
// ---------------------------------------------------------------------------------------------
function renderOpen() {
  for (const name of Object.keys(open)) {
    if (open[name]) render(name);
  }
}

// render(name) — dispatch to the per-window renderer. Each renderer rebuilds its body wholesale
// (these lists are small; full rebuild is simpler and avoids stale rows).
function render(name) {
  try {
    if (name === "inventory") renderInventory();
    else if (name === "character") renderCharacter();
    else if (name === "crafting") renderCrafting();
    else if (name === "npc") renderNpc();
  } catch (e) {
    console.error(`[panels] render ${name} failed:`, e);
  }
}

function setBody(name, ...children) {
  const body = bodies[name];
  if (!body) return;
  body.innerHTML = "";
  for (const c of children) if (c != null) body.appendChild(c);
}

// ---------------------------------------------------------------------------------------------
// INVENTORY window — a list of the player's items. Each row: name (✦ if equipped), slot, value,
// and the actions Equip / Unequip / Drop. A gold readout sits at the top, and a button opens the
// Crafting window.
// ---------------------------------------------------------------------------------------------
function renderInventory() {
  const me = safeMe();
  const inv = Array.isArray(me?.inventory) ? me.inventory : [];

  // header: gold readout + a Crafting opener
  const gold = el("div", { class: "panel-gold", text: `⊙ ${num(me?.gold)} gold` });
  const craftOpen = btn("Crafting", () => openWindow("crafting"));
  const header = el("div", { class: "panel-subhead" }, gold, craftOpen);

  const list = el("div", { class: "panel-list" });
  if (!inv.length) {
    list.appendChild(el("div", { class: "panel-empty", text: "(your pack is empty)" }));
  } else {
    for (const it of inv) {
      if (!it) continue;
      const equipped = !!it.equipped;
      const nameStr = (it.name || it.archetype || "item") + (equipped ? " ✦" : "");
      const name = el("span", { class: equipped ? "panel-itemname panel-equip" : "panel-itemname", text: nameStr });

      // meta line: slot (if any) and value
      const bits = [];
      if (it.slot) bits.push(it.slot);
      bits.push(`⊙${num(it.value)}`);
      const meta = el("span", { class: "panel-meta", text: bits.join(" · ") });

      const acts = el("span", { class: "panel-acts" });
      if (it.slot) {
        // Equip if slotted and not equipped; Unequip if equipped.
        if (equipped) acts.appendChild(btn("Unequip", () => ctx.send?.({ kind: "unequip", slot: it.slot })));
        else acts.appendChild(btn("Equip", () => ctx.send?.({ kind: "equip", item: it.id })));
      }
      acts.appendChild(btn("Drop", () => ctx.send?.({ kind: "drop", item: it.id })));

      list.appendChild(row(el("span", { class: "panel-itemcol" }, name, meta), acts));
    }
  }
  setBody("inventory", header, list);
}

// ---------------------------------------------------------------------------------------------
// CHARACTER sheet — equipment slots (resolved from the instance id in me.equipment back to the
// item name in me.inventory), core stats, and the skills list with glyph + a "wins" progress feel.
// ---------------------------------------------------------------------------------------------
function renderCharacter() {
  const me = safeMe();
  const inv = Array.isArray(me?.inventory) ? me.inventory : [];
  const equip = me?.equipment || {};

  // resolve an equipped instance id to its item name via the inventory list
  const nameOfInstance = (id) => {
    if (id == null) return "—";
    const it = inv.find((x) => x && x.id === id);
    return it ? (it.name || it.archetype || "(item)") : "(equipped)";
  };

  // --- equipment slots ---
  const eqRows = ["weapon", "armor", "trinket"].map((slot) =>
    row(
      el("span", { class: "panel-slotname", text: slot }),
      el("span", { class: "panel-slotval", text: nameOfInstance(equip[slot]) }),
    ),
  );
  const equipSection = el("div", { class: "panel-section" },
    el("div", { class: "panel-sectitle", text: "Equipment" }),
    ...eqRows,
  );

  // --- core stats ---
  const stats = [
    ["Level", String(num(me?.level, 1))],
    ["Health", `${num(me?.maxHealth)} max`],
    ["Stamina", `${num(me?.maxStamina)} max`],
  ];
  const statSection = el("div", { class: "panel-section" },
    el("div", { class: "panel-sectitle", text: "Stats" }),
    ...stats.map(([k, v]) => row(
      el("span", { class: "panel-slotname", text: k }),
      el("span", { class: "panel-slotval", text: v }),
    )),
  );

  // --- skills ---
  const skills = Array.isArray(me?.skills) ? me.skills : [];
  const skillRows = skills.length
    ? skills.map((sk) => {
        if (!sk) return null;
        const lvl = el("span", { class: "panel-skill-lv", text: `Lv ${num(sk.level, 1)}` });
        // glyph: t / f / ⊤ ; ⊤ means contested — color it.
        const glyphClass = sk.glyph === "⊤" ? "panel-glyph panel-glyph-contested" : "panel-glyph";
        const glyph = el("span", { class: glyphClass, text: sk.glyph || "" });
        const wins = num(sk.successes);
        // a small progress feel from successes: a tiny bar plus a "n wins" label
        const fills = el("span", { class: "panel-winbar-fill" });
        // fraction of wins out of wins+fails (defensive against divide-by-zero)
        const total = wins + num(sk.fails);
        fills.style.width = total > 0 ? `${Math.round((wins / total) * 100)}%` : "0%";
        const bar = el("span", { class: "panel-winbar" }, fills);
        const wlabel = el("span", { class: "panel-meta", text: `${wins} wins` });
        const nameStr = sk.skill || "skill";
        return row(
          el("span", { class: "panel-skillname" }, el("span", { text: nameStr }), glyph),
          el("span", { class: "panel-skillstat" }, lvl, bar, wlabel),
        );
      })
    : [el("div", { class: "panel-empty", text: "(no skills yet)" })];
  const skillSection = el("div", { class: "panel-section" },
    el("div", { class: "panel-sectitle", text: "Skills" }),
    ...skillRows,
  );

  setBody("character", equipSection, statSection, skillSection);
}

// ---------------------------------------------------------------------------------------------
// CRAFTING window — the hardcoded recipe list (mirror of the server). Each row: name, inputs, and
// a Craft button → send({kind:'craft',recipe:id}). The server validates inputs; the UI does not.
// ---------------------------------------------------------------------------------------------
function renderCrafting() {
  const list = el("div", { class: "panel-list" });
  for (const r of RECIPES) {
    const info = el("span", { class: "panel-itemcol" },
      el("span", { class: "panel-itemname", text: r.name }),
      el("span", { class: "panel-meta", text: r.inputs }),
    );
    const acts = el("span", { class: "panel-acts" }, btn("Craft", () => ctx.send?.({ kind: "craft", recipe: r.id })));
    list.appendChild(row(info, acts));
  }
  const note = el("div", { class: "panel-empty", text: "Inputs are checked by the world on craft." });
  setBody("crafting", list, note);
}

// ---------------------------------------------------------------------------------------------
// NPC window — dispatch by the bound npc's role: 'vendor' → shop, 'quest-giver' → dialogue.
// Reads npcId from module state so re-renders always use fresh npc + player snapshots.
// ---------------------------------------------------------------------------------------------
function renderNpc() {
  const npc = npcId != null ? safeGet(npcId) : null;
  const titleNode = wins.npc && wins.npc._titleNode;
  if (!npc) {
    if (titleNode) titleNode.textContent = "—";
    setBody("npc", el("div", { class: "panel-empty", text: "They are not here." }));
    return;
  }
  if (titleNode) titleNode.textContent = npc.name || "Stranger";
  if (npc.role === "vendor") renderShop(npc);
  else if (npc.role === "quest-giver") renderDialogue(npc);
  else setBody("npc", el("div", { class: "panel-empty", text: "They have nothing to say." }));
}

// renderShop — vendor wares to Buy (disabled if too poor), plus your unequipped pack to Sell
// (sell value = floor(value/2)). Buy/Sell forward the npc id so the server knows the counterparty.
function renderShop(npc) {
  const me = safeMe();
  const gold = num(me?.gold);
  const stock = Array.isArray(npc.stock) ? npc.stock : [];
  const inv = Array.isArray(me?.inventory) ? me.inventory : [];

  const goldReadout = el("div", { class: "panel-gold", text: `⊙ ${gold} gold` });

  // --- buy list ---
  const buyList = el("div", { class: "panel-list" });
  if (!stock.length) buyList.appendChild(el("div", { class: "panel-empty", text: "(no wares)" }));
  for (const w of stock) {
    if (!w) continue;
    const price = num(w.price);
    const info = el("span", { class: "panel-itemcol" },
      el("span", { class: "panel-itemname", text: w.name || w.archetype || "ware" }),
      el("span", { class: "panel-meta", text: `⊙${price}` }),
    );
    const acts = el("span", { class: "panel-acts" },
      btn("Buy", () => ctx.send?.({ kind: "buy", npc: npcId, archetype: w.archetype }), { disabled: gold < price }),
    );
    buyList.appendChild(row(info, acts));
  }

  // --- sell list (non-equipped items only) ---
  const sellable = inv.filter((it) => it && !it.equipped);
  const sellList = el("div", { class: "panel-list" });
  if (!sellable.length) sellList.appendChild(el("div", { class: "panel-empty", text: "(nothing to sell)" }));
  for (const it of sellable) {
    const sellVal = Math.floor(num(it.value) / 2);
    const info = el("span", { class: "panel-itemcol" },
      el("span", { class: "panel-itemname", text: it.name || it.archetype || "item" }),
      el("span", { class: "panel-meta", text: `⊙${sellVal}` }),
    );
    const acts = el("span", { class: "panel-acts" },
      btn("Sell", () => ctx.send?.({ kind: "sell", npc: npcId, item: it.id })),
    );
    sellList.appendChild(row(info, acts));
  }

  setBody("npc",
    goldReadout,
    el("div", { class: "panel-sectitle", text: "Wares" }), buyList,
    el("div", { class: "panel-sectitle", text: "Sell (half value)" }), sellList,
  );
}

// renderDialogue — a quest-giver's single offer. Three states keyed on the player's bounty:
//   * no bounty (or carrying a different one's offer) and offer is free → Accept
//   * carrying THIS offer and progress >= goal → Turn in
//   * otherwise → progress text
function renderDialogue(npc) {
  const me = safeMe();
  const offer = npc.offers || null;
  const bounty = me?.bounty || null;

  if (!offer) {
    setBody("npc", el("div", { class: "panel-empty", text: "They have no work for you." }));
    return;
  }

  const mine = bounty && bounty.id === offer.id;
  const children = [];

  if (mine && num(bounty.progress) >= num(bounty.goal)) {
    // ready to hand in
    children.push(el("div", { class: "panel-quest-text", text: `"${offer.name || "the task"}" — done. Bring it here.` }));
    children.push(el("div", { class: "panel-acts" }, btn("Turn in", () => ctx.send?.({ kind: "turnin", npc: npcId }))));
  } else if (mine) {
    // in progress on THIS offer
    const goalKind = offer.species || "target";
    children.push(el("div", { class: "panel-quest-text", text: `"${offer.name || "the task"}" — ${num(bounty.progress)}/${num(bounty.goal)} ${goalKind}s.` }));
  } else if (bounty) {
    // carrying a different bounty already
    children.push(el("div", { class: "panel-quest-text", text: `Finish what you carry before taking "${offer.name || "this"}".` }));
  } else {
    // free to accept
    const reward = `⊙${num(offer.rewardGold)}, ${num(offer.rewardXp)} xp` + (offer.rewardItem ? `, and ${offer.rewardItem}` : "");
    children.push(el("div", { class: "panel-quest-text", text: `"${offer.name || "A task"}": slay ${num(offer.goal)} ${offer.species || "foe"}s. Reward: ${reward}.` }));
    children.push(el("div", { class: "panel-acts" }, btn("Accept", () => ctx.send?.({ kind: "accept", npc: npcId }))));
  }

  setBody("npc", ...children);
}

// ---------------------------------------------------------------------------------------------
// Styles. Injected once, all classes prefixed `.panel-`. A dark, parchment-ish frame to match a
// ruin-crawl mood. We guard against double injection via a marker id.
// ---------------------------------------------------------------------------------------------
function injectStyle() {
  if (document.getElementById("panel-styles")) return;
  const css = `
  /* every window: an absolutely-positioned child of the pass-through mount; it opts pointer back in */
  .panel-win {
    position: absolute;
    pointer-events: auto;
    min-width: 240px;
    max-width: 340px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: rgba(20, 17, 14, 0.94);
    color: #e8e0d2;
    border: 1px solid #5a4a36;
    border-radius: 6px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.6);
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    font-size: 13px;
    z-index: 50;
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: linear-gradient(180deg, #3a2f22, #2a221a);
    border-bottom: 1px solid #5a4a36;
    user-select: none;
  }
  .panel-title { font-weight: 700; letter-spacing: 0.04em; color: #f3e7cf; }
  .panel-x {
    background: transparent; border: none; color: #c8b89a; cursor: pointer;
    font-size: 14px; line-height: 1; padding: 2px 6px; border-radius: 4px;
  }
  .panel-x:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .panel-body { padding: 8px 10px; overflow-y: auto; }
  .panel-subhead {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #4a3c2c;
  }
  .panel-gold { color: #e8c45a; font-weight: 700; }
  .panel-list { display: flex; flex-direction: column; gap: 4px; }
  .panel-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 4px 6px; border-radius: 4px; background: rgba(255,255,255,0.02);
  }
  .panel-row:hover { background: rgba(255,255,255,0.05); }
  .panel-itemcol { display: flex; flex-direction: column; min-width: 0; }
  .panel-itemname { color: #e8e0d2; }
  .panel-equip { color: #9fd6ff; }
  .panel-meta { color: #9a8e78; font-size: 11px; }
  .panel-acts { display: flex; gap: 4px; flex-shrink: 0; }
  .panel-btn {
    background: #4a3c2c; color: #f0e6d2; border: 1px solid #6a5638;
    border-radius: 4px; padding: 3px 8px; font-size: 12px; cursor: pointer;
    font-family: inherit;
  }
  .panel-btn:hover:not(:disabled) { background: #5e4c36; }
  .panel-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .panel-empty { color: #8a7e68; font-style: italic; padding: 4px 6px; }
  .panel-section { margin-bottom: 10px; }
  .panel-sectitle {
    color: #c8a35a; font-weight: 700; font-size: 11px; text-transform: uppercase;
    letter-spacing: 0.08em; margin: 6px 0 4px;
  }
  .panel-slotname { color: #9a8e78; }
  .panel-slotval { color: #e8e0d2; }
  .panel-skillname { display: flex; align-items: center; gap: 6px; }
  .panel-skillstat { display: flex; align-items: center; gap: 6px; }
  .panel-skill-lv { color: #c8b89a; font-size: 11px; }
  .panel-glyph { color: #9a8e78; font-weight: 700; }
  .panel-glyph-contested { color: #ff7b5a; } /* ⊤ contested skill — call it out */
  .panel-winbar {
    display: inline-block; width: 40px; height: 5px; border-radius: 3px;
    background: rgba(255,255,255,0.12); overflow: hidden; vertical-align: middle;
  }
  .panel-winbar-fill { display: block; height: 100%; background: #6fae5a; }
  .panel-quest-text { line-height: 1.5; margin-bottom: 8px; color: #d8cdb6; }
  `;
  try {
    const style = el("style", { html: css });
    style.id = "panel-styles";
    (document.head || document.documentElement).appendChild(style);
  } catch (e) {
    console.error("[panels] could not inject styles:", e);
  }
}
