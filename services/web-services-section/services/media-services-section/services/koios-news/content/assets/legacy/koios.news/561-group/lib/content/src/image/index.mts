// Image container header codec: bytes (Uint8Array) → frozen header records
// for the four web image container formats — PNG, JPEG, GIF, WebP.
//
// Vocabulary: ImageHeader (the carrier: a frozen record naming the container
// format, the pixel dimensions read from the container's own header
// structures, and per-format extras the header offers cheaply). Morphisms:
// decodeImageHeader (bytes → header, sniffing the container by magic bytes)
// and the per-format decoders decodePngHeader, decodeJpegHeader,
// decodeGifHeader, decodeWebpHeader.
//
// Implemented faithfully from the published container specifications:
// - PNG: ISO/IEC 15948 — §5.2 (file signature), §11.2.2 (IHDR: width,
//   height, bit depth, colour type; big-endian).
// - JPEG: ITU-T T.81 / ISO 10918-1 — §B.1.1 (markers), §B.2.2 (frame
//   header SOFn: sample precision, lines, samples per line, component
//   count; big-endian). Segments are walked from SOI to the first SOFn.
// - GIF: GIF89a specification (CompuServe, 1990) — §17 (header,
//   "GIF87a"/"GIF89a"), §18 (logical screen descriptor; little-endian).
// - WebP: RIFF container spec (developers.google.com/speed/webp/docs/
//   riff_container) with 'VP8 ' keyframe dimensions per RFC 6386 §9.1,
//   'VP8L' 14-bit packed dimensions, and 'VP8X' 24-bit canvas size
//   (little-endian throughout).
//
// This codec reads container headers only: it never decompresses pixel
// data, never touches the filesystem or network, and carries zero runtime
// dependencies. Decoding is pure and total over its domain; the only
// failure mode is TypeError for malformed, truncated, or unrecognized
// byte shapes — exceptions are for malformed shapes only.

/**
 * The four web image container formats this codec recognizes: "png", "jpeg",
 * "gif", or "webp".
 */
export type ImageFormat = "png" | "jpeg" | "gif" | "webp";

/**
 * A frozen header record read from a PNG container's IHDR chunk: the pixel
 * dimensions plus the IHDR bit depth and colour type (ISO 15948 §11.2.2).
 */
export type PngHeader = Readonly<{
  format: "png";
  width: number;
  height: number;
  /** IHDR bit depth: bits per sample — 1, 2, 4, 8, or 16 (ISO 15948 §11.2.2). */
  bitDepth: number;
  /** IHDR colour type: 0, 2, 3, 4, or 6 (ISO 15948 §11.2.2). */
  colorType: number;
}>;

/**
 * A frozen header record read from a JPEG container's first SOFn frame header:
 * the pixel dimensions plus the sample precision, component count, and the SOFn
 * marker byte (T.81 §B.2.2).
 */
export type JpegHeader = Readonly<{
  format: "jpeg";
  width: number;
  height: number;
  /** Sample precision P from the SOFn frame header (T.81 §B.2.2). */
  precision: number;
  /** Component count Nf from the SOFn frame header (T.81 §B.2.2). */
  components: number;
  /** The SOFn marker byte the frame was read from (0xC0 baseline, 0xC2 progressive, …). */
  marker: number;
}>;

/**
 * A frozen header record read from a GIF container's header block and logical
 * screen descriptor: the logical screen dimensions plus the version, colour
 * resolution, and global colour table entry count (GIF89a §17-18).
 */
export type GifHeader = Readonly<{
  format: "gif";
  width: number;
  height: number;
  /** Container version from the header block: "87a" or "89a" (GIF89a §17). */
  version: "87a" | "89a";
  /** Colour resolution in bits, 1–8, from the logical screen descriptor (GIF89a §18). */
  colorResolution: number;
  /** Global colour table entry count: 0 when the descriptor declares no table. */
  globalColorTableEntries: number;
}>;

/**
 * The first RIFF chunk variant of a WebP container: "vp8" (lossy), "vp8l"
 * (lossless), or "vp8x" (extended canvas).
 */
export type WebpVariant = "vp8" | "vp8l" | "vp8x";

/**
 * A frozen header record read from a WebP container's first chunk: the pixel
 * dimensions plus the chunk variant the dimensions were read from.
 */
export type WebpHeader = Readonly<{
  format: "webp";
  width: number;
  height: number;
  /** First RIFF chunk variant: "vp8" (lossy), "vp8l" (lossless), "vp8x" (extended canvas). */
  variant: WebpVariant;
}>;

/**
 * The carrier produced by decoding any recognized container: a frozen header
 * record, one of PngHeader, JpegHeader, GifHeader, or WebpHeader, discriminated
 * by its format field.
 */
export type ImageHeader = PngHeader | JpegHeader | GifHeader | WebpHeader;

const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const);

/**
 * Sniffs the container by magic bytes and decodes its header.
 * Malformed, truncated, or unrecognized bytes throw TypeError.
 */
export function decodeImageHeader(bytes: Uint8Array): ImageHeader {
  requireBytes(bytes, "image");
  if (startsWith(bytes, PNG_SIGNATURE)) return decodePngHeader(bytes);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return decodeJpegHeader(bytes);
  if (startsWithAscii(bytes, "GIF8", 0)) return decodeGifHeader(bytes);
  if (startsWithAscii(bytes, "RIFF", 0) && startsWithAscii(bytes, "WEBP", 8)) {
    return decodeWebpHeader(bytes);
  }
  throw new TypeError("image header: bytes match no known container magic (png, jpeg, gif, webp)");
}

// — PNG: ISO/IEC 15948 §5.2 (signature), §11.2.2 (IHDR) —

/**
 * Decodes a PNG container's header from bytes: verifies the eight-byte
 * signature and IHDR chunk, then returns a PngHeader with the dimensions, bit
 * depth, and colour type. Malformed, truncated, or unlawful IHDR bytes throw
 * TypeError.
 */
export function decodePngHeader(bytes: Uint8Array): PngHeader {
  requireBytes(bytes, "png");
  if (!startsWith(bytes, PNG_SIGNATURE)) {
    throw new TypeError("png header: missing the eight-byte PNG signature (ISO 15948 §5.2)");
  }
  requireLength(bytes, 29, "png header: truncated before the end of IHDR");
  const ihdrLength = u32be(bytes, 8);
  if (ihdrLength !== 13) {
    throw new TypeError(`png header: IHDR data length must be 13, found ${ihdrLength}`);
  }
  if (!startsWithAscii(bytes, "IHDR", 12)) {
    throw new TypeError("png header: the first chunk must be IHDR (ISO 15948 §11.2.2)");
  }
  const width = u32be(bytes, 16);
  const height = u32be(bytes, 20);
  if (width < 1 || width > 0x7fffffff || height < 1 || height > 0x7fffffff) {
    throw new TypeError("png header: width and height must be in 1..2^31-1");
  }
  const bitDepth = at(bytes, 24);
  const colorType = at(bytes, 25);
  const allowed = PNG_ALLOWED_DEPTHS[colorType];
  if (allowed === undefined || !allowed.includes(bitDepth)) {
    throw new TypeError(
      `png header: colour type ${colorType} with bit depth ${bitDepth} is not a lawful IHDR combination`,
    );
  }
  return Object.freeze({ format: "png", width, height, bitDepth, colorType });
}

const PNG_ALLOWED_DEPTHS: Readonly<Record<number, readonly number[]>> = Object.freeze({
  0: Object.freeze([1, 2, 4, 8, 16]),
  2: Object.freeze([8, 16]),
  3: Object.freeze([1, 2, 4, 8]),
  4: Object.freeze([8, 16]),
  6: Object.freeze([8, 16]),
});

// — JPEG: ITU-T T.81 §B.1.1 (marker segments), §B.2.2 (SOFn frame header) —

/**
 * Decodes a JPEG container's header from bytes: walks marker segments from SOI
 * to the first SOFn frame header and returns a JpegHeader with the dimensions,
 * sample precision, component count, and SOFn marker. Malformed or truncated
 * bytes, or reaching EOI/SOS before a frame header, throw TypeError.
 */
export function decodeJpegHeader(bytes: Uint8Array): JpegHeader {
  requireBytes(bytes, "jpeg");
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new TypeError("jpeg header: bytes do not open with the SOI marker FFD8 (T.81 §B.2.1)");
  }
  let i = 2;
  for (;;) {
    if (i >= bytes.length) throw new TypeError("jpeg header: truncated before a frame header");
    if (at(bytes, i) !== 0xff) {
      throw new TypeError(`jpeg header: expected a marker at offset ${i}, found 0x${at(bytes, i).toString(16)}`);
    }
    while (i < bytes.length && bytes[i] === 0xff) i += 1; // fill bytes (T.81 §B.1.1.2)
    if (i >= bytes.length) throw new TypeError("jpeg header: truncated inside a marker");
    const marker = at(bytes, i);
    i += 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue; // TEM, RSTn: standalone
    if (marker === 0xd9) throw new TypeError("jpeg header: EOI reached before any SOFn frame header");
    if (marker === 0xda) throw new TypeError("jpeg header: SOS reached before any SOFn frame header");
    requireLength(bytes, i + 2, "jpeg header: truncated inside a segment length");
    const segmentLength = u16be(bytes, i);
    if (segmentLength < 2) throw new TypeError("jpeg header: segment length below the two length bytes");
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      requireLength(bytes, i + 8, "jpeg header: truncated inside the SOFn frame header");
      const precision = at(bytes, i + 2);
      const height = u16be(bytes, i + 3);
      const width = u16be(bytes, i + 5);
      const components = at(bytes, i + 7);
      if (segmentLength !== 8 + 3 * components) {
        throw new TypeError("jpeg header: SOFn length disagrees with its component count (T.81 §B.2.2)");
      }
      if (width < 1) throw new TypeError("jpeg header: samples per line must be at least 1");
      if (height < 1) {
        throw new TypeError("jpeg header: deferred height (Y = 0, DNL-defined) is not a decodable header shape");
      }
      if (components < 1) throw new TypeError("jpeg header: frame must carry at least one component");
      return Object.freeze({ format: "jpeg", width, height, precision, components, marker });
    }
    i += segmentLength;
  }
}

// — GIF: GIF89a specification §17 (header), §18 (logical screen descriptor) —

/**
 * Decodes a GIF container's header from bytes: reads the signature and logical
 * screen descriptor and returns a GifHeader with the dimensions, version,
 * colour resolution, and global colour table entry count. Malformed or
 * truncated bytes throw TypeError.
 */
export function decodeGifHeader(bytes: Uint8Array): GifHeader {
  requireBytes(bytes, "gif");
  requireLength(bytes, 13, "gif header: truncated before the end of the logical screen descriptor");
  if (!startsWithAscii(bytes, "GIF", 0)) {
    throw new TypeError("gif header: missing the GIF signature (GIF89a §17)");
  }
  const version = asciiAt(bytes, 3, 3);
  if (version !== "87a" && version !== "89a") {
    throw new TypeError(`gif header: version must be 87a or 89a, found ${JSON.stringify(version)}`);
  }
  const width = u16le(bytes, 6);
  const height = u16le(bytes, 8);
  if (width < 1 || height < 1) {
    throw new TypeError("gif header: logical screen width and height must be at least 1");
  }
  const packed = at(bytes, 10);
  const colorResolution = ((packed >> 4) & 0b111) + 1;
  const globalColorTableEntries = (packed & 0b1000_0000) === 0 ? 0 : 2 ** ((packed & 0b111) + 1);
  return Object.freeze({ format: "gif", width, height, version, colorResolution, globalColorTableEntries });
}

// — WebP: RIFF container; 'VP8 ' per RFC 6386 §9.1; 'VP8L'; 'VP8X' —

/**
 * Decodes a WebP container's header from bytes: verifies the RIFF/WEBP framing
 * and dispatches on the first chunk's fourCC (VP8 , VP8L, or VP8X) to return a
 * WebpHeader with the dimensions and variant. Malformed, truncated, or
 * unrecognized-chunk bytes throw TypeError.
 */
export function decodeWebpHeader(bytes: Uint8Array): WebpHeader {
  requireBytes(bytes, "webp");
  requireLength(bytes, 20, "webp header: truncated before the first chunk header");
  if (!startsWithAscii(bytes, "RIFF", 0) || !startsWithAscii(bytes, "WEBP", 8)) {
    throw new TypeError("webp header: bytes are not a RIFF container with the WEBP form type");
  }
  const fourCc = asciiAt(bytes, 12, 4);
  const chunkSize = u32le(bytes, 16);
  if (fourCc === "VP8 ") return decodeVp8Chunk(bytes, chunkSize);
  if (fourCc === "VP8L") return decodeVp8lChunk(bytes, chunkSize);
  if (fourCc === "VP8X") return decodeVp8xChunk(bytes, chunkSize);
  throw new TypeError(`webp header: first chunk ${JSON.stringify(fourCc)} is not VP8 , VP8L, or VP8X`);
}

function decodeVp8Chunk(bytes: Uint8Array, chunkSize: number): WebpHeader {
  if (chunkSize < 10) throw new TypeError("webp header: VP8 chunk too small for a keyframe header");
  requireLength(bytes, 30, "webp header: truncated inside the VP8 keyframe header");
  const frameTag = at(bytes, 20) | (at(bytes, 21) << 8) | (at(bytes, 22) << 16);
  if ((frameTag & 1) !== 0) {
    throw new TypeError("webp header: VP8 chunk opens with an interframe, which carries no dimensions (RFC 6386 §9.1)");
  }
  if (at(bytes, 23) !== 0x9d || at(bytes, 24) !== 0x01 || at(bytes, 25) !== 0x2a) {
    throw new TypeError("webp header: VP8 keyframe start code 9D012A is missing (RFC 6386 §9.1)");
  }
  const width = u16le(bytes, 26) & 0x3fff;
  const height = u16le(bytes, 28) & 0x3fff;
  if (width < 1 || height < 1) throw new TypeError("webp header: VP8 keyframe dimensions must be at least 1");
  return Object.freeze({ format: "webp", width, height, variant: "vp8" });
}

function decodeVp8lChunk(bytes: Uint8Array, chunkSize: number): WebpHeader {
  if (chunkSize < 5) throw new TypeError("webp header: VP8L chunk too small for its dimension header");
  requireLength(bytes, 25, "webp header: truncated inside the VP8L header");
  if (at(bytes, 20) !== 0x2f) {
    throw new TypeError("webp header: VP8L signature byte must be 0x2F");
  }
  const packed =
    (at(bytes, 21) | (at(bytes, 22) << 8) | (at(bytes, 23) << 16) | (at(bytes, 24) << 24)) >>> 0;
  const version = (packed >>> 29) & 0b111;
  if (version !== 0) throw new TypeError(`webp header: VP8L version bits must be 0, found ${version}`);
  const width = (packed & 0x3fff) + 1;
  const height = ((packed >>> 14) & 0x3fff) + 1;
  return Object.freeze({ format: "webp", width, height, variant: "vp8l" });
}

function decodeVp8xChunk(bytes: Uint8Array, chunkSize: number): WebpHeader {
  if (chunkSize < 10) throw new TypeError("webp header: VP8X chunk must carry 10 payload bytes");
  requireLength(bytes, 30, "webp header: truncated inside the VP8X header");
  const width = u24le(bytes, 24) + 1;
  const height = u24le(bytes, 27) + 1;
  return Object.freeze({ format: "webp", width, height, variant: "vp8x" });
}

// — byte readers (endianness per each container's specification) —

function requireBytes(bytes: unknown, format: string): asserts bytes is Uint8Array {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError(`${format} header: input must be a Uint8Array`);
  }
}

function requireLength(bytes: Uint8Array, length: number, message: string): void {
  if (bytes.length < length) throw new TypeError(message);
}

function at(bytes: Uint8Array, offset: number): number {
  const value = bytes[offset];
  if (value === undefined) throw new TypeError(`image header: truncated at offset ${offset}`);
  return value;
}

function u16be(bytes: Uint8Array, offset: number): number {
  return (at(bytes, offset) << 8) | at(bytes, offset + 1);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return ((at(bytes, offset) << 24) | (at(bytes, offset + 1) << 16) | (at(bytes, offset + 2) << 8) | at(bytes, offset + 3)) >>> 0;
}

function u16le(bytes: Uint8Array, offset: number): number {
  return at(bytes, offset) | (at(bytes, offset + 1) << 8);
}

function u24le(bytes: Uint8Array, offset: number): number {
  return at(bytes, offset) | (at(bytes, offset + 1) << 8) | (at(bytes, offset + 2) << 16);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (at(bytes, offset) | (at(bytes, offset + 1) << 8) | (at(bytes, offset + 2) << 16) | (at(bytes, offset + 3) << 24)) >>> 0;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i += 1) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

function startsWithAscii(bytes: Uint8Array, text: string, offset: number): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  requireLength(bytes, offset + length, `image header: truncated at offset ${offset}`);
  let text = "";
  for (let i = 0; i < length; i += 1) text += String.fromCharCode(at(bytes, offset + i));
  return text;
}
