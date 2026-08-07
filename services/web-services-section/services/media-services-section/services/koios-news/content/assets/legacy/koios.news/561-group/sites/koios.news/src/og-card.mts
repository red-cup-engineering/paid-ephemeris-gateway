// og-card.mts — the social card (og:image) computed as a value: a 1200×675
// PNG built byte-by-byte (IHDR/IDAT/IEND over node:zlib), no image tooling.
// Design echoes the masthead: dark field, double rules, KOIOS.NEWS in the
// accent, set in a 5×7 blocky face defined right here.

import { crc32, deflateSync } from "node:zlib";

const WIDTH = 1200;
const HEIGHT = 675;

/** Theme colors as RGB triples. */
const FIELD: readonly [number, number, number] = [18, 18, 18]; // mill --ink
const ACCENT: readonly [number, number, number] = [209, 26, 26]; // mill --accent
const RULE: readonly [number, number, number] = [122, 112, 102];

/** 5×7 glyphs for the letters the masthead needs; rows top→bottom, 5 bits each. */
const GLYPHS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  I: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  ".": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
});

const TEXT = "KOIOS.NEWS";
const SCALE = 16; // glyph cell 80×112
const TRACKING = 2; // blank columns between glyphs, in glyph units

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function paintRect(pixels: Buffer, x0: number, y0: number, w: number, h: number, [r, g, b]: readonly [number, number, number]): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const at = (y * WIDTH + x) * 3;
      pixels[at] = r;
      pixels[at + 1] = g;
      pixels[at + 2] = b;
    }
  }
}

function paintText(pixels: Buffer, text: string, centerY: number): void {
  const advance = (5 + TRACKING) * SCALE;
  const textWidth = text.length * advance - TRACKING * SCALE;
  const x0 = Math.floor((WIDTH - textWidth) / 2);
  const y0 = centerY - Math.floor((7 * SCALE) / 2);
  for (let index = 0; index < text.length; index += 1) {
    const rows = GLYPHS[text[index]!];
    if (!rows) continue;
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if (((rows[row]! >> (4 - col)) & 1) === 1) {
          paintRect(pixels, x0 + index * advance + col * SCALE, y0 + row * SCALE, SCALE, SCALE, ACCENT);
        }
      }
    }
  }
}

/** The double rule from the masthead: two bars with a field-colored gap. */
function paintDoubleRule(pixels: Buffer, y: number): void {
  paintRect(pixels, 80, y, WIDTH - 160, 6, RULE);
  paintRect(pixels, 80, y + 14, WIDTH - 160, 6, RULE);
}

/** Compute the social-card PNG. Pure: same bytes every call. */
export function ogCardPng(): Buffer {
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  paintRect(pixels, 0, 0, WIDTH, HEIGHT, FIELD);
  paintDoubleRule(pixels, 90);
  paintDoubleRule(pixels, HEIGHT - 110);
  paintText(pixels, TEXT, Math.floor(HEIGHT / 2));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  // compression 0, filter 0, interlace 0 already zeroed

  const stride = WIDTH * 3;
  const raw = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    // filter byte 0 (None) then the scanline
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
