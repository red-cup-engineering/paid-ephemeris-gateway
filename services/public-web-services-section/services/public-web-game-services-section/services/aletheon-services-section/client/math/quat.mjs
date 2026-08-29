// quat — unit quaternions for smooth rotation, rederived from scratch. Stored [x, y, z, w].
// Aletheon uses these for entity facing (slerping yaw so corpses/anomalies turn smoothly) and to
// prove the math layer holds together (math.test). Column-major mat4 output matches mat4.mjs.

export const create = () => Float32Array.of(0, 0, 0, 1); // identity
export const set = (o, x, y, z, w) => { o[0] = x; o[1] = y; o[2] = z; o[3] = w; return o; };

// fromAxisAngle — unit axis [x,y,z], angle in radians.
export function fromAxisAngle(o, axis, rad) {
  const h = rad * 0.5, s = Math.sin(h);
  return set(o, axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(h));
}

// fromYaw — rotation about +Y (the common case: an entity's heading).
export const fromYaw = (o, rad) => fromAxisAngle(o, [0, 1, 0], rad);

// multiply — o = a · b (apply b, then a).
export function multiply(o, a, b) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  return set(o,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz);
}

export function normalize(o, a) {
  const l = Math.hypot(a[0], a[1], a[2], a[3]) || 1;
  return set(o, a[0] / l, a[1] / l, a[2] / l, a[3] / l);
}

// slerp — shortest-arc interpolation, t in [0,1]. Falls back to nlerp for nearly-parallel quats.
export function slerp(o, a, b, t) {
  let bx = b[0], by = b[1], bz = b[2], bw = b[3];
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; } // shortest path
  let sa, sb;
  if (1 - cos > 1e-6) {
    const omega = Math.acos(cos), sin = Math.sin(omega);
    sa = Math.sin((1 - t) * omega) / sin;
    sb = Math.sin(t * omega) / sin;
  } else { sa = 1 - t; sb = t; } // linear for tiny angles
  return set(o, a[0] * sa + bx * sb, a[1] * sa + by * sb, a[2] * sa + bz * sb, a[3] * sa + bw * sb);
}

// toMat4 — write the rotation into a column-major 4x4 (o must be length 16).
export function toMat4(o, q) {
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  o[0] = 1 - (yy + zz); o[1] = xy + wz; o[2] = xz - wy; o[3] = 0;
  o[4] = xy - wz; o[5] = 1 - (xx + zz); o[6] = yz + wx; o[7] = 0;
  o[8] = xz + wy; o[9] = yz - wx; o[10] = 1 - (xx + yy); o[11] = 0;
  o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
  return o;
}
