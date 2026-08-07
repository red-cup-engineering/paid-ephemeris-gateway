// @emsenn/web-codecs-sse — codec for the text/event-stream representation.
//
// Event records encode to SSE frames (the general sseEventFrame, the
// house JSON sseFrame, and comment frames); parseSseStream decodes frame
// text back to records. The general pair is a retraction: parse ∘ encode
// = id on valid records, and the parse normalizes the wire form.
// Transport is not represented here: sinks, hubs, and heartbeats are the
// server's business, not the codec's.

export { parseSseStream, sseCommentFrame, sseEventFrame, sseFrame } from "./frame.mjs";
export type { SseEvent } from "./frame.mjs";

export { isEventStream, sseHeaders } from "./media.mjs";
