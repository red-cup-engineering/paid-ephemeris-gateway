// encoding — the (de)serialization boundary for wire messages. JSON today; isolated here so a
// later binary packing is a one-file change. Pure, browser-safe. `encode` returns a string and
// `decode` parses one, returning null on garbage rather than throwing into the socket loop.

export const encode = (msg) => JSON.stringify(msg);

export function decode(text) {
  try {
    const m = JSON.parse(text);
    return m && typeof m === "object" && typeof m.k === "string" ? m : null;
  } catch {
    return null;
  }
}
