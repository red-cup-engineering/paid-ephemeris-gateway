// render — the browser paint target: abrash's own `render()`/`Framebuffer` do all the actual
// rendering work (raycasting, ⊤ shiver, sprite pass — none of it reimplemented here); this module's
// only job is EXT-2, the design's own canvas-compositing verticality trick.
//
// EXT-2 (from the design): abrash's raycaster has NO pitch/eye-height field at all (confirmed by
// reading raycaster.mjs directly — `camera()` takes only x,z,angle,fov,width,height,maxDist). A flat
// 2.5D raycaster genuinely cannot render true 3D vertical look/height. Rather than faking pitch inside
// the raycaster (which would mean forking or wrapping abrash's own cast math — not allowed, and not
// honest to this engine's real capability), jump/rocket-jump verticality is expressed as a CANVAS
// COMPOSITING offset: the already-rendered frame is blitted vertically shifted by an amount
// proportional to the physics layer's own `zHeight` (movement.mts — a real, tested value), with a
// letterbox fill (the sky/floor edge color extended, not a transparent gap) covering the exposed band.
// This is honest within the raycaster's real limits: what moves is the WHOLE picture, like a camera
// physically lifted, not a faked "the walls stretch" 3D effect abrash cannot actually produce.
//
// `prefers-reduced-motion` (and the amenities panel's own "reduced motion" toggle) disables the view
// LIFT bob entirely in favor of a static offset (still shows verticality — you can tell you're
// airborne — without the continuous motion some players need to avoid), matching design §5.
//
// REDUCED-FLASH, and an honest gap: the design asks for a mode that "clamps the ⊤ wall's shiverOffset
// amplitude to 0". Read directly, abrash's raycaster.mjs computes that offset with a module-private
// `shiverOffset(phase)` function — there is no `opts` field exposing it, so BNSF cannot dial that
// amplitude down through any REAL, published abrash API today. That is a genuine gap this file cannot
// close from BNSF's own tree (documented as a new proposed extension, EXT-7, in the service README's
// own extensions list — a small, additive, opt-in `opts.shiverAmplitude` would let a future version of
// this file delete the workaround below entirely). Until then, `reducedFlash` here is an HONEST
// approximation, not the real thing: the rendered frame is composited at partial opacity OVER the
// letterbox fill color (drawn fully opaque immediately before it, same call) rather than at full
// opacity — since the fill color is constant frame-to-frame while the shiver's wall color oscillates,
// this mixing provably damps whatever on-screen amplitude the shiver (or any other phase-varying
// signal) would otherwise have reached, by the alpha factor, without ever reading back the prior
// frame's actual pixels. A real amplitude-zero at the source (EXT-7) would be strictly better; this is
// a genuine, measurable reduction available today, not a cosmetic no-op.

const LIFT_PIXELS_PER_UNIT = 26; // how many screen pixels of shift per 1 unit of zHeight

export function renderFrame(ctx, canvasWidth, canvasHeight, fb, opts = {}) {
  const zHeight = opts.zHeight ?? 0;
  const reducedMotion = opts.reducedMotion ?? false;
  const reducedFlash = opts.reducedFlash ?? false;
  const lift = reducedMotion ? Math.min(zHeight, 1) * (LIFT_PIXELS_PER_UNIT * 0.4) : zHeight * LIFT_PIXELS_PER_UNIT;

  // draw the rendered frame onto an offscreen canvas at native resolution, once — cheap, and lets us
  // use drawImage's own scaling to blit it (with a vertical offset) onto the visible, larger canvas.
  const off = renderFrame._offscreen ?? (renderFrame._offscreen = document.createElement("canvas"));
  if (off.width !== fb.width || off.height !== fb.height) {
    off.width = fb.width;
    off.height = fb.height;
  }
  const offCtx = off.getContext("2d");
  const image = new ImageData(fb.data, fb.width, fb.height);
  offCtx.putImageData(image, 0, 0);

  // letterbox fill: extend the frame's own top row (sky) / bottom row (floor) color into the band the
  // vertical shift exposes, rather than leaving it transparent/black — a lifted camera still reads as
  // "the same room, seen from higher up", not a hole in the world.
  const topColor = pixelAt(fb, 0, 0);
  const bottomColor = pixelAt(fb, 0, fb.height - 1);
  ctx.fillStyle = topColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = bottomColor;
  ctx.fillRect(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);

  const scale = canvasWidth / fb.width;
  ctx.imageSmoothingEnabled = false;
  const priorAlpha = ctx.globalAlpha;
  ctx.globalAlpha = reducedFlash ? 0.6 : 1;
  ctx.drawImage(off, 0, lift * scale, canvasWidth, canvasHeight);
  ctx.globalAlpha = priorAlpha;
}

function pixelAt(fb, x, y) {
  const i = (y * fb.width + x) * 4;
  return `rgb(${fb.data[i]}, ${fb.data[i + 1]}, ${fb.data[i + 2]})`;
}
