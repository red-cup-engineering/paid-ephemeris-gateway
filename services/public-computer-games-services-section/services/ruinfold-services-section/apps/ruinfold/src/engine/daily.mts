// daily — the ONLY place a UTC date turns into a number (design §1.1). Pure: takes a date STRING,
// never reads the clock itself. `node:crypto` is Node stdlib, not an npm dependency — consistent
// with zero-external-deps. Everything downstream of the returned seed (dungeon.mts's generator,
// the whole engine) is a pure function, replayable years later by anyone who knows the date string.

import { createHash } from "node:crypto";

// dailySeed — one deterministic 32-bit seed per calendar date, forever.
export function dailySeed(dateUTC: string /* "YYYY-MM-DD" */): number {
  const digest = createHash("sha256").update(`ruinfold-daily:${dateUTC}`).digest();
  return digest.readUInt32BE(0);
}
