// shader — compile + link a GLSL program and cache its uniform/attribute locations. Raw WebGL2,
// no helpers from anywhere. Throws with the driver's log on failure so shader bugs are legible.

export function makeProgram(gl, vertSrc, fragSrc) {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("link failed: " + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  // cache every active uniform and attribute location
  const uniforms = {}, attribs = {};
  const nu = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const u = gl.getActiveUniform(program, i); uniforms[u.name] = gl.getUniformLocation(program, u.name); }
  const na = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(program, i); attribs[a.name] = gl.getAttribLocation(program, a.name); }

  return { program, uniforms, attribs, use: () => gl.useProgram(program) };
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error((type === gl.VERTEX_SHADER ? "vertex" : "fragment") + " compile failed: " + log);
  }
  return sh;
}
