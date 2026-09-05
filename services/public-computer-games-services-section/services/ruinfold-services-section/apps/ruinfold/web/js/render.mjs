// render.mjs — the canvas tile renderer (design §6.2): glyph + color, one cell per world position,
// the bilattice death-charge shown as an aura ring (risen ⊤ gold, cursed ⊤ violet), no movement
// tweens (a moved tile simply appears at its new cell next frame — "smooth-but-instant," not
// animated interpolation). Dirty-rect: every cell keeps a signature string of what it last drew;
// a cell is cleared+redrawn only when that signature changes, so a static dungeon room with one
// pacing monster repaints one cell a frame, not the whole grid.
//
// `phase` (the aura pulse clock) is advanced once per call to frame() by the CALLER's own
// requestAnimationFrame loop (app-play.mjs) — this file never reads Date.now()/performance.now()
// itself, and honors prefers-reduced-motion by freezing the pulse entirely when asked.

const TILE = 24; // px per world unit, rounded — v0 has no sub-tile interpolation by design

const GLYPH_COLOR = {
  goblin: "#5fbf5f",
  skeleton: "#c7c7ce",
  wraith: "#6fa8dc",
  "moon-stalker": "#8a4fd1",
  "keep-warden": "#e0b84a",
};
const RARITY_COLOR = { junk: "#8a8a8a", common: "#e8e8ec", uncommon: "#6fa8dc", rare: "#e0b84a" };
const PLAYER_COLOR = "#f5f5f0";
const AURA_GOLD = "#e0b84a";
const AURA_VIOLET = "#8a4fd1";
const FLOOR_A = "#0d1017";
const FLOOR_B = "#0f131b";

function cellKey(x, z) {
  return `${x},${z}`;
}

function auraSuffix(phase, reducedMotion) {
  // A coarse 8-step pulse bucket, not a raw frame count, so the dirty-rect signature only changes
  // ~8x/cycle instead of every single frame even while an aura is active.
  return reducedMotion ? "static" : String(Math.floor(phase / 6) % 8);
}

export class TileRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reducedMotion = Boolean(options.reducedMotion);
    this.prevCells = new Map();
    this.phase = 0;
  }

  setReducedMotion(v) {
    this.reducedMotion = Boolean(v);
  }

  // resize — match the canvas's backing store to its CSS box (device-pixel-ratio aware) and force
  // a full repaint next frame (an empty prevCells map makes every cell "dirty" once).
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.prevCells = new Map();
    }
  }

  clearAll() {
    this.ctx.fillStyle = FLOOR_A;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.prevCells = new Map();
  }

  // frame — project `model` (a projection.mjs RenderModel) onto the grid, camera centered on the
  // player, and dirty-diff against the previous frame's cell signatures.
  frame(model) {
    this.phase += 1;
    if (!model || !model.player) return;

    const dpr = window.devicePixelRatio || 1;
    const tile = TILE * dpr;
    const cols = Math.max(1, Math.floor(this.canvas.width / tile));
    const rows = Math.max(1, Math.floor(this.canvas.height / tile));
    const originX = Math.round(model.player.x) - Math.floor(cols / 2);
    const originZ = Math.round(model.player.z) - Math.floor(rows / 2);

    const cells = new Map();
    const place = (worldX, worldZ, sig, draw) => {
      const cx = Math.round(worldX) - originX;
      const cz = Math.round(worldZ) - originZ;
      if (cx < 0 || cz < 0 || cx >= cols || cz >= rows) return;
      cells.set(cellKey(cx, cz), { sig, draw });
    };

    for (const t of model.tiles) {
      if (t.kind === "item") {
        place(t.x, t.z, `item:${t.glyph}:${t.rarity}`, (ctx, px, py) => this._drawGlyph(ctx, px, py, tile, t.glyph, RARITY_COLOR[t.rarity] ?? RARITY_COLOR.junk));
      } else if (t.kind === "monster") {
        const sig = `mon:${t.glyph}:${t.risen ? "r" + auraSuffix(this.phase, this.reducedMotion) : "0"}`;
        place(t.x, t.z, sig, (ctx, px, py) => {
          if (t.risen) this._drawAura(ctx, px, py, tile, AURA_GOLD);
          this._drawGlyph(ctx, px, py, tile, t.glyph, GLYPH_COLOR[t.species] ?? "#d8d8d8");
        });
      }
    }

    const p = model.player;
    const pSig = `pc:${p.risen ? "r" + auraSuffix(this.phase, this.reducedMotion) : "0"}:${p.cursed ? "c" + auraSuffix(this.phase, this.reducedMotion) : "0"}`;
    place(p.x, p.z, pSig, (ctx, px, py) => {
      if (p.risen) this._drawAura(ctx, px, py, tile, AURA_GOLD, 1);
      if (p.cursed) this._drawAura(ctx, px, py, tile, AURA_VIOLET, p.risen ? 1.5 : 1);
      this._drawGlyph(ctx, px, py, tile, "@", PLAYER_COLOR);
    });

    const ctx = this.ctx;
    // Clear cells that were occupied last frame but are gone or changed this frame.
    for (const [key, prev] of this.prevCells) {
      const cur = cells.get(key);
      if (!cur || cur.sig !== prev.sig) this._clearCell(ctx, key, tile);
    }
    // Draw cells that are new or changed.
    for (const [key, cur] of cells) {
      const prev = this.prevCells.get(key);
      if (!prev || prev.sig !== cur.sig) {
        this._clearCell(ctx, key, tile);
        const [cx, cz] = key.split(",").map(Number);
        cur.draw(ctx, cx * tile, cz * tile);
      }
    }
    this.prevCells = cells;
  }

  _clearCell(ctx, key, tile) {
    const [cx, cz] = key.split(",").map(Number);
    const px = cx * tile;
    const py = cz * tile;
    ctx.fillStyle = (cx + cz) % 2 === 0 ? FLOOR_A : FLOOR_B;
    ctx.fillRect(px, py, tile, tile);
  }

  _drawGlyph(ctx, px, py, tile, glyph, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${Math.round(tile * 0.62)}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph, px + tile / 2, py + tile / 2 + 1);
    ctx.restore();
  }

  _drawAura(ctx, px, py, tile, color, extra = 0) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, tile * 0.06);
    ctx.beginPath();
    ctx.arc(px + tile / 2, py + tile / 2, tile * (0.42 + extra * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
