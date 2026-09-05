// terrain — bake the shared heightfield (shared/worldgen.terrainHeight) into one big mesh, with
// normals from finite differences and vertex colours by elevation + void-grade (grass in the
// Settled Reach, sand at the shore, bare rock on the heights, a violet tint creeping in as the
// grade — and the corruption — rises toward the rim). This is the exact ground the server walks on.

import { terrainHeight } from "../../shared/worldgen.mjs";
import { terrainColor } from "../../shared/palette.mjs";
import { WORLD } from "../../shared/constants.mjs";
import { uploadMesh } from "./mesh.mjs";

const CELL = 2; // world units per grid quad

export function buildTerrain(gl, attribs) {
  const half = WORLD.size / 2;
  const n = Math.floor(WORLD.size / CELL); // quads per side
  const dim = n + 1;
  const verts = new Float32Array(dim * dim * 9);
  let p = 0;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = -half + i * CELL, z = -half + j * CELL;
      const y = terrainHeight(x, z);
      // normal from central differences of the height field
      const hl = terrainHeight(x - 1, z), hr = terrainHeight(x + 1, z);
      const hd = terrainHeight(x, z - 1), hu = terrainHeight(x, z + 1);
      const nx = hl - hr, nz = hd - hu, ny = 2;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const c = terrainColor(x, y, z, ny / nl);
      verts[p++] = x; verts[p++] = y; verts[p++] = z;
      verts[p++] = nx / nl; verts[p++] = ny / nl; verts[p++] = nz / nl;
      verts[p++] = c[0]; verts[p++] = c[1]; verts[p++] = c[2];
    }
  }
  const idx = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * dim + i, b = a + 1, cI = a + dim, d = cI + 1;
      idx.push(a, cI, b, b, cI, d);
    }
  }
  return uploadMesh(gl, attribs, verts, idx, gl.TRIANGLES);
}
