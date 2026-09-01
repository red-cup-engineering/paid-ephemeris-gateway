/**
 * `daily` — one seed, all players, all day (DESIGN.md, "Daily deal").
 *
 * `dailySeed(date, variantId)` is a pure function of the UTC *calendar date* and the variant id:
 * `solitaire-daily:<variantId>:<YYYY-MM-DD>`. That composed string is a perfectly ordinary seed —
 * it is handed to `dealTable`/`cards.shuffledDeck` exactly like a player-typed or randomly
 * generated seed would be, and goes through the same `hashSeed` + mulberry32 pipeline there.
 * `dailySeed` itself does not hash anything; keeping the hashing in one place (`cards.mts`) means
 * "seed" is a single kind of value everywhere in this codebase, whether it came from a URL, a
 * `Math.random()` roll, or today's date.
 *
 * Only `Date.prototype.getUTC*` accessors are used, never local-timezone accessors — that is the
 * entire mechanism by which every player worldwide, regardless of their own clock's timezone
 * offset, resolves the same calendar date to the same seed at the same moment.
 */

/** `YYYY-MM-DD` for `date`'s UTC calendar day — timezone-independent by construction. */
export function utcDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `dailySeed(date, variantId)` per DESIGN.md's module map. `date` may be a `Date` (its UTC
 * calendar day is used) or an already-formatted `YYYY-MM-DD` string, so callers holding either a
 * live clock reading or a URL-supplied date param can call this the same way. */
export function dailySeed(date: Date | string, variantId: string): string {
  const day = typeof date === 'string' ? date : utcDateString(date);
  return `solitaire-daily:${variantId}:${day}`;
}
