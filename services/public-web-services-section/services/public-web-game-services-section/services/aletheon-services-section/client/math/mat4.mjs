// mat4 — 4x4 matrices in COLUMN-MAJOR order (the layout WebGL's uniformMatrix4fv wants), rederived
// from scratch. Index map (column m, row r) → element [m*4 + r]:
//   [ 0  4  8 12 ]
//   [ 1  5  9 13 ]
//   [ 2  6 10 14 ]
//   [ 3  7 11 15 ]
// Plain Float32Array(16); functions write into an output matrix `o` and return it.

export const create = () => identity(new Float32Array(16));

export function identity(o) {
  o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
}

// multiply — o = a · b (apply b first, then a, when transforming a column vector a·b·v).
export function multiply(o, a, b) {
  const r = o === a || o === b ? new Float32Array(16) : o;
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
    r[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    r[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    r[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    r[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  if (r !== o) o.set(r);
  return o;
}

// perspective — a right-handed projection, looking down -z, with a finite far plane.
export function perspective(o, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  o.fill(0);
  o[0] = f / aspect;
  o[5] = f;
  o[10] = (far + near) / (near - far);
  o[11] = -1;
  o[14] = (2 * far * near) / (near - far);
  return o;
}

// lookAt — a right-handed view matrix placing the eye, looking at center, with up.
export function lookAt(o, eye, center, up) {
  const zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let zl = Math.hypot(zx, zy, zz) || 1;
  const fz = [zx / zl, zy / zl, zz / zl]; // forward (toward eye)
  // x = normalize(up × z)
  let xx = up[1] * fz[2] - up[2] * fz[1];
  let xy = up[2] * fz[0] - up[0] * fz[2];
  let xz = up[0] * fz[1] - up[1] * fz[0];
  const xl = Math.hypot(xx, xy, xz) || 1;
  xx /= xl; xy /= xl; xz /= xl;
  // y = z × x
  const yx = fz[1] * xz - fz[2] * xy;
  const yy = fz[2] * xx - fz[0] * xz;
  const yz = fz[0] * xy - fz[1] * xx;
  o[0] = xx; o[4] = xy; o[8] = xz; o[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  o[1] = yx; o[5] = yy; o[9] = yz; o[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  o[2] = fz[0]; o[6] = fz[1]; o[10] = fz[2]; o[14] = -(fz[0] * eye[0] + fz[1] * eye[1] + fz[2] * eye[2]);
  o[3] = 0; o[7] = 0; o[11] = 0; o[15] = 1;
  return o;
}

export function translate(o, x, y, z) {
  identity(o); o[12] = x; o[13] = y; o[14] = z; return o;
}
export function scaling(o, x, y, z) {
  o.fill(0); o[0] = x; o[5] = y; o[10] = z; o[15] = 1; return o;
}
export function rotationY(o, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  identity(o); o[0] = c; o[2] = -s; o[8] = s; o[10] = c; return o;
}
export function rotationX(o, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  identity(o); o[5] = c; o[6] = s; o[9] = -s; o[10] = c; return o;
}

// compose — model matrix from translation, a Y rotation (yaw), and a uniform/﻿per-axis scale.
export function compose(o, pos, yaw, sx, sy = sx, sz = sx) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  o[0] = c * sx; o[1] = 0; o[2] = -s * sx; o[3] = 0;
  o[4] = 0; o[5] = sy; o[6] = 0; o[7] = 0;
  o[8] = s * sz; o[9] = 0; o[10] = c * sz; o[11] = 0;
  o[12] = pos[0]; o[13] = pos[1]; o[14] = pos[2]; o[15] = 1;
  return o;
}

// invert — full 4x4 inverse (used for the normal matrix and ray picking). Returns o unchanged on
// a singular matrix.
export function invert(o, m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
  const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
  const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];
  const a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return o;
  det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}

export function transpose(o, m) {
  if (o === m) {
    const t = m.slice();
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c * 4 + r] = t[r * 4 + c];
  } else {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c * 4 + r] = m[r * 4 + c];
  }
  return o;
}
