/**
 * Bounded JSON body reading for a Fetch-standard `Request`.
 *
 * `@red-cup-engineering/read-http-request-body-service` (pinned 0.1.1) only
 * reads Node `http.IncomingMessage` bodies -- it publishes no `/web` (or any
 * other Fetch `Request`-based) export as of 2026-09-08, even though this
 * gateway's application is Fetch-native (`createFetchHandler`, and the Node
 * server path is itself bridged to a Web `Request` upstream). This file is
 * the local, minimal complement that behavior actually requires; it should
 * be superseded by a shared package export if/when one is published,
 * recorded as a debt in README.md rather than silently worked around.
 */
export class BodyReadError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message);
    this.name = "BodyReadError";
    this.status = status;
  }
}

/**
 * Read and parse a JSON body from a Fetch `Request`, refusing a wrong
 * content-type (415), an oversized body (413), or malformed JSON (400).
 * @param {Request} request
 * @param {{maxBytes?: number}} [options]
 */
export async function readJsonBody(request, { maxBytes = Infinity } = {}) {
  const contentType = request.headers.get("content-type") ?? "";
  const mimeType = contentType.split(";")[0].trim().toLowerCase();
  if (mimeType !== "application/json") {
    throw new BodyReadError(`unsupported content-type: ${contentType || "(none)"}`, 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    throw new BodyReadError(`request body exceeds ${maxBytes} bytes`, 413);
  }
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new BodyReadError(`request body exceeds ${maxBytes} bytes`, 413);
  }
  const text = new TextDecoder("utf-8").decode(buffer);
  try {
    return JSON.parse(text);
  } catch {
    throw new BodyReadError("request body is not valid JSON", 400);
  }
}
