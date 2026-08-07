// frame.mts — the RFC 6455 WebSocket wire representation.
//
// Semantic value: a frame (fin, opcode, payload, masked). Wire form:
// the framed bytes. The pair is a RETRACTION onto server framing:
// FrameDecoder ∘ encodeFrame = id (encodeFrame emits unmasked
// server-to-client frames), and the decoder additionally accepts the
// masked client-to-server form, unmasking on decode.

import crypto from "node:crypto";

const WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** Sec-WebSocket-Accept derivation: the handshake's key representation. */
export function acceptKey(clientKey: string): string {
  return crypto.createHash("sha1").update(clientKey + WS_MAGIC).digest("base64");
}

/** Encode one frame in server framing (unmasked). */
export function encodeFrame(opcode: number, data: Buffer = Buffer.alloc(0), fin = true): Buffer {
  const payload = data;
  const len = payload.length;
  const header = len < 126 ? 2 : len < 65536 ? 4 : 10;
  const frame = Buffer.allocUnsafe(header + len);
  frame[0] = (fin ? 0x80 : 0) | opcode;
  if (len < 126) {
    frame[1] = len;
  } else if (len < 65536) {
    frame[1] = 126;
    frame.writeUInt16BE(len, 2);
  } else {
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(len), 2);
  }
  payload.copy(frame, header);
  return frame;
}

export type WsFrame = {
  fin: boolean;
  opcode: number;
  payload: Buffer;
  masked: boolean;
  tooLarge?: boolean;
};

/** Incremental decoder: push bytes as they arrive, get complete frames back, unmasked. */
export class FrameDecoder {
  private buf: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private readonly opts: { maxPayload?: number };

  constructor(opts: { maxPayload?: number } = {}) {
    this.opts = opts;
  }

  push(chunk: Buffer): WsFrame[] {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    const frames: WsFrame[] = [];
    for (;;) {
      const frame = this.next();
      if (!frame) break;
      frames.push(frame);
      if (frame.tooLarge) break;
    }
    return frames;
  }

  private next(): WsFrame | null {
    const b = this.buf;
    if (b.length < 2) return null;
    const fin = (b[0]! & 0x80) !== 0;
    const opcode = b[0]! & 0x0f;
    const masked = (b[1]! & 0x80) !== 0;
    let payloadLen = b[1]! & 0x7f;
    let offset = 2;

    if (payloadLen === 126) {
      if (b.length < 4) return null;
      payloadLen = b.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      if (b.length < 10) return null;
      const big = b.readBigUInt64BE(2);
      const max = BigInt(this.opts.maxPayload ?? 100 * 1024 * 1024);
      if (big > max) return { fin, opcode, payload: Buffer.alloc(0), masked, tooLarge: true };
      payloadLen = Number(big);
      offset = 10;
    }

    if (payloadLen > (this.opts.maxPayload ?? 100 * 1024 * 1024)) {
      this.buf = Buffer.alloc(0);
      return { fin, opcode, payload: Buffer.alloc(0), masked, tooLarge: true };
    }

    const maskLen = masked ? 4 : 0;
    if (b.length < offset + maskLen + payloadLen) return null;
    const maskBytes = masked ? b.subarray(offset, offset + 4) : null;
    offset += maskLen;
    let payload = b.subarray(offset, offset + payloadLen);

    if (masked && maskBytes) {
      const out = Buffer.allocUnsafe(payloadLen);
      for (let i = 0; i < payload.length; i++) out[i] = (payload[i] ?? 0) ^ (maskBytes[i % 4] ?? 0);
      payload = out;
    }

    this.buf = b.subarray(offset + payloadLen);
    return { fin, opcode, payload, masked };
  }
}
