// view2d — a non-GPU fallback renderer: a top-down Canvas2D map of Aletheon, drawn with the SAME
// camera + entity inputs as the WebGL engine (so main.mjs can swap freely, and machines without
// WebGL2 still play). The view is player-centred and rotates so the avatar's facing points up; the
// shared palette keeps colours identical to the 3D path, and the bilattice charge shows as the
// glyph painted on every creature.

import { VIEW_RADIUS, KIND, WORLD } from "../shared/constants.mjs";
import { terrainHeight, ringRadius } from "../shared/worldgen.mjs";
import { entityColor, terrainColor, css } from "../shared/palette.mjs";

// [field] nearest-cell sample of the void-tension grid {dim, v} at a world point, in [0,1].
function sampleGrid(field, x, z) {
  if (!field) return 0;
  const h = WORLD.size / 2, dim = field.dim;
  const i = Math.max(0, Math.min(dim - 1, Math.floor(((x + h) / WORLD.size) * dim)));
  const j = Math.max(0, Math.min(dim - 1, Math.floor(((z + h) / WORLD.size) * dim)));
  return field.v[j * dim + i];
}

const CELL = 12; // px per sampled terrain cell (coarser = faster)

export function makeView2D(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable.");

  function resize() {
    const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return canvas.width / Math.max(1, canvas.height);
  }

  function render(cam, entities, meId, time, field) {
    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
    const me = entities.find((e) => e.id === meId) || { x: cam.target[0], z: cam.target[2] };
    const scale = Math.min(W, H) / (VIEW_RADIUS * 2.0); // world units → px
    const yaw = cam.yaw, cs = Math.cos(yaw), sn = Math.sin(yaw);

    // world rel → screen (rotate by -yaw so facing is up)
    const toScreen = (wx, wz) => {
      const rx = wx - me.x, rz = wz - me.z;
      return [cx + (rx * cs - rz * sn) * scale, cy + (rx * sn + rz * cs) * scale];
    };
    // screen → world (inverse), for terrain sampling
    const toWorld = (px, py) => {
      const sx = (px - cx) / scale, sz = (py - cy) / scale;
      return [me.x + sx * cs + sz * sn, me.z - sx * sn + sz * cs];
    };

    // --- terrain ------------------------------------------------------------------------------
    for (let py = 0; py < H; py += CELL) {
      for (let px = 0; px < W; px += CELL) {
        const [wx, wz] = toWorld(px + CELL / 2, py + CELL / 2);
        const y = terrainHeight(wx, wz);
        const yr = terrainHeight(wx + 1.5, wz), yu = terrainHeight(wx, wz + 1.5);
        const flat = 2 / Math.hypot(y - yr, 2, y - yu); // cheap flatness proxy
        ctx.fillStyle = css(terrainColor(wx, y, wz, flat));
        ctx.fillRect(px, py, CELL, CELL);
        // [field] overlay the void-tension as a violet heat wash
        const t = sampleGrid(field, wx, wz);
        if (t > 0.02) { ctx.fillStyle = `rgba(150,40,210,${Math.min(0.6, t * 0.7)})`; ctx.fillRect(px, py, CELL, CELL); }
      }
    }

    // --- void grade-rings (world-centred) -----------------------------------------------------
    ctx.lineWidth = 1.5;
    for (let g = 0; g <= 5; g++) {
      const [ox, oy] = toScreen(0, 0);
      ctx.beginPath();
      ctx.arc(ox, oy, ringRadius(g) * scale, 0, Math.PI * 2);
      ctx.strokeStyle = g >= 3 ? "rgba(196,92,255,0.28)" : "rgba(150,150,180,0.16)";
      ctx.stroke();
    }

    // --- entities -----------------------------------------------------------------------------
    for (const e of entities) {
      const [sx, sy] = toScreen(e.x, e.z);
      const isMe = e.id === meId;
      const r = (e.kind === KIND.critter ? 6 : e.kind === KIND.anomaly ? 11 : 9) * (isMe ? 1.2 : 1);
      const col = entityColor(e.kind, e.charge, isMe);
      // anomaly pulse
      const pulse = e.charge === "⊤" || e.kind === KIND.anomaly ? 0.6 + 0.4 * Math.sin(time * 6 + e.x) : 1;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = css(col, pulse); ctx.fill();
      if (isMe) { ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke(); }
      // facing tick (rotate the entity yaw into the rotated view)
      const fa = e.yaw - yaw;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx - Math.sin(fa) * r * 1.7, sy - Math.cos(fa) * r * 1.7);
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.5; ctx.stroke();
      // charge glyph
      ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.font = `${Math.round(r * 1.3)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(e.charge, sx, sy + 0.5);
      // hp arc for the living
      if (e.charge === "t" && e.maxHp) {
        const frac = Math.max(0, Math.min(1, e.hp / e.maxHp));
        ctx.beginPath(); ctx.arc(sx, sy, r + 3, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.strokeStyle = "rgba(210,120,80,0.9)"; ctx.lineWidth = 2; ctx.stroke();
      }
    }

    // --- fog-of-war vignette (the unexplored ⊥ beyond your knowing) ----------------------------
    const grad = ctx.createRadialGradient(cx, cy, VIEW_RADIUS * scale * 0.6, cx, cy, VIEW_RADIUS * scale * 1.05);
    grad.addColorStop(0, "rgba(7,8,13,0)");
    grad.addColorStop(1, "rgba(7,8,13,0.92)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // center crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.stroke();
  }

  return { resize, render, is2D: true };
}
