// media-type.mts — media-type knowledge that negotiation leans on: the
// file-extension table and compressibility classification.

const EXT_TYPES: Record<string, string> = {
  html: "text/html", htm: "text/html",
  css: "text/css",
  js: "text/javascript", mjs: "text/javascript",
  ts: "text/javascript",
  json: "application/json",
  jsonl: "application/jsonl",
  xml: "application/xml",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", avif: "image/avif",
  woff: "font/woff", woff2: "font/woff2",
  mp4: "video/mp4", webm: "video/webm",
  mp3: "audio/mpeg", ogg: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain", md: "text/markdown",
  wasm: "application/wasm",
  atom: "application/atom+xml",
  rss: "application/rss+xml",
  ttl: "text/turtle",
  nq: "application/n-quads",
  zip: "application/zip",
  gz: "application/gzip",
};

export function extensionType(path: string, table: Record<string, string> = EXT_TYPES): string {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return table[path.slice(dot + 1).toLowerCase()] ?? "application/octet-stream";
}

/** Whether a media type is worth compressing (text-shaped representations). */
export function isCompressible(type: string): boolean {
  const t = type.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    t.startsWith("text/") ||
    t.endsWith("+json") || t.endsWith("+xml") ||
    t === "application/json" || t === "application/jsonl" ||
    t === "application/xml" || t === "application/javascript" ||
    t === "text/javascript" || t === "image/svg+xml" ||
    t === "application/atom+xml" || t === "application/rss+xml" ||
    t === "text/turtle" || t === "application/n-quads" ||
    t === "application/wasm"
  );
}
