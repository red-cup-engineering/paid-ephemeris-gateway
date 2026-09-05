// vec3 — three-dimensional vectors, rederived from scratch (the repo carries no math library and
// no Three.js; we honor that). Plain Float32Array(3) so the same code runs in the browser GL path
// and under node for the tests. Functional, no hidden state.

export const create = (x = 0, y = 0, z = 0) => Float32Array.of(x, y, z);
export const set = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };
export const copy = (a) => Float32Array.of(a[0], a[1], a[2]);

export const add = (o, a, b) => set(o, a[0] + b[0], a[1] + b[1], a[2] + b[2]);
export const sub = (o, a, b) => set(o, a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const scale = (o, a, s) => set(o, a[0] * s, a[1] * s, a[2] * s);
export const addScaled = (o, a, b, s) => set(o, a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s);
export const negate = (o, a) => set(o, -a[0], -a[1], -a[2]);

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (o, a, b) =>
  set(o, a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);

export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function normalize(o, a) {
  const len = length(a);
  return len > 1e-8 ? scale(o, a, 1 / len) : set(o, 0, 0, 0);
}

export const lerp = (o, a, b, t) =>
  set(o, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

// transformMat4 — apply a 4x4 (column-major) to a point (w = 1), with perspective divide.
export function transformMat4(o, a, m) {
  const x = a[0], y = a[1], z = a[2];
  let w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1;
  return set(o,
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w);
}
