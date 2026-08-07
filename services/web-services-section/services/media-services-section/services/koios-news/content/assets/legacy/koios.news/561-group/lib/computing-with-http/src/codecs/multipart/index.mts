// @emsenn/web-codecs-multipart — codec for the multipart/form-data
// representation (RFC 7578). Parsing and serializing the delimited
// body; reading the body off a request, and the boundary off its
// Content-Type, is transport.

export { parseMultipartForm, serializeMultipartForm } from "./form-data.mjs";
export type { MultipartForm, MultipartPart, MultipartPartInit } from "./form-data.mjs";
