/**
 * `daily` — one seed, all players, all day (ANATOMY digest, solitaire-service's `daily.mts`
 * pattern, copied in shape).
 *
 * `dailySeed(date)` is a pure function of the UTC *calendar date*:
 * `crucible-daily:<YYYY-MM-DD>`. That composed string is handed to `tangle.mts`'s
 * `spawnTangle` exactly like a player-typed or randomly generated seed would be, and goes
 * through the same `hashSeed` + mulberry32 pipeline there. `dailySeed` itself does not hash
 * anything — keeping the hashing in one place (`seed.mts`) means "seed" is a single kind of
 * value everywhere, whether it came from a URL, a test, or today's date.
 *
 * Only `Date.prototype.getUTC*` accessors are used, never local-timezone accessors — that is
 * the entire mechanism by which every player worldwide, regardless of their own clock's
 * timezone offset, resolves the same calendar date to the same seed at the same moment. The
 * clock (`Date`) is always a value the caller passes in, never read from inside this module —
 * house doctrine forbids `Date.now()` in domain logic, so every call site that needs "today"
 * is the one place that reads the real clock.
 */

/** `YYYY-MM-DD` for `date`'s UTC calendar day — timezone-independent by construction. */
export function utcDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `dailySeed(date)` — `date` may be a `Date` (its UTC calendar day is used) or an
 * already-formatted `YYYY-MM-DD` string, so callers holding either a live clock reading or a
 * URL-supplied date param can call this the same way. */
export function dailySeed(date: Date | string): string {
  const day = typeof date === 'string' ? date : utcDateString(date);
  return `crucible-daily:${day}`;
}
