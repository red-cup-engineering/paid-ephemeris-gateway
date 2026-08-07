// @emsenn/web-codecs-ws — codec for the RFC 6455 WebSocket wire
// representation.
//
// Frame encoding (server framing, unmasked), an incremental decoder
// that also accepts and unmasks client framing, and the
// Sec-WebSocket-Accept key derivation. Upgrade negotiation, sessions,
// and proxying are the server's business, not the codec's.

export { acceptKey, encodeFrame, FrameDecoder } from "./frame.mjs";
export type { WsFrame } from "./frame.mjs";
