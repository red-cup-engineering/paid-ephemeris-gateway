// media.mts — the event-stream media type.

/** The canonical response headers for serving an event stream. */
export function sseHeaders(): Record<string, string> {
  return {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  };
}

/** Whether a Content-Type names the event-stream representation. */
export function isEventStream(contentType: string): boolean {
  return contentType.split(";", 1)[0]?.trim().toLowerCase() === "text/event-stream";
}
