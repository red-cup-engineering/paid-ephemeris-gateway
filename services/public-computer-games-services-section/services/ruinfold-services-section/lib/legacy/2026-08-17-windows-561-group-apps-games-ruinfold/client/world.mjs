// world — the 3D environment module for Ruinfold. It owns everything that makes the place feel like
// a moody fallen keep: the sky gradient, the fog, the lights (ambient + hemisphere + a shadow-casting
// "moonlight" + flickering torches), and the per-zone scenery (ground, grid, ruined walls, broken
// pillars, rubble, torch-posts). It NEVER parses the network — it subscribes to the state store's
// semantic zone events ('zone-change', 'zone-data') and (re)builds the environment from a zoneSnap.
//
// Contract recap (from the client module contract):
//   init(ctx) and optional frame(dt, now).
//   ctx = { THREE, scene, camera, renderer, state, send, ME, dom, on, emit }.
//   zoneSnap = { id, name, describing, bound (half-extent), spawnX, spawnZ, exits:{dir:destZoneId} }.
//   The ground is a 2*bound square centered at origin.
//
// We prefer ctx.THREE so we share the one three.js instance the orchestrator created, but we fall
// back to a top-level import if for some reason it isn't supplied. Everything else is defensive:
// missing zone data, missing fields, double-init, and GPU disposal on rebuild are all handled.

import * as THREE_FALLBACK from "three";

// ---------------------------------------------------------------------------------------------------
// module-scope state — there is exactly one world per client, so module scope is the right home.
// ---------------------------------------------------------------------------------------------------
let THREE = THREE_FALLBACK; // resolved from ctx.THREE in init(); fallback to the import above
let CTX = null;             // the shared ctx
let SCENE = null;           // ctx.scene

let env = null;             // the THREE.Group holding the CURRENT zone's scenery (rebuilt per zone)
let torches = [];           // [{ light, glow, baseIntensity, phase }] for frame() flicker
let bobbers = [];           // [{ mesh, baseY, amp, phase }] props that gently bob

let ambient = null;         // persistent lights (created once, never rebuilt)
let hemi = null;
let moon = null;

let skyMesh = null;         // the inverted gradient sphere used as the backdrop
let skyTexture = null;      // CanvasTexture used for scene.background (kept so we can dispose it)

let started = false;        // guards against double-init

// A palette tuned for "dusk / funereal": deep indigo sky into near-black, cold moonlight, warm torch.
const COLOR = {
  skyTop: "#0b0a1f",     // deep indigo (top of the gradient)
  skyBottom: "#020205",  // near-black (horizon / bottom)
  fog: 0x0a0a16,         // matches the lower sky so distance dissolves into it
  ambient: 0x1a1c2e,     // very low cool ambient
  hemiSky: 0x2a2d4a,     // cool slate-blue "sky" bounce
  hemiGround: 0x080808,  // dark ground bounce
  moon: 0xaab4d6,        // pale cold moonlight
  torch: 0xff7a2a,       // warm orange torch flame
  wall: 0x4a4a52,        // weathered grey stone
  pillar: 0x55555d,      // slightly lighter broken granite
  rubble: 0x3f3f46,      // darker debris
  post: 0x2a2018,        // dark charred wood for torch posts
  grid: 0x222233,        // faint readability grid
};

// ---------------------------------------------------------------------------------------------------
// init — wire up persistent rig (sky/fog/lights), then build the current zone (if any) and listen.
// ---------------------------------------------------------------------------------------------------
export function init(ctx) {
  if (started) return; // double-init guard (e.g. hot reload)
  started = true;

  CTX = ctx;
  // Prefer the shared instance so geometry/material type checks line up across modules.
  THREE = ctx?.THREE || THREE_FALLBACK;
  SCENE = ctx?.scene;
  if (!SCENE) { console.warn("[world] no scene on ctx; nothing to build"); return; }

  buildSkyAndFog();
  buildLights();

  // Build whatever zone we already know about (the orchestrator may have ingested a snapshot before
  // this module initialized). currentZone() may be null on a cold start; that's fine — buildZone
  // handles a missing snap by drawing a neutral default so the player is never staring into the void.
  try {
    const zid = ctx.state?.currentZone?.() ?? null;
    const snap = zid != null ? ctx.state?.zone?.(zid) : null;
    buildZone(snap);
  } catch (e) {
    console.error("[world] initial buildZone failed:", e);
    buildZone(null);
  }

  // Rebuild the whole environment when the player crosses into a new zone.
  ctx.on?.("zone-change", ({ zone, data } = {}) => {
    // Prefer the data handed to us; fall back to looking it up by id.
    const snap = data || (zone != null ? ctx.state?.zone?.(zone) : null);
    buildZone(snap || null);
  });

  // The current zone's data (re)arrived. If we have no env yet, or the bound changed, rebuild;
  // otherwise it's the same place and we can leave the scenery alone to avoid churn.
  ctx.on?.("zone-data", (snap) => {
    if (!snap) return;
    if (!env) { buildZone(snap); return; }
    if (env.userData?.zoneId !== snap.id) { buildZone(snap); return; }
    const prevBound = env.userData?.bound;
    if (typeof snap.bound === "number" && snap.bound !== prevBound) buildZone(snap);
    // same zone, same size → no rebuild.
  });
}

// ---------------------------------------------------------------------------------------------------
// sky + fog — a vertical gradient backdrop. We use BOTH a CanvasTexture as scene.background (cheap,
// always visible) AND a large inverted sphere with the same gradient (so the gradient reads with the
// camera's perspective and sits behind the fog). The fog fades distant geometry into the lower sky.
// ---------------------------------------------------------------------------------------------------
function buildSkyAndFog() {
  // --- gradient canvas → CanvasTexture used directly as the scene background ---
  const c = document.createElement("canvas");
  c.width = 2; c.height = 256; // 2px wide is plenty; the gradient is purely vertical
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0.0, COLOR.skyTop);
  grad.addColorStop(0.55, "#070617");
  grad.addColorStop(1.0, COLOR.skyBottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);

  skyTexture = new THREE.CanvasTexture(c);
  // colorSpace handling differs across three versions; set it defensively if the enum exists.
  if (THREE.SRGBColorSpace) skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.needsUpdate = true;
  SCENE.background = skyTexture;

  // --- a large inverted sphere with a vertex-driven gradient, for depth behind the fog ---
  // Vertex colors give us a smooth top→bottom blend without a custom shader. BackSide so we see it
  // from inside; depthWrite off and fog off so it always sits at infinity and isn't fogged away.
  const geo = new THREE.SphereGeometry(400, 24, 16);
  const top = new THREE.Color(COLOR.skyTop);
  const bottom = new THREE.Color(COLOR.skyBottom);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    // normalize y from [-r, r] to [0, 1]; mix bottom→top.
    const t = (pos.getY(i) / 400) * 0.5 + 0.5;
    tmp.copy(bottom).lerp(top, Math.max(0, Math.min(1, t)));
    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  skyMesh = new THREE.Mesh(geo, mat);
  skyMesh.name = "ruinfold-sky";
  skyMesh.frustumCulled = false; // it surrounds the camera; never cull it
  SCENE.add(skyMesh);

  // --- fog: fade distance into the lower-sky color so the world feels enclosed and murky ---
  SCENE.fog = new THREE.Fog(COLOR.fog, 30, 110);
}

// ---------------------------------------------------------------------------------------------------
// lights — persistent across zones. Created once. A torch RIG (the flickering point lights) is owned
// per-zone instead, because torches live with the props that mark them.
// ---------------------------------------------------------------------------------------------------
function buildLights() {
  // low cool ambient so shadows never go fully black
  ambient = new THREE.AmbientLight(COLOR.ambient, 0.6);
  SCENE.add(ambient);

  // hemisphere: cool slate sky overhead, dark ground bounce below
  hemi = new THREE.HemisphereLight(COLOR.hemiSky, COLOR.hemiGround, 0.45);
  hemi.position.set(0, 50, 0);
  SCENE.add(hemi);

  // directional "moonlight" with shadows. Positioned high and to one side for long, raking shadows.
  moon = new THREE.DirectionalLight(COLOR.moon, 0.55);
  moon.position.set(30, 60, 20);
  moon.castShadow = true;
  if (moon.shadow) {
    moon.shadow.mapSize.set(1024, 1024);
    const cam = moon.shadow.camera;
    // orthographic shadow frustum bounds ~±40 so the whole typical zone is covered
    cam.left = -40; cam.right = 40; cam.top = 40; cam.bottom = -40;
    cam.near = 1; cam.far = 200;
    cam.updateProjectionMatrix?.();
    moon.shadow.bias = -0.0008; // reduce shadow acne on the flat ground
  }
  SCENE.add(moon);
  // The directional light needs a target in the scene to aim at the origin.
  moon.target.position.set(0, 0, 0);
  SCENE.add(moon.target);
}

// ---------------------------------------------------------------------------------------------------
// buildZone — (re)build the per-zone scenery group `env`. Disposes the previous group's GPU
// resources first, then constructs ground + grid + perimeter walls + deterministic props + torches.
// `snap` may be null/partial; we fill sensible defaults so we always render SOMETHING.
// ---------------------------------------------------------------------------------------------------
function buildZone(snap) {
  if (!SCENE) return;
  disposeEnv(); // tear down the old zone's GPU resources and the torch/bobber registries

  // --- read the snap defensively ---
  const bound = clampNum(snap?.bound, 24, 4, 200); // half-extent; default 24 → 48x48 ground
  const zoneId = snap?.id ?? "(unknown)";
  const size = bound * 2;

  env = new THREE.Group();
  env.name = "ruinfold-env";
  env.userData.zoneId = zoneId;
  env.userData.bound = bound;

  buildGround(env, size);
  buildGrid(env, size);
  buildWalls(env, bound);
  buildProps(env, bound);
  buildTorches(env, bound);

  SCENE.add(env);
}

// ---------------------------------------------------------------------------------------------------
// ground — a flat plane sized to the zone with a PROCEDURAL flagstone texture drawn on a canvas.
// It receives shadows. The texture repeats; we wrap it and repeat per ~6 world-units of stone.
// ---------------------------------------------------------------------------------------------------
function buildGround(group, size) {
  const tex = makeFlagstoneTexture();
  // repeat roughly one tile's worth of pattern every ~12 units so flagstones read at a sane scale
  const reps = Math.max(1, Math.round(size / 12));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(reps, reps);

  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0, color: 0xffffff });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2; // lay it flat (plane defaults to facing +Z)
  ground.position.y = 0;
  ground.receiveShadow = true;
  ground.name = "ground";
  group.add(ground);
}

// Draw cracked dark flagstones / mossy granite onto a canvas → CanvasTexture. Deterministic: a tiny
// seeded PRNG so the stone pattern is stable run-to-run (no Math.random churn).
function makeFlagstoneTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const rnd = mulberry32(0x5eed); // fixed seed → identical texture every build

  // base dark granite
  g.fillStyle = "#22232a";
  g.fillRect(0, 0, S, S);

  // subtle granite speckle
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * S, y = rnd() * S;
    const v = 25 + Math.floor(rnd() * 40);
    g.fillStyle = `rgba(${v},${v},${v + 6},0.5)`;
    g.fillRect(x, y, 1, 1);
  }

  // flagstone grid: 4x4 cells with mortar gaps and per-stone tint variation
  const cells = 4;
  const cell = S / cells;
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const pad = 3 + rnd() * 2; // mortar gap
      const x = cx * cell + pad, y = cy * cell + pad;
      const w = cell - pad * 2, h = cell - pad * 2;
      const shade = 30 + Math.floor(rnd() * 22);
      g.fillStyle = `rgb(${shade},${shade + 1},${shade + 5})`;
      roundRect(g, x, y, w, h, 4);
      g.fill();
      // a cracked highlight edge on top-left for a chiselled look
      g.strokeStyle = "rgba(90,92,104,0.25)";
      g.lineWidth = 1;
      roundRect(g, x, y, w, h, 4);
      g.stroke();
    }
  }

  // cracks: a few thin dark fractures crossing the slab
  g.strokeStyle = "rgba(8,8,10,0.7)";
  g.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    let x = rnd() * S, y = rnd() * S;
    g.moveTo(x, y);
    const segs = 3 + Math.floor(rnd() * 4);
    for (let s = 0; s < segs; s++) {
      x += (rnd() - 0.5) * 70;
      y += (rnd() - 0.5) * 70;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // moss: greenish patches clustered in corners/edges for a damp, neglected feel
  for (let i = 0; i < 28; i++) {
    const x = rnd() * S, y = rnd() * S;
    const r = 4 + rnd() * 12;
    const a = 0.05 + rnd() * 0.12;
    g.fillStyle = `rgba(${40 + Math.floor(rnd() * 30)},${70 + Math.floor(rnd() * 40)},${30 + Math.floor(rnd() * 20)},${a})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------------------------------
// grid — a faint GridHelper for spatial readability. Grid lines don't receive shadow; they sit just
// above the ground to avoid z-fighting and are dimmed so they read as a hint, not a UI overlay.
// ---------------------------------------------------------------------------------------------------
function buildGrid(group, size) {
  const divisions = Math.max(4, Math.round(size / 2)); // ~one line every 2 units
  const grid = new THREE.GridHelper(size, divisions, COLOR.grid, COLOR.grid);
  grid.position.y = 0.02; // lift slightly off the ground plane
  if (grid.material) {
    // GridHelper material(s) may be an array; dim them all
    const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const m of mats) { m.transparent = true; m.opacity = 0.18; m.fog = true; }
  }
  grid.name = "grid";
  group.add(grid);
}

// ---------------------------------------------------------------------------------------------------
// walls — ruined low perimeter walls along all four edges. We split each edge into segments and vary
// each segment's height deterministically so the wall looks broken/weathered, not a clean box. Walls
// cast (and receive) shadows. A shared material keeps it cheap; per-segment geometry varies by size.
// ---------------------------------------------------------------------------------------------------
function buildWalls(group, bound) {
  const wallMat = new THREE.MeshStandardMaterial({ color: COLOR.wall, roughness: 1.0, metalness: 0.0 });
  group.userData.wallMat = wallMat; // remembered so disposeEnv frees it once

  const thickness = 1.2;
  const segLen = 6;                       // each wall segment is ~6 units long
  const perEdge = Math.max(2, Math.round((bound * 2) / segLen));
  const span = (bound * 2) / perEdge;     // actual segment length to tile the edge exactly

  // four edges: which axis runs along the wall, and the fixed offset on the other axis
  const edges = [
    { along: "x", fixed: -bound }, // south
    { along: "x", fixed: bound },  // north
    { along: "z", fixed: -bound }, // west
    { along: "z", fixed: bound },  // east
  ];

  let idx = 0;
  for (const edge of edges) {
    for (let i = 0; i < perEdge; i++, idx++) {
      // deterministic ruin: some segments are tall, some crumbled low, a few missing entirely
      const r = hash01(idx * 2654435761 >>> 0);
      if (r < 0.12) continue; // a gap in the wall (collapsed section)
      const height = 1.4 + r * 2.6; // 1.4 .. 4.0 units tall
      const center = -bound + span * (i + 0.5); // position along the edge

      const geo = edge.along === "x"
        ? new THREE.BoxGeometry(span * 0.96, height, thickness)
        : new THREE.BoxGeometry(thickness, height, span * 0.96);
      const m = new THREE.Mesh(geo, wallMat);
      if (edge.along === "x") m.position.set(center, height / 2, edge.fixed);
      else m.position.set(edge.fixed, height / 2, center);
      // slight deterministic lean for weathered look
      m.rotation.y = (hash01((idx * 40503) >>> 0) - 0.5) * 0.06;
      m.castShadow = true;
      m.receiveShadow = true;
      m.name = `wall-${idx}`;
      group.add(m);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
// props — broken pillars, rubble, and torch-posts. ALL positions are DETERMINISTIC (derived from the
// loop index, never Math.random) so the scenery is stable across rebuilds of the same zone. Pillars
// and posts ring the interior; rubble scatters between. All props cast shadows.
// (Torch POSTS are built here; their POINT LIGHTS + glow spheres are built in buildTorches, co-located.)
// ---------------------------------------------------------------------------------------------------
function buildProps(group, bound) {
  const pillarMat = new THREE.MeshStandardMaterial({ color: COLOR.pillar, roughness: 0.95, metalness: 0.0 });
  const rubbleMat = new THREE.MeshStandardMaterial({ color: COLOR.rubble, roughness: 1.0, metalness: 0.0 });
  group.userData.pillarMat = pillarMat;
  group.userData.rubbleMat = rubbleMat;

  // how far in from the wall the props sit, scaled to the zone size
  const ringR = Math.max(3, bound - 4);

  // --- broken pillars: ring of cylinders of varied (deterministic) height ---
  const pillarCount = 6;
  for (let i = 0; i < pillarCount; i++) {
    const a = (i / pillarCount) * Math.PI * 2; // even angular spacing
    const rr = ringR * (0.55 + 0.4 * hash01((i * 97 + 11) >>> 0)); // varied radius, still inside
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const h = 2 + hash01((i * 131 + 7) >>> 0) * 4; // 2 .. 6 units tall (broken to different heights)
    const geo = new THREE.CylinderGeometry(0.7, 0.85, h, 10);
    const m = new THREE.Mesh(geo, pillarMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = a; // face outward-ish; harmless cosmetic
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = `pillar-${i}`;
    group.add(m);

    // a broken capital chunk leaning at the base of some pillars
    if (hash01((i * 53 + 3) >>> 0) > 0.5) {
      const cgeo = new THREE.BoxGeometry(1.0, 0.6, 1.0);
      const chunk = new THREE.Mesh(cgeo, rubbleMat);
      chunk.position.set(x + 1.2, 0.3, z + 0.4);
      chunk.rotation.set(0.2, a, 0.15);
      chunk.castShadow = true; chunk.receiveShadow = true;
      chunk.name = `pillar-chunk-${i}`;
      group.add(chunk);
    }
  }

  // --- rubble: small boxes scattered deterministically across the interior ---
  const rubbleCount = 14;
  for (let i = 0; i < rubbleCount; i++) {
    // spiral-ish deterministic placement so debris spreads without clumping or randomness
    const a = i * 2.39996; // golden-angle increment → even, non-repeating spread
    const rr = (bound - 2) * Math.sqrt((i + 0.5) / rubbleCount);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const s = 0.4 + hash01((i * 193 + 17) >>> 0) * 0.7; // 0.4 .. 1.1
    const geo = new THREE.BoxGeometry(s, s * 0.7, s);
    const m = new THREE.Mesh(geo, rubbleMat);
    m.position.set(x, (s * 0.7) / 2, z);
    m.rotation.set(
      hash01((i * 11 + 1) >>> 0) * 0.5,
      hash01((i * 13 + 2) >>> 0) * Math.PI,
      hash01((i * 17 + 4) >>> 0) * 0.5,
    );
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = `rubble-${i}`;
    group.add(m);
  }
}

// ---------------------------------------------------------------------------------------------------
// torches — placed deterministically around the perimeter. Each torch is a thin cylinder POST plus a
// small glowing SPHERE at the top co-located with a warm POINT LIGHT that flickers in frame(). We
// register each torch in the module-scope `torches` list with a per-torch phase for the flicker.
// ---------------------------------------------------------------------------------------------------
function buildTorches(group, bound) {
  const postMat = new THREE.MeshStandardMaterial({ color: COLOR.post, roughness: 1.0, metalness: 0.0 });
  // emissive material for the flame glow sphere; basic so it ignores lighting and reads as a source
  group.userData.postMat = postMat;

  const count = 4;
  const r = Math.max(2.5, bound - 3); // sit just inside the walls
  const postH = 2.4;

  for (let i = 0; i < count; i++) {
    // place on a ring offset by a quarter so torches sit near the wall corners-ish, deterministically
    const a = (i / count) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    // post (thin cylinder)
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, postH, 6);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, postH / 2, z);
    post.castShadow = true;
    post.receiveShadow = true;
    post.name = `torch-post-${i}`;
    group.add(post);

    // glowing flame sphere at the top — its own emissive material so we can dispose it per-torch
    const glowMat = new THREE.MeshBasicMaterial({ color: COLOR.torch, fog: false });
    const glowGeo = new THREE.SphereGeometry(0.28, 10, 8);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, postH + 0.25, z);
    glow.name = `torch-glow-${i}`;
    group.add(glow);

    // the warm point light co-located with the flame
    const light = new THREE.PointLight(COLOR.torch, 1.4, 18, 2);
    light.position.set(x, postH + 0.25, z);
    // torches casting shadows is expensive; leave it to the moon. Keep torches as cheap fill light.
    light.castShadow = false;
    light.name = `torch-light-${i}`;
    group.add(light);

    torches.push({
      light,
      glow,
      glowMat,
      baseIntensity: 1.4,
      phase: i * 1.7, // distinct per-torch phase so they don't flicker in unison
    });
  }
}

// ---------------------------------------------------------------------------------------------------
// frame — cheap per-frame work: flicker the torches (sin + per-torch phase + a small secondary wobble)
// and gently bob any registered bobber props. Defensive: if nothing's built yet, do nothing.
// dt is seconds, now is ms (per the contract).
// ---------------------------------------------------------------------------------------------------
export function frame(dt, now) {
  const t = (now || 0) / 1000; // seconds

  // torch flicker: combine two sines at different rates for an organic, non-periodic-looking flame.
  for (let i = 0; i < torches.length; i++) {
    const to = torches[i];
    const base = to.baseIntensity;
    const flick =
      0.22 * Math.sin(t * 9.0 + to.phase) +
      0.12 * Math.sin(t * 17.0 + to.phase * 2.3);
    const intensity = Math.max(0.4, base + flick);
    if (to.light) to.light.intensity = intensity;
    // scale the glow sphere slightly with the flicker so the visible flame "breathes"
    if (to.glow) {
      const s = 0.9 + (intensity - base) * 0.6;
      to.glow.scale.setScalar(Math.max(0.6, s));
    }
  }

  // gentle prop bob (e.g. a floating mote / hovering relic if any are registered)
  for (let i = 0; i < bobbers.length; i++) {
    const b = bobbers[i];
    if (b.mesh) b.mesh.position.y = b.baseY + Math.sin(t * 1.5 + b.phase) * b.amp;
  }
}

// ---------------------------------------------------------------------------------------------------
// disposeEnv — free the CURRENT env group's GPU resources and remove it from the scene. We dispose
// every geometry, every material (and any maps on standard/basic materials), and clear the torch /
// bobber registries. Shared materials stashed in env.userData are disposed once here.
// ---------------------------------------------------------------------------------------------------
function disposeEnv() {
  // clear per-frame registries first so frame() never touches disposed objects
  torches = [];
  bobbers = [];

  if (!env) return;

  // dispose every geometry + material reachable from the group
  env.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === "function") obj.geometry.dispose();
    const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
    for (const m of mats) disposeMaterial(m);
  });

  // dispose the shared materials we stashed (traverse already disposed the meshes' references, but
  // these are shared across many meshes, so disposing once here is correct and idempotent).
  const ud = env.userData || {};
  for (const key of ["wallMat", "pillarMat", "rubbleMat", "postMat"]) {
    if (ud[key]) disposeMaterial(ud[key]);
  }

  if (SCENE) SCENE.remove(env);
  env = null;
}

// dispose a material and any textures it references (map/emissiveMap/etc.).
function disposeMaterial(m) {
  if (!m || typeof m.dispose !== "function") return;
  for (const key of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap"]) {
    const tex = m[key];
    if (tex && typeof tex.dispose === "function") tex.dispose();
  }
  m.dispose();
}

// ---------------------------------------------------------------------------------------------------
// teardown — optional cleanup of the persistent rig (sky/lights). Not part of the required contract,
// but handy and harmless: lets a host fully release this module's GPU resources if it ever unloads us.
// ---------------------------------------------------------------------------------------------------
export function dispose() {
  disposeEnv();
  if (skyMesh) {
    skyMesh.geometry?.dispose?.();
    disposeMaterial(skyMesh.material);
    SCENE?.remove(skyMesh);
    skyMesh = null;
  }
  if (skyTexture) { skyTexture.dispose?.(); skyTexture = null; }
  if (SCENE && SCENE.background === skyTexture) SCENE.background = null;
  for (const l of [ambient, hemi, moon]) if (l && SCENE) SCENE.remove(l);
  if (moon?.target && SCENE) SCENE.remove(moon.target);
  ambient = hemi = moon = null;
  if (SCENE) SCENE.fog = null;
  started = false;
}

// ---------------------------------------------------------------------------------------------------
// small helpers — deterministic randomness + canvas rounding. Kept at the bottom, pure, no THREE.
// ---------------------------------------------------------------------------------------------------

// mulberry32: a tiny deterministic PRNG. Seeded → identical sequence every run (no scenery churn).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// hash01: map an integer to a stable float in [0,1). Used for per-index deterministic variation.
function hash01(n) {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

// clampNum: read a possibly-missing number, fall back to `def`, then clamp into [lo, hi].
function clampNum(v, def, lo, hi) {
  const n = typeof v === "number" && isFinite(v) ? v : def;
  return Math.max(lo, Math.min(hi, n));
}

// roundRect: rounded-rectangle path on a 2D canvas context (not universally available as a method,
// so we draw it by hand). Caller then fills/strokes.
function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
