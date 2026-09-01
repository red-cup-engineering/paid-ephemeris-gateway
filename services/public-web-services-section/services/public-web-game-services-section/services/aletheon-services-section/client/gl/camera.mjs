// camera — a third-person orbit that trails the player. The camera OWNS the yaw the player faces:
// main.mjs reads camera.yaw and ships it as the input intent, so the avatar turns with the look.
// Mouse moves yaw/pitch; wheel dollies. Builds the view + projection the renderer binds each frame.

import * as m4 from "../math/mat4.mjs";
import * as v3 from "../math/vec3.mjs";

export function makeCamera() {
  return {
    target: v3.create(0, 1.5, 0), // smoothed look-at point (player head)
    yaw: 0, // radians; 0 looks toward -z
    pitch: 0.35, // radians above horizontal
    distance: 7.5,
    view: m4.create(),
    proj: m4.create(),
    eye: v3.create(),
  };
}

export function cameraMouse(cam, dx, dy) {
  cam.yaw += dx * 0.0032;
  cam.pitch = clamp(cam.pitch - dy * 0.0028, -0.2, 1.25);
}
export function cameraZoom(cam, dz) {
  cam.distance = clamp(cam.distance + dz * 0.01, 3, 18);
}

// follow — ease the look-at point toward the player's head, then rebuild eye + matrices.
export function cameraFollow(cam, px, py, pz, aspect, dt) {
  const head = py + 1.5;
  const k = 1 - Math.pow(0.0001, dt); // frame-rate independent smoothing
  cam.target[0] += (px - cam.target[0]) * k;
  cam.target[1] += (head - cam.target[1]) * k;
  cam.target[2] += (pz - cam.target[2]) * k;

  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  // place the eye BEHIND the look direction (the avatar faces -z when yaw 0; camera sits at +z)
  cam.eye[0] = cam.target[0] + cam.distance * cp * sy;
  cam.eye[1] = cam.target[1] + cam.distance * sp;
  cam.eye[2] = cam.target[2] + cam.distance * cp * cy;

  m4.perspective(cam.proj, 1.05, aspect, 0.1, 600);
  m4.lookAt(cam.view, cam.eye, cam.target, v3.create(0, 1, 0));
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
