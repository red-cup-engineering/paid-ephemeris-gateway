// entities — THE juice module. It renders every actor that shares the local player's zone, with all
// the game-feel: distinct silhouettes per type, billboard nameplates + HP bars, a target ring, the
// four-valued bilattice/effect visuals (⊤ undying pulse, cursed aura, ghost translucency, slain
// collapse, poison/stun/might), and the transient pop of combat — damage/heal numbers, hit flashes,
// knockback, swing/cast lunges, death dissolves, level-up flares, undead rising bursts.
//
// It never parses the network. It subscribes to the state store's SEMANTIC events (see state.mjs)
// and to state reads (state.inZone(), state.currentZone(), state.target()). The server owns truth;
// this module owns sight and feel. Everything here is best-effort and defensive: a missing field, a
// snap for an entity we have no view for, a THREE call that throws — none of it should kill the loop.

// --- module-scope state ---------------------------------------------------------------------------
let ctx = null;        // the shared client context (THREE, scene, camera, …)
let THREE = null;      // ctx.THREE, hoisted for brevity
let scene = null;      // ctx.scene
let camera = null;     // ctx.camera

const views = new Map();   // entityId -> view (a THREE.Group + bookkeeping)
const transients = [];     // floating numbers, flares, particles — culled when their life ends
let targetRing = null;     // the single glowing torus that sits under the current target (or null)

// A tiny shared geometry cache so we don't rebuild identical primitives per entity. We DO NOT dispose
// these on view removal (they are shared); they live for the page's lifetime. Per-view unique
// geometries/materials/textures (sprites, canvases, tinted materials) ARE disposed when a view goes.
const shared = {};
function geo(key, make) { return (shared[key] ||= make()); }

// =================================================================================================
// init
// =================================================================================================
export function init(c) {
  ctx = c;
  THREE = c.THREE;
  scene = c.scene;
  camera = c.camera;

  // --- maintain the view set from the store ------------------------------------------------------
  // On a full snapshot, rebuild from whatever the store says is in our zone.
  ctx.on("snapshot", () => { try { syncFromZone(); } catch (e) { warn("snapshot sync", e); } });

  // Single-entity add/update: upsert iff it's in our zone, else make sure no stale view lingers.
  ctx.on("entity-add", ({ id, snap }) => { try { onUpsert(id, snap); } catch (e) { warn("entity-add", e); } });
  ctx.on("entity-update", ({ id, snap }) => { try { onUpsert(id, snap); } catch (e) { warn("entity-update", e); } });

  // Removal: dispose the view if we have one.
  ctx.on("entity-remove", ({ id }) => { try { removeView(id); } catch (e) { warn("entity-remove", e); } });

  // Zone change: tear everything down and rebuild from the new zone's contents.
  ctx.on("zone-change", () => {
    try {
      for (const id of [...views.keys()]) removeView(id);
      syncFromZone();
    } catch (e) { warn("zone-change", e); }
  });

  // --- target ring -------------------------------------------------------------------------------
  ctx.on("target", (id) => { try { onTarget(id); } catch (e) { warn("target", e); } });

  // --- juice events ------------------------------------------------------------------------------
  ctx.on("damage", ({ id, amount }) => { try { onDamage(id, amount); } catch (e) { warn("damage", e); } });
  ctx.on("heal", ({ id, amount }) => { try { onHeal(id, amount); } catch (e) { warn("heal", e); } });
  ctx.on("fx-swing", ({ id }) => { try { onLunge(id, "swing"); } catch (e) { warn("fx-swing", e); } });
  ctx.on("fx-cast", ({ id, ability }) => { try { onLunge(id, "cast", ability); } catch (e) { warn("fx-cast", e); } });
  ctx.on("died", ({ id }) => { try { onDied(id); } catch (e) { warn("died", e); } });
  // state.mjs emits 'rose' for an undead rising and 'levelup' for a level gain.
  ctx.on("rose", ({ id }) => { try { onRose(id); } catch (e) { warn("rose", e); } });
  ctx.on("levelup", ({ id }) => { try { onLevelUp(id); } catch (e) { warn("levelup", e); } });

  // Build whatever is already present.
  try { syncFromZone(); } catch (e) { warn("init sync", e); }

  // Build the (initially hidden) target ring up front so 'target' can just move it.
  try { ensureTargetRing(); } catch (e) { warn("ring init", e); }
}

function warn(where, e) { try { console.error(`[entities] ${where}:`, e); } catch { /* console may be gone */ } }

// =================================================================================================
// view set maintenance
// =================================================================================================

// Rebuild/refresh from the store: upsert every entity the store says is in our zone, and remove any
// view whose entity is no longer here.
function syncFromZone() {
  if (!ctx || !ctx.state) return;
  const here = new Set();
  let list = [];
  try { list = ctx.state.inZone() || []; } catch { list = []; }
  for (const snap of list) {
    if (!snap || !snap.id) continue;
    if (snap.type === "zone") continue; // zone descriptors are not actors
    here.add(snap.id);
    onUpsert(snap.id, snap);
  }
  for (const id of [...views.keys()]) if (!here.has(id)) removeView(id);
}

// Decide whether an entity belongs in our scene, and either create/refresh or remove its view.
function onUpsert(id, snap) {
  if (!id || !snap) return;
  if (snap.type === "zone") return;
  const myZone = safeCurrentZone();
  // An entity is renderable iff it's in the local player's current zone.
  const here = snap.zone != null && myZone != null && snap.zone === myZone;
  if (!here) { if (views.has(id)) removeView(id); return; }

  let v = views.get(id);
  if (!v) {
    v = buildView(id, snap);
    if (!v) return;
    views.set(id, v);
    if (v.group) scene.add(v.group);
  }
  refreshView(v, snap);
}

function safeCurrentZone() {
  try { return ctx.state.currentZone(); } catch { return null; }
}

// =================================================================================================
// building a view
// =================================================================================================
//
// A view is a Group placed at the entity's position. CRITICAL for picking: main.mjs raycasts
// scene.children RECURSIVELY and walks up parents looking for userData.entityId — but to be safe we
// stamp entityId on the group AND on every child mesh we create. tagId() below does that, and we run
// a final stamp pass over the whole subtree at the end of buildView so nothing is missed.
function buildView(id, snap) {
  const group = new THREE.Group();
  group.name = `entity:${id}`;
  group.position.set(num(snap.x), num(snap.y), num(snap.z));

  const v = {
    id,
    group,
    type: snap.type || "player",
    // bookkeeping the frame loop and juice handlers read/write:
    targetPos: new THREE.Vector3(num(snap.x), num(snap.y), num(snap.z)),
    targetYaw: num(snap.facing),
    bobPhase: Math.random() * Math.PI * 2,
    spin: 0,
    parts: [],          // meshes whose material we may flash/tint (have a base emissive/color stored)
    body: null,         // primary mesh, used for collapse + lunge
    headY: 2.4,         // approx world-y of the head, for placing sprites/effects
    baseScaleY: 1,      // remembered so collapse can restore
    // billboards:
    nameplate: null,
    hpbar: null,
    // effect sprite holders:
    topSprite: null,    // floating ⊤ (undying)
    formAura: null,     // purple cursed-form aura
    mightAura: null,    // faint red might aura
    stunSprites: [],    // spinning stars above head when stunned
    poisonTimer: 0,     // throttle for spawning falling poison particles
    // transient tween state:
    flash: 0,           // 0..1 hit-flash intensity (eases to 0)
    knock: new THREE.Vector3(), // current knockback offset (eases to 0)
    lunge: 0,           // 0..1 swing/cast pose progress (eases to 0)
    dissolve: -1,       // -1 = not dissolving; 0..1 progress while dying
    dissolveKind: null, // 'fall' (mortal/named) or 'fade' (construct) or 'generic'
    levelFlare: 0,      // brief scale-up after level-up
    // last-seen scalar state, so we only rebuild sprites/visuals on change:
    lastHealth: num(snap.health, undefined),
    lastMaxHealth: num(snap.maxHealth, undefined),
    lastLevel: snap.level,
    lastName: snap.name,
    lastAlive: snap.aliveGlyph,
    lastForm: snap.formGlyph,
    lastStatus: snap.status,
    lastEffects: "",
  };

  // Build the silhouette for this type.
  try { buildModel(v, snap); } catch (e) { warn("buildModel", e); }

  // Nameplate (everyone) + HP bar (monsters).
  try { buildNameplate(v, snap); } catch (e) { warn("buildNameplate", e); }
  if (isMonster(snap)) { try { buildHpBar(v, snap); } catch (e) { warn("buildHpBar", e); } }

  // Final safety pass: stamp entityId across the WHOLE subtree (group + all descendants).
  stampSubtree(group, id);

  return v;
}

// Stamp userData.entityId onto an object and recursively onto every descendant.
function stampSubtree(obj, id) {
  obj.traverse?.((o) => { (o.userData ||= {}).entityId = id; });
  // traverse includes obj itself, but guard in case traverse is unavailable:
  (obj.userData ||= {}).entityId = id;
}

// Add a mesh to the view: parent it, tag it, and (optionally) remember it as a "part" we can flash.
function addPart(v, mesh, { flashable = true, body = false } = {}) {
  (mesh.userData ||= {}).entityId = v.id;
  v.group.add(mesh);
  if (flashable && mesh.material) {
    // Remember the material's base color + emissive so flashing/tinting can be restored each frame.
    const m = mesh.material;
    v.parts.push({
      mesh,
      baseColor: m.color ? m.color.clone() : null,
      baseEmissive: m.emissive ? m.emissive.clone() : null,
      baseEmissiveIntensity: ("emissiveIntensity" in m) ? m.emissiveIntensity : 1,
      baseOpacity: ("opacity" in m) ? m.opacity : 1,
    });
  }
  if (body) v.body = mesh;
  return mesh;
}

// --- the per-type models -------------------------------------------------------------------------
function buildModel(v, snap) {
  const type = v.type;
  switch (type) {
    case "player":
    case "npc":
      buildHumanoid(v, type === "player");
      break;
    case "undead":
      buildUndead(v);
      break;
    case "construct":
      buildConstruct(v);
      break;
    case "cursed":
      buildCursed(v);
      break;
    case "named":
      buildNamed(v);
      break;
    case "mortal":
      buildMortal(v);
      break;
    case "item":
      buildItem(v);
      break;
    case "shrine":
      buildShrine(v);
      break;
    default:
      // Unknown type: a neutral humanoid so it's at least selectable/visible.
      buildHumanoid(v, false);
      break;
  }
}

// player / npc: capsule body + sphere head + small limb cues. Player green-ish, npc blue-ish.
function buildHumanoid(v, isPlayer) {
  const bodyColor = isPlayer ? 0x6fcf73 : 0x5a86d6;
  const bodyGeo = geo("hum.body", () => new THREE.CapsuleGeometry(0.55, 1.1, 4, 10));
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75, metalness: 0.05 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.1;
  body.castShadow = true;
  addPart(v, body, { body: true });

  const headGeo = geo("hum.head", () => new THREE.SphereGeometry(0.42, 12, 12));
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe7d8c0, roughness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.05;
  head.castShadow = true;
  addPart(v, head);

  // small limb cues: two stubby arms
  const armGeo = geo("hum.arm", () => new THREE.CapsuleGeometry(0.16, 0.7, 3, 6));
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, bodyMat);
    arm.position.set(sx * 0.62, 1.2, 0);
    arm.rotation.z = sx * 0.2;
    addPart(v, arm);
  }
  v.headY = 2.6;
  v.baseScaleY = 1;
}

// undead: bony off-white box torso + a skull-ish head.
function buildUndead(v) {
  const torsoGeo = geo("und.torso", () => new THREE.BoxGeometry(0.9, 1.3, 0.5));
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c0, roughness: 0.9, metalness: 0 });
  const torso = new THREE.Mesh(torsoGeo, boneMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  addPart(v, torso, { body: true });

  // skull: a sphere with a small jaw box; emissive eyes via a faint emissive material
  const skullGeo = geo("und.skull", () => new THREE.SphereGeometry(0.4, 10, 10));
  const skullMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.85, emissive: 0x331111, emissiveIntensity: 0.4 });
  const skull = new THREE.Mesh(skullGeo, skullMat);
  skull.position.y = 2.0;
  skull.castShadow = true;
  addPart(v, skull);

  const jawGeo = geo("und.jaw", () => new THREE.BoxGeometry(0.42, 0.18, 0.42));
  const jaw = new THREE.Mesh(jawGeo, boneMat);
  jaw.position.y = 1.72;
  addPart(v, jaw);
  v.headY = 2.5;
  v.baseScaleY = 1;
}

// construct: translucent pale-blue floating icosahedron. No ground contact; spins + bobs.
function buildConstruct(v) {
  const g = geo("con.ico", () => new THREE.IcosahedronGeometry(0.95, 0));
  const m = new THREE.MeshStandardMaterial({
    color: 0xa6d4ff, emissive: 0x2a5a8a, emissiveIntensity: 0.6,
    roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.55,
  });
  const ico = new THREE.Mesh(g, m);
  ico.position.y = 1.8; // floats off the ground
  addPart(v, ico, { body: true });
  v.floats = true;
  v.headY = 2.9;
  v.baseScaleY = 1;
}

// cursed: dark dodecahedron with red emissive.
function buildCursed(v) {
  const g = geo("cur.dodec", () => new THREE.DodecahedronGeometry(0.85, 0));
  const m = new THREE.MeshStandardMaterial({
    color: 0x1a1216, emissive: 0xcc2222, emissiveIntensity: 0.8, roughness: 0.5, metalness: 0.3,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = 1.2;
  mesh.castShadow = true;
  addPart(v, mesh, { body: true });
  v.headY = 2.3;
  v.baseScaleY = 1;
}

// named (boss): larger, ornate, gold/rust, metalness.
function buildNamed(v) {
  const bodyGeo = geo("nmd.body", () => new THREE.CapsuleGeometry(0.85, 1.7, 5, 12));
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9962e, emissive: 0x3a1c08, emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.85 });
  const body = new THREE.Mesh(bodyGeo, goldMat);
  body.position.y = 1.7;
  body.castShadow = true;
  body.scale.setScalar(1.25);
  addPart(v, body, { body: true });

  const headGeo = geo("nmd.head", () => new THREE.IcosahedronGeometry(0.6, 1));
  const headMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, emissive: 0x551100, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.7 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 3.1;
  head.castShadow = true;
  addPart(v, head);

  // ornate "crown" ring
  const crownGeo = geo("nmd.crown", () => new THREE.TorusGeometry(0.55, 0.1, 8, 16));
  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.position.y = 3.55;
  crown.rotation.x = Math.PI / 2;
  addPart(v, crown);
  v.headY = 4.0;
  v.baseScaleY = 1;
}

// mortal (goblin): a small green-brown cone.
function buildMortal(v) {
  const g = geo("mor.cone", () => new THREE.ConeGeometry(0.55, 1.3, 8));
  const m = new THREE.MeshStandardMaterial({ color: 0x5c6b34, roughness: 0.9, metalness: 0 });
  const cone = new THREE.Mesh(g, m);
  cone.position.y = 0.65;
  cone.castShadow = true;
  addPart(v, cone, { body: true });

  const headGeo = geo("mor.head", () => new THREE.SphereGeometry(0.28, 8, 8));
  const headMat = new THREE.MeshStandardMaterial({ color: 0x7a8b44, roughness: 0.85 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.35;
  addPart(v, head);
  v.headY = 1.8;
  v.baseScaleY = 1;
}

// item: a small glowing spinning octahedron (gold).
function buildItem(v) {
  const g = geo("itm.oct", () => new THREE.OctahedronGeometry(0.4, 0));
  const m = new THREE.MeshStandardMaterial({ color: 0xe7c86a, emissive: 0xe7c86a, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.6 });
  const oct = new THREE.Mesh(g, m);
  oct.position.y = 0.9;
  addPart(v, oct, { body: true });
  v.spinItem = true;
  v.headY = 1.6;
  v.baseScaleY = 1;
}

// shrine: a tall pale glowing pillar/cone with soft emissive.
function buildShrine(v) {
  const g = geo("shr.cone", () => new THREE.ConeGeometry(0.7, 3.2, 12));
  const m = new THREE.MeshStandardMaterial({ color: 0xe9e6d6, emissive: 0xbfd0e0, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.1, transparent: true, opacity: 0.92 });
  const pillar = new THREE.Mesh(g, m);
  pillar.position.y = 1.6;
  pillar.castShadow = true;
  addPart(v, pillar, { body: true });
  v.bobShrine = true;
  v.headY = 3.6;
  v.baseScaleY = 1;
}

const HUMANOID = new Set(["player", "npc", "named", "mortal", "undead"]);
function isMonster(snap) {
  // NPCs and players are not monsters; everything attackable that lives shows an HP bar.
  return snap && snap.kind === "monster";
}
function isLiving(v) {
  // living things idle-bob; constructs/items/shrines have their own motion handled separately.
  return HUMANOID.has(v.type);
}

// =================================================================================================
// billboards (sprites built from a canvas → CanvasTexture, depthTest off, always face the camera)
// =================================================================================================

// Build a sprite from a draw callback. Returns { sprite, canvas, ctx2d, texture }.
function makeCanvasSprite(w, h, draw, { worldW = 2, depthTest = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const c2d = canvas.getContext("2d");
  draw(c2d, canvas);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 1;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  // scale to a world size, preserving the canvas aspect ratio
  const aspect = w / h;
  sprite.scale.set(worldW, worldW / aspect, 1);
  return { sprite, canvas, ctx2d: c2d, texture: tex, material: mat };
}

function redrawSprite(s, draw) {
  if (!s) return;
  draw(s.ctx2d, s.canvas);
  s.texture.needsUpdate = true;
}

function buildNameplate(v, snap) {
  const label = String(snap.name ?? snap.id ?? "");
  const lv = (v.type === "player" && snap.level != null) ? `Lv ${snap.level}` : null;
  const s = makeCanvasSprite(256, 64, (c2d, cv) => drawNameplate(c2d, cv, label, lv, v.type), { worldW: 2.2 });
  s.sprite.position.set(0, v.headY + 0.6, 0);
  (s.sprite.userData ||= {}).entityId = v.id; // also pickable, harmless
  v.group.add(s.sprite);
  v.nameplate = s;
}

function drawNameplate(c2d, cv, label, lv, type) {
  c2d.clearRect(0, 0, cv.width, cv.height);
  c2d.textAlign = "center";
  c2d.textBaseline = "middle";
  // name color cues per type
  let color = "#efe9dd";
  if (type === "named") color = "#e7c86a";
  else if (type === "cursed") color = "#d6a6f0";
  else if (type === "shrine") color = "#bfd0e0";
  else if (type === "undead") color = "#cfd6c0";
  const cx = cv.width / 2;
  c2d.font = "bold 30px ui-monospace, monospace";
  // soft shadow for legibility over the 3D scene
  c2d.shadowColor = "rgba(0,0,0,0.85)"; c2d.shadowBlur = 6;
  c2d.fillStyle = color;
  c2d.fillText(label, cx, lv ? 22 : 32);
  if (lv) {
    c2d.font = "bold 22px ui-monospace, monospace";
    c2d.fillStyle = "#5a86d6";
    c2d.fillText(lv, cx, 48);
  }
}

function buildHpBar(v, snap) {
  const s = makeCanvasSprite(128, 24, (c2d, cv) => drawHpBar(c2d, cv, ratioOf(snap)), { worldW: 1.6 });
  s.sprite.position.set(0, v.headY + 0.28, 0); // under the nameplate
  (s.sprite.userData ||= {}).entityId = v.id;
  v.group.add(s.sprite);
  v.hpbar = s;
}

function ratioOf(snap) {
  const max = num(snap.maxHealth, 1) || 1;
  const cur = num(snap.health, 0);
  return clamp(cur / max, 0, 1);
}

function drawHpBar(c2d, cv, ratio) {
  c2d.clearRect(0, 0, cv.width, cv.height);
  const pad = 3, w = cv.width - pad * 2, h = cv.height - pad * 2;
  // frame
  c2d.fillStyle = "rgba(0,0,0,0.75)";
  c2d.fillRect(0, 0, cv.width, cv.height);
  // empty (red) track
  c2d.fillStyle = "#d24a33";
  c2d.fillRect(pad, pad, w, h);
  // filled (green) portion
  c2d.fillStyle = "#4fb07e";
  c2d.fillRect(pad, pad, Math.max(0, w * ratio), h);
  // border
  c2d.strokeStyle = "rgba(0,0,0,0.9)"; c2d.lineWidth = 2;
  c2d.strokeRect(1, 1, cv.width - 2, cv.height - 2);
}

// =================================================================================================
// refresh: reconcile a view with a fresh snapshot (cheap, only acts on actual changes)
// =================================================================================================
function refreshView(v, snap) {
  v.type = snap.type || v.type;

  // position + facing → lerp targets the frame loop chases
  v.targetPos.set(num(snap.x), num(snap.y), num(snap.z));
  if (snap.facing != null && Number.isFinite(snap.facing)) v.targetYaw = snap.facing;

  // nameplate: rebuild only if name or level (for players) changed
  const lvNow = (snap.type === "player") ? snap.level : null;
  if (snap.name !== v.lastName || lvNow !== v.lastLevel) {
    v.lastName = snap.name; v.lastLevel = snap.level;
    if (v.nameplate) {
      const label = String(snap.name ?? snap.id ?? "");
      const lv = (snap.type === "player" && snap.level != null) ? `Lv ${snap.level}` : null;
      redrawSprite(v.nameplate, (c2d, cv) => drawNameplate(c2d, cv, label, lv, v.type));
    }
  }

  // hp bar: rebuild only when health/maxHealth changed (the contract asks for this)
  if (isMonster(snap)) {
    if (!v.hpbar) { try { buildHpBar(v, snap); } catch (e) { warn("late hpbar", e); } }
    if (snap.health !== v.lastHealth || snap.maxHealth !== v.lastMaxHealth) {
      if (v.hpbar) redrawSprite(v.hpbar, (c2d, cv) => drawHpBar(c2d, cv, ratioOf(snap)));
    }
  }
  v.lastHealth = num(snap.health, v.lastHealth);
  v.lastMaxHealth = num(snap.maxHealth, v.lastMaxHealth);

  // bilattice / status / effect visuals — only reconcile when the relevant fields changed
  const effKey = effectsKey(snap);
  if (snap.aliveGlyph !== v.lastAlive || snap.formGlyph !== v.lastForm || snap.status !== v.lastStatus || effKey !== v.lastEffects) {
    v.lastAlive = snap.aliveGlyph; v.lastForm = snap.formGlyph; v.lastStatus = snap.status; v.lastEffects = effKey;
    try { reconcileStateVisuals(v, snap); } catch (e) { warn("stateVisuals", e); }
  }

  // keep the snap handy for the frame loop (pulse decisions, etc.)
  v.snap = snap;
}

function effectsKey(snap) {
  const es = snap.effects;
  if (!Array.isArray(es) || !es.length) return "";
  return es.map((e) => e && e.name).filter(Boolean).sort().join(",");
}

// =================================================================================================
// bilattice / effect visuals (the held, persistent ones — transient pops live elsewhere)
// =================================================================================================
function reconcileStateVisuals(v, snap) {
  const alive = snap.aliveGlyph;
  const form = snap.formGlyph;
  const status = snap.status;
  const eff = new Set((Array.isArray(snap.effects) ? snap.effects : []).map((e) => e && e.name).filter(Boolean));

  // --- aliveGlyph '⊤' (alive AND slain — undying): floating ⊤ sprite; emissive pulse done in frame()
  v.undying = alive === "⊤";
  if (v.undying && !v.topSprite) {
    const s = makeGlyphSprite("⊤", "#e6e08a", 0.9);
    s.sprite.position.set(0, v.headY + 1.1, 0);
    v.group.add(s.sprite);
    v.topSprite = s;
  } else if (!v.undying && v.topSprite) {
    disposeSprite(v.group, v.topSprite); v.topSprite = null;
  }

  // --- formGlyph '⊤' (cursed form): a purple aura + a '⊤' tint
  const cursedForm = form === "⊤";
  if (cursedForm && !v.formAura) {
    v.formAura = makeAura(0xd6a6f0, 0.35, 1.4);
    v.formAura.position.y = v.headY * 0.5;
    (v.formAura.userData ||= {}).entityId = v.id;
    v.group.add(v.formAura);
  } else if (!cursedForm && v.formAura) {
    disposeObject(v.group, v.formAura); v.formAura = null;
  }

  // --- status 'ghost' → translucent
  v.ghost = status === "ghost";

  // --- aliveGlyph 'f' or status 'slain' → collapsed + desaturated
  v.collapsed = alive === "f" || status === "slain";

  // --- effect: might → faint red aura
  const wantMight = eff.has("might");
  if (wantMight && !v.mightAura) {
    v.mightAura = makeAura(0xd24a33, 0.22, 1.1);
    v.mightAura.position.y = v.headY * 0.45;
    (v.mightAura.userData ||= {}).entityId = v.id;
    v.group.add(v.mightAura);
  } else if (!wantMight && v.mightAura) {
    disposeObject(v.group, v.mightAura); v.mightAura = null;
  }

  // --- effect: stun → spinning star sprites above the head
  const wantStun = eff.has("stun");
  if (wantStun && v.stunSprites.length === 0) {
    for (let i = 0; i < 3; i++) {
      const s = makeGlyphSprite("✶", "#e6e08a", 0.5);
      s.sprite.position.set(0, v.headY + 1.4, 0);
      v.group.add(s.sprite);
      v.stunSprites.push(s);
    }
  } else if (!wantStun && v.stunSprites.length) {
    for (const s of v.stunSprites) disposeSprite(v.group, s);
    v.stunSprites = [];
  }

  // poison / regen flags (poison spawns falling particles in frame(); both also tint in applyTint)
  v.poison = eff.has("poison");
  v.regen = eff.has("regen");
  v.might = wantMight;
  v.weaken = eff.has("weaken");

  // Apply the persistent color tints (poison green, weaken desaturate, collapse desaturate, ghost).
  applyTint(v);
}

// Re-derive each flashable part's color/opacity/emissive from base + persistent state.
// (Transient hit-flash is layered on top of this in frame().)
function applyTint(v) {
  for (const p of v.parts) {
    const m = p.mesh.material; if (!m) continue;
    if (m.color && p.baseColor) {
      m.color.copy(p.baseColor);
      if (v.poison) m.color.lerp(new THREE.Color(0x4fb07e), 0.4);     // poison → green tint
      if (v.collapsed || v.weaken) m.color.lerp(new THREE.Color(0x6a6a6a), 0.5); // desaturate
    }
    if ("opacity" in m) {
      let op = p.baseOpacity;
      if (v.ghost) op = Math.min(op, 0.4);
      m.opacity = op;
      m.transparent = m.transparent || op < 1;
    }
  }
}

// A small translucent sphere aura we attach to the group.
function makeAura(color, opacity, radius) {
  const g = geo(`aura.${radius}`, () => new THREE.SphereGeometry(1, 12, 12));
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.Mesh(g, m);
  mesh.scale.setScalar(radius);
  mesh.userData.aura = true;
  return mesh;
}

// A glyph sprite (⊤, ✶, etc.) drawn from a canvas.
function makeGlyphSprite(glyph, color, worldW) {
  const s = makeCanvasSprite(64, 64, (c2d, cv) => {
    c2d.clearRect(0, 0, cv.width, cv.height);
    c2d.textAlign = "center"; c2d.textBaseline = "middle";
    c2d.font = "bold 48px ui-monospace, monospace";
    c2d.shadowColor = "rgba(0,0,0,0.9)"; c2d.shadowBlur = 8;
    c2d.fillStyle = color;
    c2d.fillText(glyph, cv.width / 2, cv.height / 2);
  }, { worldW });
  return s;
}

// =================================================================================================
// target ring
// =================================================================================================
function ensureTargetRing() {
  if (targetRing) return targetRing;
  const g = geo("ring.torus", () => new THREE.TorusGeometry(1.1, 0.09, 8, 32));
  const m = new THREE.MeshBasicMaterial({ color: 0xe6e08a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  targetRing = new THREE.Mesh(g, m);
  targetRing.rotation.x = Math.PI / 2; // lie flat on the ground
  targetRing.visible = false;
  // Not pickable as an entity — leave userData empty so clicks fall through to the entity beneath.
  scene.add(targetRing);
  return targetRing;
}

function onTarget(id) {
  ensureTargetRing();
  if (!id || !views.has(id)) { targetRing.visible = false; targetRing.userData.followId = null; return; }
  targetRing.userData.followId = id;
  targetRing.visible = true;
}

// =================================================================================================
// transients: floating numbers, flares, particles
// =================================================================================================
//
// A transient is { sprite, life, ttl, vy, fade, kind }. We add the sprite to the SCENE (world space)
// so it can rise independent of the entity, and cull + dispose it when life >= ttl.
function spawnTransient(sprite, { ttl = 1, vy = 1.6, fade = true, spin = 0 } = {}) {
  scene.add(sprite);
  transients.push({ sprite, life: 0, ttl, vy, fade, spin });
}

// floating damage/heal number at a world position
function spawnNumber(text, worldPos, { color = "#efe9dd", big = false } = {}) {
  const w = big ? 192 : 128, h = big ? 96 : 64;
  const s = makeCanvasSprite(w, h, (c2d, cv) => {
    c2d.clearRect(0, 0, cv.width, cv.height);
    c2d.textAlign = "center"; c2d.textBaseline = "middle";
    c2d.font = `bold ${big ? 70 : 46}px ui-monospace, monospace`;
    c2d.shadowColor = "rgba(0,0,0,0.9)"; c2d.shadowBlur = 8;
    c2d.lineWidth = big ? 6 : 4; c2d.strokeStyle = "rgba(0,0,0,0.9)";
    c2d.strokeText(text, cv.width / 2, cv.height / 2);
    c2d.fillStyle = color;
    c2d.fillText(text, cv.width / 2, cv.height / 2);
  }, { worldW: big ? 2.6 : 1.7 });
  // slight horizontal jitter so stacked hits don't perfectly overlap
  s.sprite.position.copy(worldPos);
  s.sprite.position.x += (Math.random() - 0.5) * 0.8;
  s.sprite.position.y += 0.2;
  spawnTransient(s.sprite, { ttl: big ? 1.25 : 1.0, vy: big ? 1.9 : 1.5 });
}

// a green/gold expanding ring flare (level-up, rose burst)
function spawnFlare(worldPos, color, { startW = 0.6, ttl = 0.8 } = {}) {
  const s = makeCanvasSprite(128, 128, (c2d, cv) => {
    c2d.clearRect(0, 0, cv.width, cv.height);
    const cx = cv.width / 2, cy = cv.height / 2;
    const grd = c2d.createRadialGradient(cx, cy, cv.width * 0.18, cx, cy, cv.width * 0.48);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(0.7, color);
    grd.addColorStop(1, "rgba(255,255,255,0)");
    c2d.fillStyle = grd;
    c2d.beginPath(); c2d.arc(cx, cy, cv.width * 0.48, 0, Math.PI * 2); c2d.fill();
  }, { worldW: startW, depthTest: false });
  s.sprite.material.blending = THREE.AdditiveBlending;
  s.sprite.position.copy(worldPos);
  // a flare expands rather than rising: mark it so frame() grows its scale instead of moving it up
  const t = { sprite: s.sprite, life: 0, ttl, vy: 0, fade: true, spin: 0, grow: 3.2, startW };
  scene.add(s.sprite);
  transients.push(t);
}

// a single small falling particle sprite (poison drip, rose embers)
function spawnParticle(worldPos, color, { ttl = 0.9, vy = -0.8, size = 0.22 } = {}) {
  const s = makeCanvasSprite(32, 32, (c2d, cv) => {
    c2d.clearRect(0, 0, cv.width, cv.height);
    const cx = cv.width / 2;
    const grd = c2d.createRadialGradient(cx, cx, 1, cx, cx, cx);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    c2d.fillStyle = grd;
    c2d.beginPath(); c2d.arc(cx, cx, cx, 0, Math.PI * 2); c2d.fill();
  }, { worldW: size, depthTest: false });
  s.sprite.material.blending = THREE.AdditiveBlending;
  s.sprite.position.copy(worldPos);
  s.sprite.position.x += (Math.random() - 0.5) * 0.9;
  s.sprite.position.z += (Math.random() - 0.5) * 0.9;
  spawnTransient(s.sprite, { ttl, vy });
}

// world-space position of a view's head (for spawning numbers/flares above it)
function headWorld(v) {
  const p = v.group.position;
  return new THREE.Vector3(p.x, p.y + v.headY, p.z);
}

// =================================================================================================
// juice event handlers
// =================================================================================================
function onDamage(id, amount) {
  const v = views.get(id);
  const amt = Math.max(0, Math.round(num(amount, 0)));
  // Always show a number where the entity is, even if we somehow lack a view this frame.
  if (v) {
    v.flash = 1;                       // bright red flash, eased in frame()
    // knockback: push away from the camera-ish (just use facing-opposite / random small dir)
    const ang = Math.random() * Math.PI * 2;
    v.knock.set(Math.cos(ang) * 0.5, 0, Math.sin(ang) * 0.5);
    const big = amt >= 15;
    spawnNumber(`-${amt}`, headWorld(v), { color: big ? "#ffffff" : "#ff7a5c", big });
  }
}

function onHeal(id, amount) {
  const v = views.get(id);
  const amt = Math.max(0, Math.round(num(amount, 0)));
  if (v) {
    v.healFlash = 1; // soft green flash
    spawnNumber(`+${amt}`, headWorld(v), { color: "#7ee0a0" });
  }
}

function onLunge(id, kind, ability) {
  const v = views.get(id);
  if (!v) return;
  v.lunge = 1;            // eased toward 0 in frame(); we read it for a forward jab / scale pop
  v.lungeKind = kind;     // 'swing' (jab) or 'cast' (scale pop)
  if (kind === "cast") {
    // a quick upward cast flare at the head
    spawnFlare(headWorld(v), "rgba(122,170,255,0.9)", { startW: 0.5, ttl: 0.4 });
  }
}

function onDied(id) {
  const v = views.get(id);
  if (!v) return;
  v.dissolve = 0;
  if (v.type === "construct") v.dissolveKind = "fade";
  else if (v.type === "mortal" || v.type === "named") v.dissolveKind = "fall";
  else v.dissolveKind = "generic";
}

function onRose(id) {
  const v = views.get(id);
  if (!v) return;
  // cancel any death dissolve (it rises again) and burst eerie embers
  v.dissolve = -1;
  v.group.visible = true;
  const hp = headWorld(v);
  spawnFlare(hp, "rgba(150,255,180,0.85)", { startW: 0.8, ttl: 0.9 });
  for (let i = 0; i < 10; i++) {
    spawnParticle(new THREE.Vector3(hp.x, v.group.position.y + 0.2, hp.z), "rgba(150,255,180,0.95)", { ttl: 0.9, vy: 1.4 + Math.random(), size: 0.3 });
  }
}

function onLevelUp(id) {
  const v = views.get(id);
  if (!v) return;
  v.levelFlare = 1; // brief scale-up, eased in frame()
  const hp = headWorld(v);
  spawnFlare(new THREE.Vector3(hp.x, v.group.position.y + 0.1, hp.z), "rgba(231,200,106,0.95)", { startW: 1.0, ttl: 0.9 });
  spawnFlare(hp, "rgba(231,200,106,0.8)", { startW: 0.6, ttl: 0.7 });
}

// =================================================================================================
// frame: lerp, ease, bob, spin, advance tweens/flashes/particles, pulse, cull
// =================================================================================================
export function frame(dt, now) {
  if (!THREE) return;
  const d = clamp(num(dt, 0.016), 0, 0.1);
  const k = 1 - Math.pow(0.0015, d); // smoothing factor for position/yaw lerps
  const t = num(now, performance.now ? performance.now() : 0) / 1000;

  for (const v of views.values()) {
    try { stepView(v, d, k, t); } catch (e) { warn("stepView", e); }
  }

  // target ring follows its entity
  try { stepTargetRing(d, t); } catch (e) { warn("stepRing", e); }

  // transients: move/grow/fade, cull when expired
  try { stepTransients(d); } catch (e) { warn("stepTransients", e); }
}

function stepView(v, d, k, t) {
  const g = v.group;

  // --- position lerp toward target (x,z; y from model + bob/float) ------------------------------
  g.position.x += (v.targetPos.x - g.position.x) * k;
  g.position.z += (v.targetPos.z - g.position.z) * k;
  // base y is the entity's y (≈0); constructs float, but their mesh already sits at +1.8 internally
  const baseY = v.targetPos.y;

  // --- knockback ease back to 0 (added on top of position) --------------------------------------
  if (v.knock.lengthSq() > 1e-5) {
    g.position.x += v.knock.x; g.position.z += v.knock.z;
    v.knock.multiplyScalar(Math.max(0, 1 - d * 8));
    if (v.knock.lengthSq() < 1e-5) v.knock.set(0, 0, 0);
  }

  // --- facing / yaw ease ------------------------------------------------------------------------
  if (Number.isFinite(v.targetYaw)) {
    let cur = g.rotation.y;
    let diff = v.targetYaw - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y = cur + diff * k;
  }

  // --- idle bob / float / spin ------------------------------------------------------------------
  let bobY = 0;
  v.bobPhase += d * 2.2;
  if (isLiving(v) && !v.collapsed && v.dissolve < 0) bobY = Math.sin(v.bobPhase) * 0.06;
  if (v.floats) bobY = Math.sin(v.bobPhase * 0.8) * 0.25; // construct floats/bobs more
  if (v.bobShrine) bobY = Math.sin(v.bobPhase * 0.6) * 0.12;
  g.position.y = baseY + bobY;

  if (v.spinItem && v.body) v.body.rotation.y += d * 1.8;
  if (v.floats && v.body) { v.body.rotation.y += d * 0.6; v.body.rotation.x += d * 0.25; }

  // --- collapse (slain / aliveGlyph 'f'): squash scale.y, restore when standing ------------------
  const wantScaleY = (v.collapsed && v.dissolve < 0) ? 0.25 : v.baseScaleY;
  g.scale.y += (wantScaleY - g.scale.y) * Math.min(1, d * 6);

  // --- lunge (swing jab / cast pop) -------------------------------------------------------------
  if (v.lunge > 0) {
    v.lunge = Math.max(0, v.lunge - d * 6.5); // ~150ms
    const pulse = Math.sin((1 - v.lunge) * Math.PI); // 0→1→0
    if (v.lungeKind === "swing" && v.body) {
      // forward jab along facing
      v.body.position.z = bodyBaseZ(v) + pulse * 0.5;
    } else if (v.body) {
      // cast: scale pop
      const s = 1 + pulse * 0.18;
      v.body.scale.setScalar(s);
    }
    if (v.lunge === 0 && v.body) { v.body.position.z = bodyBaseZ(v); v.body.scale.setScalar(1); }
  }

  // --- level-up brief scale-up ------------------------------------------------------------------
  if (v.levelFlare > 0) {
    v.levelFlare = Math.max(0, v.levelFlare - d * 2.2);
    const pop = 1 + Math.sin(v.levelFlare * Math.PI) * 0.15;
    g.scale.x = pop; g.scale.z = pop;
  } else if (g.scale.x !== 1) {
    g.scale.x += (1 - g.scale.x) * Math.min(1, d * 6);
    g.scale.z += (1 - g.scale.z) * Math.min(1, d * 6);
  }

  // --- death dissolve ---------------------------------------------------------------------------
  if (v.dissolve >= 0) {
    v.dissolve = Math.min(1.0001, v.dissolve + d * 0.9);
    const p = v.dissolve;
    if (v.dissolveKind === "fall") {
      g.rotation.z = -Math.PI / 2 * Math.min(1, p * 1.4); // fall over
      setGroupOpacity(v, 1 - p);
    } else if (v.dissolveKind === "fade") {
      setGroupOpacity(v, 1 - p);                          // construct fades to nothing
      g.scale.setScalar(Math.max(0.01, v.baseScaleY * (1 - p * 0.5)));
    } else {
      setGroupOpacity(v, 1 - p);
    }
    if (v.dissolve >= 1) {
      // for undead this is usually overridden by 'rose'; for the truly gone, the store will send
      // entity-remove. We keep the (now invisible) view until then, but stop further dissolve work.
      g.visible = false;
      v.dissolve = 1;
    }
  }

  // --- hit flash (red) and heal flash (green), layered over persistent tint ----------------------
  if (v.flash > 0 || v.healFlash > 0) {
    for (const p of v.parts) {
      const m = p.mesh.material; if (!m || !m.color) continue;
      // start from the persistent-tinted color computed by applyTint... but applyTint only runs on
      // change, so recompute the base each frame here by lerping from base toward flash color.
      const base = p.baseColor || m.color;
      if (v.flash > 0) m.color.copy(base).lerp(new THREE.Color(0xff3030), v.flash);
      else if (v.healFlash > 0) m.color.copy(base).lerp(new THREE.Color(0x6fff9a), v.healFlash * 0.8);
    }
    v.flash = Math.max(0, v.flash - d * 5);
    v.healFlash = Math.max(0, v.healFlash - d * 4);
    if (v.flash === 0 && v.healFlash === 0) applyTint(v); // settle back to persistent tint
  }

  // --- undying ⊤ emissive pulse + floating ⊤ bob -------------------------------------------------
  if (v.undying) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    for (const p of v.parts) {
      const m = p.mesh.material; if (!m || !("emissiveIntensity" in m) || !m.emissive) continue;
      m.emissive.copy(p.baseEmissive || new THREE.Color(0x000000)).lerp(new THREE.Color(0xe6e08a), 0.5);
      m.emissiveIntensity = (p.baseEmissiveIntensity || 0.2) + pulse * 0.9;
    }
    if (v.topSprite) v.topSprite.sprite.position.y = v.headY + 1.1 + Math.sin(t * 2) * 0.12;
  }

  // --- might / form auras pulse softly ----------------------------------------------------------
  if (v.mightAura) v.mightAura.scale.setScalar(1.1 + Math.sin(t * 5) * 0.08);
  if (v.formAura) {
    v.formAura.scale.setScalar(1.4 + Math.sin(t * 3) * 0.1);
    v.formAura.rotation.y += d * 0.6;
  }

  // --- stun stars orbit the head ----------------------------------------------------------------
  if (v.stunSprites.length) {
    v.stunSprites.forEach((s, i) => {
      const a = t * 4 + (i / v.stunSprites.length) * Math.PI * 2;
      s.sprite.position.set(Math.cos(a) * 0.55, v.headY + 1.35 + Math.sin(t * 6 + i) * 0.05, Math.sin(a) * 0.55);
    });
  }

  // --- poison falling particles (throttled) ------------------------------------------------------
  if (v.poison && v.dissolve < 0) {
    v.poisonTimer -= d;
    if (v.poisonTimer <= 0) {
      v.poisonTimer = 0.18 + Math.random() * 0.12;
      const hp = headWorld(v);
      spawnParticle(new THREE.Vector3(hp.x, g.position.y + v.headY * 0.7, hp.z), "rgba(110,224,150,0.9)", { ttl: 0.8, vy: -1.0, size: 0.18 });
    }
  }
}

function bodyBaseZ(v) { return v._bodyBaseZ ??= (v.body ? v.body.position.z : 0); }

// Set opacity across all flashable parts (for dissolve/ghost). Marks materials transparent.
function setGroupOpacity(v, op) {
  for (const p of v.parts) {
    const m = p.mesh.material; if (!m || !("opacity" in m)) continue;
    m.transparent = true;
    m.opacity = clamp(op, 0, 1) * (p.baseOpacity ?? 1);
  }
  // also fade the billboards a touch
  const so = clamp(op, 0, 1);
  if (v.nameplate) v.nameplate.material.opacity = so;
  if (v.hpbar) v.hpbar.material.opacity = so;
}

function stepTargetRing(d, t) {
  if (!targetRing) return;
  const id = targetRing.userData.followId;
  if (!id) { targetRing.visible = false; return; }
  const v = views.get(id);
  if (!v) { targetRing.visible = false; return; }
  targetRing.visible = true;
  const p = v.group.position;
  targetRing.position.set(p.x, 0.05, p.z);
  targetRing.rotation.z += d * 1.2; // slow glowing rotation
  targetRing.material.opacity = 0.6 + 0.25 * Math.sin(t * 4);
  targetRing.scale.setScalar(1 + 0.04 * Math.sin(t * 4));
}

function stepTransients(d) {
  for (let i = transients.length - 1; i >= 0; i--) {
    const tr = transients[i];
    tr.life += d;
    const u = tr.life / tr.ttl; // 0..1
    if (u >= 1) {
      scene.remove(tr.sprite);
      disposeSpriteObject(tr.sprite);
      transients.splice(i, 1);
      continue;
    }
    if (tr.vy) tr.sprite.position.y += tr.vy * d;
    if (tr.grow) {
      const sc = tr.startW + tr.grow * u;
      tr.sprite.scale.set(sc, sc, 1);
    }
    if (tr.spin) tr.sprite.material.rotation += tr.spin * d;
    if (tr.fade && tr.sprite.material) tr.sprite.material.opacity = 1 - u; // ease-out fade
  }
}

// =================================================================================================
// disposal (avoid GPU leaks)
// =================================================================================================
function removeView(id) {
  const v = views.get(id);
  if (!v) return;
  views.delete(id);
  if (targetRing && targetRing.userData.followId === id) { targetRing.visible = false; targetRing.userData.followId = null; }
  if (v.group) {
    scene.remove(v.group);
    disposeGroup(v.group);
  }
}

// Dispose every UNIQUE geometry/material/texture under a group. Shared geometries (from geo()) are
// left intact — we only dispose materials/textures (always per-view here) and any geometry not in the
// shared cache.
function disposeGroup(group) {
  const sharedGeos = new Set(Object.values(shared));
  group.traverse?.((o) => {
    // sprites
    if (o.isSprite && o.material) {
      if (o.material.map) safeDispose(o.material.map);
      safeDispose(o.material);
      return;
    }
    if (o.geometry && !sharedGeos.has(o.geometry)) safeDispose(o.geometry);
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) safeDispose(m.map);
        safeDispose(m);
      }
    }
  });
}

function disposeObject(group, obj) {
  if (!obj) return;
  group.remove(obj);
  const sharedGeos = new Set(Object.values(shared));
  if (obj.geometry && !sharedGeos.has(obj.geometry)) safeDispose(obj.geometry);
  if (obj.material) {
    if (obj.material.map) safeDispose(obj.material.map);
    safeDispose(obj.material);
  }
}

function disposeSprite(group, s) {
  if (!s) return;
  group.remove(s.sprite);
  if (s.texture) safeDispose(s.texture);
  if (s.material) safeDispose(s.material);
}

function disposeSpriteObject(sprite) {
  if (!sprite) return;
  if (sprite.material) {
    if (sprite.material.map) safeDispose(sprite.material.map);
    safeDispose(sprite.material);
  }
}

function safeDispose(x) { try { x.dispose?.(); } catch { /* already gone */ } }

// =================================================================================================
// small helpers
// =================================================================================================
function num(x, dflt = 0) { return Number.isFinite(x) ? x : dflt; }
function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
