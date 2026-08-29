// daily — the ONLY place a UTC date turns into a number, per ruinfold's own daily.mts framing (that
// file's header: "the only place a UTC date turns into a number"). Pure: takes a date STRING, never
// reads the clock itself. Everything downstream (daily-arena.mjs's generator, cartridge.mjs's
// createDailyEngine) is a pure function of the returned seed, replayable years later by anyone who
// knows the date string.
//
// Ported from apps/ruinfold/src/engine/daily.mts verbatim, with TWO changes, both disclosed:
//   1. The trace-namespace string is "durante-daily:" instead of "ruinfold-daily:" — so the two
//      games' seeds never collide even on the same calendar date (a shared seed across two unrelated
//      games would be a silent coincidence bug waiting to happen, not a feature).
//   2. ruinfold's version reads `createHash(...).digest().readUInt32BE(0)` — a raw-Buffer read only
//      Node's native `node:crypto` supports. durante's browser face imports its own pure modules
//      DIRECTLY (see server.mjs's `/src/<file>.mjs` route) and web/index.html's import map remaps the
//      bare specifier "node:crypto" to web/node-crypto-shim.mjs, a browser-safe SHA-256 that only
//      implements `createHash("sha256").update(str,"utf8").digest("hex")` (hex string, not a Buffer —
//      see that shim's own header). So this version reads the digest as HEX and parses its first 4
//      bytes (8 hex chars) as a big-endian uint32 — numerically byte-identical to `readUInt32BE(0)` on
//      the same digest's raw bytes, just computed through an encoding both the real node:crypto and the
//      shim actually support. This is the one deviation that makes dailySeed() run unmodified in both
//      Node (server-side seed derivation) and the browser (client-side arena reconstruction).

import { createHash } from "node:crypto";

// dailySeed — one deterministic 32-bit seed per calendar date, forever.
export function dailySeed(dateUTC /* "YYYY-MM-DD" */) {
  const hex = createHash("sha256").update(`durante-daily:${dateUTC}`, "utf8").digest("hex");
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

// hexSeed(n) — the wire/display form of a 32-bit seed, matching ruinfold's server.mts's own hexSeed().
export function hexSeed(n) {
  return "0x" + (n >>> 0).toString(16).padStart(8, "0");
}
