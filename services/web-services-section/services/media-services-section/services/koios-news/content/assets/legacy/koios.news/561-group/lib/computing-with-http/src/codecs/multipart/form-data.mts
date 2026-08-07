// form-data.mts — the multipart/form-data representation (RFC 7578).
//
// Semantic value: a form — named parts, some bearing filenames and
// media types. Wire form: the delimited multipart body. The pair is a
// RETRACTION onto the parsed part shape: parseMultipartForm ∘
// serializeMultipartForm = id on parts (name, filename, contentType,
// data), while parsing forgets header order, casing, and any part
// headers the shape does not carry into serialization.

import { parseContentType, quoteHeaderValue, type ContentType } from "../http/index.mjs";

export type MultipartPart = Readonly<{
  name: string;
  filename?: string;
  contentType?: string;
  headers: Readonly<Record<string, string>>;
  data: Buffer;
  text(encoding?: BufferEncoding): string;
}>;

export type MultipartForm = Readonly<{
  fields: URLSearchParams;
  files: readonly MultipartPart[];
  parts: readonly MultipartPart[];
  get(name: string): string | null;
  getAll(name: string): string[];
  file(name: string): MultipartPart | undefined;
  filesFor(name: string): readonly MultipartPart[];
}>;

export function parseMultipartForm(body: Buffer | string, boundary: string): MultipartForm {
  if (!boundary || /[\r\n]/.test(boundary)) throw new TypeError("multipart boundary must be a non-empty token");
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, "binary");
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = new URLSearchParams();
  const files: MultipartPart[] = [];
  const parts: MultipartPart[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const start = buffer.indexOf(delimiter, offset);
    if (start < 0) break;
    let cursor = start + delimiter.length;
    if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("--"))) break;
    if (buffer.subarray(cursor, cursor + 2).equals(Buffer.from("\r\n"))) cursor += 2;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd < 0) break;

    const headers = parsePartHeaders(buffer.subarray(cursor, headerEnd).toString("latin1"));
    const next = buffer.indexOf(delimiter, headerEnd + 4);
    if (next < 0) break;
    const dataEnd = buffer.subarray(next - 2, next).equals(Buffer.from("\r\n")) ? next - 2 : next;
    const data = Buffer.from(buffer.subarray(headerEnd + 4, dataEnd));
    offset = next;

    const disposition = parseContentDisposition(headers["content-disposition"]);
    const name = disposition.params["name"];
    if (!name || disposition.type !== "form-data") continue;
    const part = multipartPart(name, data, headers, disposition.params["filename"]);
    parts.push(part);
    if (part.filename !== undefined) files.push(part);
    else fields.append(name, part.text());
  }

  return Object.freeze({
    fields,
    files: Object.freeze(files),
    parts: Object.freeze(parts),
    get: (name) => fields.get(name),
    getAll: (name) => fields.getAll(name),
    file: (name) => files.find((part) => part.name === name),
    filesFor: (name) => Object.freeze(files.filter((part) => part.name === name)),
  });
}

export type MultipartPartInit = Readonly<{
  name: string;
  data: Buffer | string;
  filename?: string;
  contentType?: string;
}>;

/** Encode form parts as a multipart/form-data body under the given boundary. */
export function serializeMultipartForm(parts: readonly MultipartPartInit[], boundary: string): Buffer {
  if (!boundary || /[\r\n]/.test(boundary)) throw new TypeError("multipart boundary must be a non-empty token");
  const chunks: Buffer[] = [];
  for (const part of parts) {
    const disposition = [
      `Content-Disposition: form-data; name=${quoteHeaderValue(part.name)}`,
      ...(part.filename !== undefined ? [`; filename=${quoteHeaderValue(part.filename)}`] : []),
    ].join("");
    const headers = [
      `--${boundary}`,
      disposition,
      ...(part.contentType !== undefined ? [`Content-Type: ${part.contentType}`] : []),
      "",
      "",
    ].join("\r\n");
    chunks.push(Buffer.from(headers, "utf8"));
    chunks.push(Buffer.isBuffer(part.data) ? part.data : Buffer.from(part.data, "utf8"));
    chunks.push(Buffer.from("\r\n", "utf8"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return Buffer.concat(chunks);
}

function parsePartHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split("\r\n")) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key) headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }
  return headers;
}

function parseContentDisposition(value: string | undefined): ContentType {
  return parseContentType(value) ?? Object.freeze({ type: "", params: Object.freeze({}) });
}

function multipartPart(name: string, data: Buffer, headers: Readonly<Record<string, string>>, filename?: string): MultipartPart {
  const contentType = parseContentType(headers["content-type"]);
  const part: {
    name: string;
    filename?: string;
    contentType?: string;
    headers: Readonly<Record<string, string>>;
    data: Buffer;
    text(encoding?: BufferEncoding): string;
  } = {
    name,
    headers: Object.freeze({ ...headers }),
    data,
    text(encoding = "utf8") {
      return data.toString(encoding);
    },
  };
  if (filename !== undefined) part.filename = filename;
  if (contentType?.type) part.contentType = contentType.type;
  return Object.freeze(part);
}
