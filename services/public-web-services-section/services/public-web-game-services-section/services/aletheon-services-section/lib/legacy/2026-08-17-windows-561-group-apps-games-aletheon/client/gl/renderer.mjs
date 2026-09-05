// renderer — the WebGL2 engine, by hand. One lit shader (Lambert + ambient + height fog) serves
// terrain, sea, and every creature; creatures are capsules tinted by kind and by their bilattice
// charge — t alive in their own hue, f slain to grey corpses, ⊤ Anomalies shimmering violet (the
// world-truth made visible, the whole reason for the bilattice). No textures, no library: geometry
// is procedural (gl/mesh.mjs), shaders are inline GLSL.

import * as m4 from "../math/mat4.mjs";
import * as v3 from "../math/vec3.mjs";
import { WORLD, KIND } from "../../shared/constants.mjs";
import { gradePosition, terrainHeight } from "../../shared/worldgen.mjs";
import { entityColor, SKY } from "../../shared/palette.mjs";
import { makeProgram } from "./shader.mjs";
import { uploadMesh, capsuleVerts, boxVerts } from "./mesh.mjs";
import { buildTerrain } from "./terrain.mjs";

const LIGHT = v3.normalize(v3.create(), v3.create(-0.4, 0.9, 0.3));

const VERT = `#version 300 es
precision highp float;
in vec3 aPosition; in vec3 aNormal; in vec3 aColor;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel; uniform mat3 uNormalMat;
out vec3 vNormal; out vec3 vColor; out vec3 vWorld;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  vColor = aColor;
  gl_Position = uProj * uView * world;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNormal; in vec3 vColor; in vec3 vWorld;
uniform vec3 uLightDir; uniform vec3 uTint; uniform float uTime; uniform float uMode;
uniform vec3 uEye; uniform vec3 uSky;
out vec4 frag;
void main() {
  vec3 N = normalize(vNormal);
  float diff = max(dot(N, normalize(uLightDir)), 0.0);
  vec3 base = vColor * uTint;
  vec3 lit = base * (0.34 + 0.78 * diff);
  if (uMode > 1.5) { // anomaly: a contradiction the world holds — it shimmers
    float f = 0.5 + 0.5 * sin(uTime * 6.0 + vWorld.x * 0.6 + vWorld.z * 0.6 + vWorld.y * 2.2);
    lit += vec3(0.52, 0.16, 0.72) * (f * 0.9 + 0.2);
  } else if (uMode > 0.5) { // water sheen
    lit = mix(lit, vec3(0.12, 0.28, 0.42), 0.5) + 0.06 * sin(uTime + vWorld.x * 0.3);
  }
  float d = length(vWorld - uEye);
  float fog = clamp((d - 70.0) / 260.0, 0.0, 1.0);
  frag = vec4(mix(lit, uSky, fog), 1.0);
}`;

export function makeRenderer(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) throw new Error("WebGL2 is required to walk in Aletheon.");
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  const prog = makeProgram(gl, VERT, FRAG);
  const A = prog.attribs;
  const terrain = buildTerrain(gl, A);
  const sea = uploadMesh(gl, A, quadVerts(WORLD.size, WORLD.seaLevel, [0.15, 0.32, 0.46]), null, gl.TRIANGLES);
  const cap = (() => { const { verts, idx } = capsuleVerts(0.4, 1.8, 14, 6); return uploadMesh(gl, A, verts, idx, gl.TRIANGLES); })();
  const monolith = (() => { const { verts, idx } = boxVerts(1.1, 4.2, 1.1, [0.5, 0.35, 0.62]); return uploadMesh(gl, A, verts, idx, gl.TRIANGLES); })();

  const model = m4.create(), normalMat = new Float32Array(9), tmp = m4.create();

  function setModel(m, mode) {
    gl.uniformMatrix4fv(prog.uniforms.uModel, false, m);
    normalFrom(normalMat, m, tmp);
    gl.uniformMatrix3fv(prog.uniforms.uNormalMat, false, normalMat);
    gl.uniform1f(prog.uniforms.uMode, mode);
  }
  function setTint(c) { gl.uniform3f(prog.uniforms.uTint, c[0], c[1], c[2]); }

  function resize() {
    const w = canvas.clientWidth | 0, h = canvas.clientHeight | 0;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return canvas.width / canvas.height;
  }

  function render(cam, entities, meId, time) {
    gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    prog.use();
    gl.uniformMatrix4fv(prog.uniforms.uProj, false, cam.proj);
    gl.uniformMatrix4fv(prog.uniforms.uView, false, cam.view);
    gl.uniform3f(prog.uniforms.uLightDir, LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform3f(prog.uniforms.uEye, cam.eye[0], cam.eye[1], cam.eye[2]);
    gl.uniform3f(prog.uniforms.uSky, SKY[0], SKY[1], SKY[2]);
    gl.uniform1f(prog.uniforms.uTime, time);

    // ground
    m4.identity(model); setModel(model, 0); setTint([1, 1, 1]); draw(gl, terrain);
    // sea
    setModel(model, 1); setTint([1, 1, 1]); gl.disable(gl.CULL_FACE); draw(gl, sea); gl.enable(gl.CULL_FACE);

    // grade-ring monoliths (wayfinding: the void-manifold made visible)
    setTint([1, 1, 1]);
    for (let g = 1; g <= 4; g++) {
      const p = gradePosition(g, 0, 1);
      m4.compose(model, [p.x, terrainHeight(p.x, p.z) + 2.1, p.z], 0, 1);
      setModel(model, g >= 3 ? 2 : 0);
      draw(gl, monolith);
    }

    // creatures
    for (const e of entities) {
      const look = tintFor(e, e.id === meId);
      const height = HEIGHT[e.kind] ?? 1.4;
      const sy = height / 1.8;
      let y = e.y;
      if (e.charge === "f") { // a corpse: laid low and greyed
        m4.compose(model, [e.x, y + 0.1, e.z], e.yaw, 1.1, 0.35, 1.1);
      } else {
        m4.compose(model, [e.x, y, e.z], e.yaw, 1, sy, 1);
      }
      setTint(look.tint);
      setModel(model, look.mode);
      draw(gl, cap);
    }
  }

  return { gl, resize, render };
}

const HEIGHT = { player: 1.85, critter: 1.0, brigand: 1.8, anomaly: 2.1 };

function tintFor(e, isMe) {
  const tint = entityColor(e.kind, e.charge, isMe);
  const mode = (e.charge === "⊤" || e.kind === KIND.anomaly) ? 2 : 0; // 2 → the anomaly shimmer
  return { tint, mode };
}

function draw(gl, mesh) {
  gl.bindVertexArray(mesh.vao);
  if (mesh.indexed) gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_INT, 0);
  else gl.drawArrays(mesh.mode, 0, mesh.count);
}

// normalFrom — mat3 normal matrix = upper-left of inverse-transpose(model). Correct under the
// non-uniform capsule scale; falls back to the model's 3x3 if the matrix is singular.
function normalFrom(out9, m, tmp) {
  m4.invert(tmp, m);
  m4.transpose(tmp, tmp);
  out9[0] = tmp[0]; out9[1] = tmp[1]; out9[2] = tmp[2];
  out9[3] = tmp[4]; out9[4] = tmp[5]; out9[5] = tmp[6];
  out9[6] = tmp[8]; out9[7] = tmp[9]; out9[8] = tmp[10];
}

// quadVerts — one flat, double-wide quad at height y (the sea), interleaved p/n/c.
function quadVerts(size, y, c) {
  const h = size / 2, n = [0, 1, 0];
  const corners = [[-h, y, -h], [-h, y, h], [h, y, h], [h, y, h], [h, y, -h], [-h, y, -h]];
  const out = [];
  for (const [x, yy, z] of corners) out.push(x, yy, z, n[0], n[1], n[2], c[0], c[1], c[2]);
  return new Float32Array(out);
}
