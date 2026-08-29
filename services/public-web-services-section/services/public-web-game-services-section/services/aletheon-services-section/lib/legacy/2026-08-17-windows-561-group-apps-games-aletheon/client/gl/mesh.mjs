// mesh — procedural geometry, built into VAOs (no assets, no loaders — the whole world is made of
// math). Every mesh is interleaved [px,py,pz, nx,ny,nz, r,g,b] (position, normal, vertex colour)
// so one vertex layout serves terrain and creatures alike. Returns { vao, count, mode }.

const STRIDE = 9 * 4; // 9 floats * 4 bytes

export function uploadMesh(gl, attribs, vertices, indices, mode) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices instanceof Float32Array ? vertices : new Float32Array(vertices), gl.STATIC_DRAW);

  bind(gl, attribs.aPosition, 3, 0);
  bind(gl, attribs.aNormal, 3, 3 * 4);
  bind(gl, attribs.aColor, 3, 6 * 4);

  let count;
  if (indices) {
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    count = indices.length;
    vao.indexed = true;
  } else {
    count = vertices.length / 9;
  }
  gl.bindVertexArray(null);
  return { vao, count, mode: mode ?? gl.TRIANGLES, indexed: !!indices };
}

function bind(gl, loc, size, offset) {
  if (loc === undefined || loc < 0) return;
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset);
}

// ---- builders --------------------------------------------------------------------------------

// capsule — a body axis-aligned along +Y (a cylinder capped by two hemispheres). Creatures and
// players are capsules tinted by kind/charge. radius r, total height h, white vertex colour.
export function capsuleVerts(r = 0.4, h = 1.8, seg = 12, rings = 6) {
  const cylH = Math.max(0.001, h - 2 * r);
  const verts = [], idx = [];
  const rows = [];
  // bottom hemisphere
  for (let i = 0; i <= rings; i++) {
    const phi = (Math.PI / 2) * (i / rings); // 0..pi/2
    const y = r - r * Math.cos(phi) ;        // from 0 up to r
    const rr = r * Math.sin(phi);
    rows.push(ring(verts, seg, rr, y, normHemi(0, -1)));
  }
  // cylinder (two rows sharing radius r)
  rows.push(ring(verts, seg, r, r, [1, 0, 0], true));
  rows.push(ring(verts, seg, r, r + cylH, [1, 0, 0], true));
  // top hemisphere
  for (let i = 0; i <= rings; i++) {
    const phi = (Math.PI / 2) * (i / rings);
    const y = r + cylH + r * Math.sin(phi);
    const rr = r * Math.cos(phi);
    rows.push(ring(verts, seg, rr, y, normHemi(0, 1)));
  }
  // stitch consecutive rows
  for (let a = 0; a < rows.length - 1; a++) {
    const r0 = rows[a], r1 = rows[a + 1];
    for (let s = 0; s < seg; s++) {
      const s1 = (s + 1) % seg;
      idx.push(r0[s], r1[s], r1[s1], r0[s], r1[s1], r0[s1]);
    }
  }
  return { verts: new Float32Array(verts), idx };

  function ring(buf, seg, rad, y, _n, cylinder = false) {
    const base = buf.length / 9;
    for (let s = 0; s < seg; s++) {
      const a = (2 * Math.PI * s) / seg;
      const nx = Math.cos(a), nz = Math.sin(a);
      const px = nx * rad, pz = nz * rad;
      // normal: cylinder → sideways; caps → blend toward the pole
      let n;
      if (cylinder) n = [nx, 0, nz];
      else { const ny = y < r ? -0.6 : 0.6; n = norm([nx * 0.7, ny, nz * 0.7]); }
      buf.push(px, y, pz, n[0], n[1], n[2], 1, 1, 1);
    }
    const ids = []; for (let s = 0; s < seg; s++) ids.push(base + s); return ids;
  }
}

// box — a unit cube centred at origin (used for landmarks / the ring-shrine markers).
export function boxVerts(sx = 1, sy = 1, sz = 1, color = [1, 1, 1]) {
  const v = [];
  const faces = [
    [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
    [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
  ];
  const idx = [];
  for (const [n, quad] of faces) {
    const base = v.length / 9;
    for (const [x, y, z] of quad) v.push(x * sx * 0.5, y * sy * 0.5, z * sz * 0.5, n[0], n[1], n[2], color[0], color[1], color[2]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { verts: new Float32Array(v), idx };
}

const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const normHemi = (_x, y) => [0, y, 0];
