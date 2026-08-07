// HTTP content-coding computation: zstd (Node >=22.15), br, gzip, deflate.

import { PassThrough, type Transform } from "node:stream";
import * as zlib from "node:zlib";
import type { Coding } from "../negotiation/index.mjs";

type CompressionCoding = Exclude<Coding, "identity">;
type ZlibWithZstd = typeof zlib & {
  createZstdCompress?: () => Transform;
  createZstdDecompress?: () => Transform;
};

const zstd = zlib as ZlibWithZstd;
const BASE_CODINGS = ["br", "gzip", "deflate"] as const satisfies readonly CompressionCoding[];

export function zstdSupported(): boolean {
  return typeof zstd.createZstdCompress === "function" && typeof zstd.createZstdDecompress === "function";
}

export function supportedCompressionCodings(): readonly CompressionCoding[] {
  return zstdSupported() ? ["zstd", ...BASE_CODINGS] : BASE_CODINGS;
}

export async function compress(body: Buffer, coding: Coding): Promise<Buffer> {
  if (coding === "identity") return body;
  return new Promise((resolve, reject) => {
    const stream = compressStream(coding);
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    stream.end(body);
  });
}

export async function decompress(body: Buffer, coding: Coding | "identity"): Promise<Buffer> {
  if (coding === "identity") return body;
  return new Promise((resolve, reject) => {
    const stream = decompressStream(coding);
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    stream.end(body);
  });
}

export function compressStream(coding: Coding | "identity"): Transform {
  if (coding === "br") return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } });
  if (coding === "gzip") return zlib.createGzip({ level: 6 });
  if (coding === "deflate") return zlib.createDeflate({ level: 6 });
  if (coding === "zstd" && zstd.createZstdCompress) return zstd.createZstdCompress();
  return new PassThrough();
}

export function decompressStream(coding: Coding | "identity"): Transform {
  if (coding === "br") return zlib.createBrotliDecompress();
  if (coding === "gzip") return zlib.createGunzip();
  if (coding === "deflate") return zlib.createInflate();
  if (coding === "zstd" && zstd.createZstdDecompress) return zstd.createZstdDecompress();
  return new PassThrough();
}

export const CODINGS: readonly string[] = supportedCompressionCodings();
