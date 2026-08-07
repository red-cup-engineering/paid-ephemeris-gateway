// frame.mts — the text/event-stream representation.
//
// Semantic value: an event record (event name, data text, optional id
// and retry). Wire form: an SSE frame — "field: value" lines terminated
// by a blank line, comments opening with ":". The general pair is a
// RETRACTION: parseSseStream ∘ sseEventFrame = id on valid records,
// while the parse normalizes the wire form (field-name case, the
// optional space after the colon, ignored unknown fields and comments).

/** A decoded event: data is the joined text, as the EventSource algorithm leaves it. */
export type SseEvent = Readonly<{
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}>;

/** The general encoder: one event record to one frame. Multi-line data emits one data: line per line. */
export function sseEventFrame(event: SseEvent): string {
  let frame = "";
  if (event.id !== undefined) frame += `id: ${event.id}\n`;
  if (event.event !== undefined) frame += `event: ${event.event}\n`;
  if (event.retry !== undefined) frame += `retry: ${Math.floor(event.retry)}\n`;
  for (const line of event.data.split("\n")) frame += `data: ${line}\n`;
  return `${frame}\n`;
}

/** The house JSON encoder: a named event whose data line is JSON. */
export function sseFrame(name: string, data: unknown, id?: string): string {
  return `${id ? `id: ${id}\n` : ""}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** A comment frame. Parsers discard it; it exists to keep connections warm. */
export function sseCommentFrame(text = ""): string {
  return `:${text}\n\n`;
}

/** Decode a stream of frames into event records (comments and unknown fields dropped). */
export function parseSseStream(text: string): readonly SseEvent[] {
  const events: SseEvent[] = [];
  let eventName: string | undefined;
  let id: string | undefined;
  let retry: number | undefined;
  let dataLines: string[] = [];

  const dispatch = (): void => {
    if (dataLines.length === 0 && eventName === undefined && id === undefined && retry === undefined) return;
    events.push(Object.freeze({
      data: dataLines.join("\n"),
      ...(eventName !== undefined ? { event: eventName } : {}),
      ...(id !== undefined ? { id } : {}),
      ...(retry !== undefined ? { retry } : {}),
    }));
    eventName = undefined;
    id = undefined;
    retry = undefined;
    dataLines = [];
  };

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    if (rawLine === "") {
      dispatch();
      continue;
    }
    if (rawLine.startsWith(":")) continue;
    const colon = rawLine.indexOf(":");
    const field = colon === -1 ? rawLine : rawLine.slice(0, colon);
    let value = colon === -1 ? "" : rawLine.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    switch (field) {
      case "event":
        eventName = value;
        break;
      case "data":
        dataLines.push(value);
        break;
      case "id":
        if (!value.includes("\0")) id = value;
        break;
      case "retry": {
        if (/^\d+$/.test(value)) retry = Number(value);
        break;
      }
      default:
        break;
    }
  }
  dispatch();
  return Object.freeze(events);
}
