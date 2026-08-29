// terminal-ascii — durante's TERMINAL FACE's pure core. Two small pure functions, no I/O, no
// node:tty, no PixelScreen — so both scripts/durante-terminal.mjs (the imperative CLI) and this module's
// own test (terminal-ascii.test.mts) exercise IDENTICAL logic:
//
//   frameToAscii(fb, cols, rows)   — downsample an abrash-rendered RGBA framebuffer to ASCII glyphs.
//                                    Ported pattern from the legacy 561-group archive's
//                                    apps/tools/abrash/scripts/abrash.mjs `frameToAscii` (a wall-color
//                                    heuristic: green-dominant => settled '#', yellow/red-dominant
//                                    (the contested-wall split-tint) => '%', mid-luminance => '.'
//                                    floor/fog, dark => ' ' sky). This is the graceful ASCII fallback
//                                    a plain terminal (no kitty, no sixel) always gets — every player
//                                    or agent shelling in over bare SSH can still see the level.
//
//   toDaleskeFramebuffer(fb, tile) — a pure data-copy adapter from abrash's headless Framebuffer (RGBA
//                                    Uint8ClampedArray, row-major — abrash's own framebuffer.mjs header
//                                    names this "the whole insight": that layout is byte-identical to
//                                    an ImageData raster) into a REAL @red-cup-engineering/daleske
//                                    Framebuffer — the shape daleske's PixelScreen.paint()/blit()
//                                    actually need (tileRect/tilePixels/diff; abrash's own Framebuffer
//                                    deliberately drops those — see its header). A plain byte copy, no
//                                    pixel math, so the kitty/sixel-rendered frame and the ASCII-
//                                    sampled frame read the exact same pixels.
//
// abrash conformed to daleske originally (not vice versa) — this module is where that conformance is
// re-established for durante: abrash's browser-target Framebuffer, wrapped just enough to satisfy
// daleske's own terminal-blit contract, defined here from daleske's OWN legacy source rather than
// from anything abrash-side.

import { Framebuffer as DaleskeFramebuffer } from "@red-cup-engineering/daleske/framebuffer";

// frameToAscii(fb, cols, rows) -> string — see module header. `fb` is any object exposing
// {width, height, getPixel(x,y) -> [r,g,b,a]} (abrash's Framebuffer, or a daleske one — both satisfy
// this reader).
export function frameToAscii(fb, cols = 56, rows = 22) {
  const sx = fb.width / cols, sy = fb.height / rows;
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const [R, G, B] = fb.getPixel(Math.floor(c * sx), Math.floor(r * sy));
      const lum = (R + G + B) / 3;
      if (G > R + 30 && G > B + 30 && lum > 70) line += "#";       // settled wall (green, t)
      else if (R > 150 && G > 130 && B < 110) line += "%";         // contested wall, affirm face (⊤)
      else if (R > 120 && G < 100 && B < 100) line += "%";         // contested wall, deny face (⊤)
      else if (lum > 45) line += ".";                               // floor / fog
      else line += " ";                                             // sky
    }
    lines.push(line);
  }
  return lines.join("\n");
}

// toDaleskeFramebuffer(fb, tile) -> daleske Framebuffer — see module header.
export function toDaleskeFramebuffer(fb, tile) {
  const out = new DaleskeFramebuffer(fb.width, fb.height, tile);
  out.data.set(fb.data);
  return out;
}
