// fingerprint.mts — deterministic article fingerprints as SVG.
//
// The visible image is brutalist/cubist geometry; the byte lattice carries a
// stable article fact serialization for Koios codecs without putting readable
// JSON-LD inside the SVG.

import { createHash } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";

import type { KoiosPost } from "./content.mjs";
import { escapeHtml } from "./markdown.mjs";
import { referencesFromFrontMatter } from "./researching/sourcing/bibliography.mjs";
import type { KoiosItem, KoiosMasthead } from "./surface.mjs";

export type ArticleFingerprintFacts = Readonly<{
  kind: "koios.article-fingerprint";
  slug: string;
  url: string;
  headline: string;
  summary: string;
  datePublished?: string;
  author?: string;
  section?: string;
  keywords: readonly string[];
  tags: readonly string[];
  references: readonly string[];
  license?: string;
  licenseUrl?: string;
  syndicationRights?: string;
  seoTerm?: string;
  wordCount: number;
  bodySha256: string;
}>;

export type ArticleFingerprint = Readonly<{
  kind: "koios.article-fingerprint-carrier";
  facts: ArticleFingerprintFacts;
  serialization: string;
  sha256: string;
  encoding: Readonly<{
    serialization: "koios.stable-json.v1";
    digest: "sha256";
    visible: "koios.svg-byte-lattice.v1";
    metadata: "none";
  }>;
  jsonUrl: string;
  svgUrl: string;
}>;

const WIDTH = 1200;
const HEIGHT = 675;

type Rgb = readonly [number, number, number];
type Point = Readonly<{ x: number; y: number }>;

const CREAM: Rgb = [244, 241, 232];
const PAPER: Rgb = [236, 231, 216];
const INK: Rgb = [18, 18, 18];
const RED: Rgb = [209, 26, 26];
const TAUPE: Rgb = [122, 112, 102];
const BLUE: Rgb = [79, 109, 122];
const OCHRE: Rgb = [210, 178, 76];

function colorFor(hex: string): Rgb {
  switch (hex) {
    case "#f4f1e8": return CREAM;
    case "#ece7d8": return PAPER;
    case "#121212": return INK;
    case "#d11a1a": return RED;
    case "#7a7066": return TAUPE;
    case "#4f6d7a": return BLUE;
    case "#d2b24c": return OCHRE;
    default: return INK;
  }
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function koiosFrontMatter(post: KoiosPost): Readonly<Record<string, unknown>> {
  const value = post.document.frontMatter["koios"];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stable(item));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stable(record[key])]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function byteAt(bytes: Buffer, index: number): number {
  return bytes[index % bytes.length] ?? 0;
}

function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

export function articleFingerprintFacts(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): ArticleFingerprintFacts {
  const frontMatter = post.document.frontMatter;
  const koios = koiosFrontMatter(post);
  const license = maybeString(frontMatter["license"]);
  const licenseUrl = maybeString(frontMatter["license_url"]);
  const syndicationRights = maybeString(frontMatter["syndication_rights"]);
  const seoTerm = maybeString(koios["seo_term"]);
  const facts: ArticleFingerprintFacts = Object.freeze({
    kind: "koios.article-fingerprint" as const,
    slug: post.slug,
    url: item.url,
    headline: item.headline,
    summary: item.summary,
    ...(item.published === undefined ? {} : { datePublished: item.published }),
    ...(item.author === undefined ? { author: masthead.author.name } : { author: item.author }),
    ...(item.section === undefined ? {} : { section: item.section }),
    keywords: Object.freeze(item.keywords),
    tags: strings(frontMatter["tags"]),
    references: referencesFromFrontMatter(frontMatter).flatMap((reference) => reference.url === undefined ? [] : [reference.url]),
    ...(license === undefined ? {} : { license }),
    ...(licenseUrl === undefined ? {} : { licenseUrl }),
    ...(syndicationRights === undefined ? {} : { syndicationRights }),
    ...(seoTerm === undefined ? {} : { seoTerm }),
    wordCount: wordCount(post.document.body),
    bodySha256: sha256(post.document.body),
  });
  return facts;
}

function bars(bytes: Buffer): string {
  const cells = 64;
  const cell = WIDTH / cells;
  return Array.from({ length: cells }, (_, index) => {
    const value = byteAt(bytes, index);
    const h = 18 + (value % 86);
    const y = HEIGHT - h - 22;
    const fill = value % 3 === 0 ? "#d11a1a" : value % 3 === 1 ? "#121212" : "#7a7066";
    return `<rect x="${Math.round(index * cell)}" y="${y}" width="${Math.ceil(cell)}" height="${h}" fill="${fill}" opacity="0.86"/>`;
  }).join("\n");
}

function planes(bytes: Buffer): string {
  return Array.from({ length: 18 }, (_, index) => {
    const x = -90 + byteAt(bytes, index * 5) % 1180;
    const y = -35 + byteAt(bytes, index * 5 + 1) % 640;
    const w = 160 + byteAt(bytes, index * 5 + 2) % 360;
    const h = 120 + byteAt(bytes, index * 5 + 3) % 300;
    const skew = byteAt(bytes, index * 5 + 4) % 220 - 110;
    const fill = ["#f4f1e8", "#ece7d8", "#121212", "#d11a1a", "#4f6d7a", "#d2b24c"][byteAt(bytes, index * 7) % 6]!;
    const stroke = index % 2 === 0 ? "#121212" : "#d11a1a";
    const opacity = fill === "#121212" ? "0.74" : "0.66";
    const points = [
      `${x},${y}`,
      `${x + w},${y + Math.round(skew / 2)}`,
      `${x + w - skew},${y + h}`,
      `${x - skew},${y + h - Math.round(skew / 3)}`,
    ].join(" ");
    return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${4 + index % 5}" opacity="${opacity}"/>`;
  }).join("\n");
}

function glyph(hash: string): string {
  return hash.slice(0, 48).split("").map((char, index) => {
    const value = Number.parseInt(char, 16);
    const x = 76 + (index % 24) * 44;
    const y = 520 + Math.floor(index / 24) * 42;
    const size = 12 + value * 2;
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${value % 2 === 0 ? "#121212" : "#d11a1a"}"/>`;
  }).join("\n");
}

function bitAt(bytes: Buffer, index: number): number {
  return (byteAt(bytes, Math.floor(index / 8)) >> (7 - index % 8)) & 1;
}

function byteLattice(hash: string, serialization: string): string {
  const cols = 32;
  const rows = 8;
  const size = 10;
  const gap = 2;
  const x0 = 784;
  const y0 = 92;
  const carrier = Buffer.from(`${hash}\n${serialization}`, "utf8");
  const cells = Array.from({ length: cols * rows }, (_, index) => {
    const bit = bitAt(carrier, index);
    const x = x0 + (index % cols) * (size + gap);
    const y = y0 + Math.floor(index / cols) * (size + gap);
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bit === 1 ? "#121212" : "#f4f1e8"}" stroke="#121212" stroke-width="1"/>`;
  }).join("\n");
  return [
    `<g id="koios-byte-lattice">`,
    `<rect x="${x0 - 12}" y="${y0 - 12}" width="${cols * (size + gap) + 12}" height="${rows * (size + gap) + 12}" fill="#ece7d8" stroke="#121212" stroke-width="4"/>`,
    cells,
    `</g>`,
  ].join("\n");
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function blendPixel(pixels: Buffer, x: number, y: number, color: Rgb, alpha = 1): void {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const at = (y * WIDTH + x) * 3;
  pixels[at] = Math.round(pixels[at]! * (1 - alpha) + color[0] * alpha);
  pixels[at + 1] = Math.round(pixels[at + 1]! * (1 - alpha) + color[1] * alpha);
  pixels[at + 2] = Math.round(pixels[at + 2]! * (1 - alpha) + color[2] * alpha);
}

function paintRect(pixels: Buffer, x0: number, y0: number, w: number, h: number, color: Rgb, alpha = 1): void {
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(WIDTH, Math.ceil(x0 + w));
  const bottom = Math.min(HEIGHT, Math.ceil(y0 + h));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) blendPixel(pixels, x, y, color, alpha);
  }
}

function paintLine(pixels: Buffer, start: Point, end: Point, color: Rgb, width: number, alpha = 1): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const radius = Math.max(1, Math.floor(width / 2));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(start.x + dx * step / steps);
    const y = Math.round(start.y + dy * step / steps);
    paintRect(pixels, x - radius, y - radius, radius * 2, radius * 2, color, alpha);
  }
}

function insidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const crosses = (a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function paintPolygon(pixels: Buffer, polygon: readonly Point[], fill: Rgb, stroke: Rgb, strokeWidth: number, alpha: number): void {
  const left = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.x))));
  const right = Math.min(WIDTH - 1, Math.ceil(Math.max(...polygon.map((point) => point.x))));
  const top = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))));
  const bottom = Math.min(HEIGHT - 1, Math.ceil(Math.max(...polygon.map((point) => point.y))));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (insidePolygon({ x: x + 0.5, y: y + 0.5 }, polygon)) blendPixel(pixels, x, y, fill, alpha);
    }
  }
  for (let index = 0; index < polygon.length; index += 1) {
    paintLine(pixels, polygon[index]!, polygon[(index + 1) % polygon.length]!, stroke, strokeWidth);
  }
}

function paintCircleStroke(pixels: Buffer, cx: number, cy: number, radius: number, color: Rgb, width: number): void {
  const half = width / 2;
  const inner = Math.max(0, radius - half);
  const outer = radius + half;
  const left = Math.max(0, Math.floor(cx - outer));
  const right = Math.min(WIDTH - 1, Math.ceil(cx + outer));
  const top = Math.max(0, Math.floor(cy - outer));
  const bottom = Math.min(HEIGHT - 1, Math.ceil(cy + outer));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d >= inner && d <= outer) blendPixel(pixels, x, y, color);
    }
  }
}

function planePoints(bytes: Buffer, index: number): readonly Point[] {
  const x = -90 + byteAt(bytes, index * 5) % 1180;
  const y = -35 + byteAt(bytes, index * 5 + 1) % 640;
  const w = 160 + byteAt(bytes, index * 5 + 2) % 360;
  const h = 120 + byteAt(bytes, index * 5 + 3) % 300;
  const skew = byteAt(bytes, index * 5 + 4) % 220 - 110;
  return Object.freeze([
    { x, y },
    { x: x + w, y: y + Math.round(skew / 2) },
    { x: x + w - skew, y: y + h },
    { x: x - skew, y: y + h - Math.round(skew / 3) },
  ]);
}

function paintPlanes(pixels: Buffer, bytes: Buffer): void {
  const fills = ["#f4f1e8", "#ece7d8", "#121212", "#d11a1a", "#4f6d7a", "#d2b24c"] as const;
  for (let index = 0; index < 18; index += 1) {
    const fillHex = fills[byteAt(bytes, index * 7) % fills.length]!;
    const opacity = fillHex === "#121212" ? 0.74 : 0.66;
    paintPolygon(pixels, planePoints(bytes, index), colorFor(fillHex), index % 2 === 0 ? INK : RED, 4 + index % 5, opacity);
  }
}

function paintByteLattice(pixels: Buffer, hash: string, serialization: string): void {
  const cols = 32;
  const rows = 8;
  const size = 10;
  const gap = 2;
  const x0 = 784;
  const y0 = 92;
  const carrier = Buffer.from(`${hash}\n${serialization}`, "utf8");
  paintRect(pixels, x0 - 12, y0 - 12, cols * (size + gap) + 12, rows * (size + gap) + 12, PAPER);
  paintLine(pixels, { x: x0 - 12, y: y0 - 12 }, { x: x0 + cols * (size + gap), y: y0 - 12 }, INK, 4);
  paintLine(pixels, { x: x0 + cols * (size + gap), y: y0 - 12 }, { x: x0 + cols * (size + gap), y: y0 + rows * (size + gap) }, INK, 4);
  paintLine(pixels, { x: x0 + cols * (size + gap), y: y0 + rows * (size + gap) }, { x: x0 - 12, y: y0 + rows * (size + gap) }, INK, 4);
  paintLine(pixels, { x: x0 - 12, y: y0 + rows * (size + gap) }, { x: x0 - 12, y: y0 - 12 }, INK, 4);
  for (let index = 0; index < cols * rows; index += 1) {
    const x = x0 + (index % cols) * (size + gap);
    const y = y0 + Math.floor(index / cols) * (size + gap);
    paintRect(pixels, x, y, size, size, bitAt(carrier, index) === 1 ? INK : CREAM);
  }
}

function paintBars(pixels: Buffer, bytes: Buffer): void {
  const cells = 64;
  const cell = WIDTH / cells;
  for (let index = 0; index < cells; index += 1) {
    const value = byteAt(bytes, index);
    const h = 18 + (value % 86);
    const y = HEIGHT - h - 22;
    const color = value % 3 === 0 ? RED : value % 3 === 1 ? INK : TAUPE;
    paintRect(pixels, Math.round(index * cell), y, Math.ceil(cell), h, color, 0.86);
  }
}

function paintGlyph(pixels: Buffer, hash: string): void {
  for (const [index, char] of hash.slice(0, 48).split("").entries()) {
    const value = Number.parseInt(char, 16);
    const x = 76 + (index % 24) * 44;
    const y = 520 + Math.floor(index / 24) * 42;
    const size = 12 + value * 2;
    paintRect(pixels, x, y, size, size, value % 2 === 0 ? INK : RED);
  }
}

function encodePng(pixels: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const stride = WIDTH * 3;
  const raw = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function articleFingerprint(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): ArticleFingerprint {
  const facts = articleFingerprintFacts(post, item, masthead);
  const serialization = stableJson(facts);
  const hash = sha256(serialization);
  return Object.freeze({
    kind: "koios.article-fingerprint-carrier" as const,
    facts,
    serialization,
    sha256: hash,
    encoding: Object.freeze({
      serialization: "koios.stable-json.v1" as const,
      digest: "sha256" as const,
      visible: "koios.svg-byte-lattice.v1" as const,
      metadata: "none" as const,
    }),
    jsonUrl: `/fingerprints/${encodeURIComponent(item.slug)}.json`,
    svgUrl: `/fingerprints/${encodeURIComponent(item.slug)}.svg`,
  });
}

export function articleFingerprintJson(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): string {
  return `${stableJson(articleFingerprint(post, item, masthead))}\n`;
}

export function articleFingerprintSvg(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): string {
  const fingerprint = articleFingerprint(post, item, masthead);
  const { serialization, sha256: hash } = fingerprint;
  const bytes = Buffer.from(hash, "hex");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">`,
    `<title id="title">Koios article fingerprint</title>`,
    `<desc id="desc">Deterministic Koios.News geometric fingerprint.</desc>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#f4f1e8"/>`,
    `<path d="M60 62H1140M60 92H1140M60 583H1140M60 613H1140" stroke="#121212" stroke-width="8"/>`,
    planes(bytes),
    `<circle cx="${180 + byteAt(bytes, 4) % 840}" cy="${120 + byteAt(bytes, 7) % 340}" r="${42 + byteAt(bytes, 10) % 94}" fill="none" stroke="#d11a1a" stroke-width="12"/>`,
    `<path d="M${90 + byteAt(bytes, 12) % 200} ${120 + byteAt(bytes, 13) % 360} L${970 + byteAt(bytes, 14) % 120} ${150 + byteAt(bytes, 15) % 340}" stroke="#121212" stroke-width="18" opacity="0.82"/>`,
    byteLattice(hash, serialization),
    bars(bytes),
    glyph(hash),
    `</svg>`,
  ].join("\n");
}

export function articleFingerprintPng(post: KoiosPost, item: KoiosItem, masthead: KoiosMasthead): Buffer {
  const fingerprint = articleFingerprint(post, item, masthead);
  const { serialization, sha256: hash } = fingerprint;
  const bytes = Buffer.from(hash, "hex");
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);
  paintRect(pixels, 0, 0, WIDTH, HEIGHT, CREAM);
  paintRect(pixels, 60, 62, 1080, 8, INK);
  paintRect(pixels, 60, 92, 1080, 8, INK);
  paintRect(pixels, 60, 583, 1080, 8, INK);
  paintRect(pixels, 60, 613, 1080, 8, INK);
  paintPlanes(pixels, bytes);
  paintCircleStroke(pixels, 180 + byteAt(bytes, 4) % 840, 120 + byteAt(bytes, 7) % 340, 42 + byteAt(bytes, 10) % 94, RED, 12);
  paintLine(
    pixels,
    { x: 90 + byteAt(bytes, 12) % 200, y: 120 + byteAt(bytes, 13) % 360 },
    { x: 970 + byteAt(bytes, 14) % 120, y: 150 + byteAt(bytes, 15) % 340 },
    INK,
    18,
    0.82,
  );
  paintByteLattice(pixels, hash, serialization);
  paintBars(pixels, bytes);
  paintGlyph(pixels, hash);
  return encodePng(pixels);
}

export function articleFingerprintFigure(item: KoiosItem): string {
  return `<figure class="article-fingerprint">${articleFingerprintImage(item, "eager")}</figure>`;
}

export function articleFingerprintImage(item: KoiosItem, loading: "eager" | "lazy" = "lazy"): string {
  return [
    `<img src="/fingerprints/${escapeHtml(encodeURIComponent(item.slug))}.svg" alt="" width="${WIDTH}" height="${HEIGHT}" loading="${loading}">`,
  ].join("\n");
}
