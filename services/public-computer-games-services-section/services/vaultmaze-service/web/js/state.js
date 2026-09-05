/**
 * `state` — Lantern's localStorage save. Versioned schema (DESIGN.md §6/face-spec item 5):
 * `schemaVersion` gates a `migrate()` chain so a future format change never silently loses a
 * save. Everything the compiled world already bakes (card front/back text, room/door/hall
 * structure, kata paths) is NOT duplicated here — this store holds only per-player *review
 * history*: per-card SRS state, per-kata SRS state + recent ratios, and the streak/freeze
 * ledger. Re-deriving "is this room lit" from that history plus the static world is exactly
 * what `js/engine/lightcone.js` does on every read; nothing about light state is stored.
 */

const STORAGE_PREFIX = 'lantern';
export const SCHEMA_VERSION = 1;
export const DAY_MS = 86_400_000;

/** Epoch day used everywhere `now` is needed — an integer day count, matching the engine's own
 * "caller's choice of epoch" contract (see `src/srs.mts`). Never called from inside engine
 * logic itself, only from the app's read/write boundary. */
export function today() {
  return Math.floor(Date.now() / DAY_MS);
}

function storageKey(wingId) {
  return `${STORAGE_PREFIX}:${wingId}`;
}

function emptyState(wingId) {
  return {
    schemaVersion: SCHEMA_VERSION,
    wingId,
    cards: {}, // cardId -> { stability, difficulty, lastReviewedAt }
    kata: {}, // kataId -> { stability, difficulty, lastRunAt, recentRatios: number[] }
    kataTimes: {}, // cardId -> number[] (most recent CORRECT kata response times, ms, capped)
    streak: { current: 0, longest: 0, lastActiveDay: null, freezeTokens: 0, freezesUsed: 0 },
    walkPosition: null, // roomId the daily walk last stopped on, used to resume a stroll
    reducedMotion: null, // null = follow system, true/false = explicit override
  };
}

/** Migration chain: each step takes the previous version's shape and returns the next. Add a
 * new `case N` here (never mutate an existing one) whenever `SCHEMA_VERSION` increments. */
function migrate(raw) {
  let state = raw;
  if (typeof state.schemaVersion !== 'number') {
    // Pre-versioned or corrupt: cannot trust shape, start clean rather than guess.
    return emptyState(state.wingId ?? 'unknown');
  }
  // No migrations needed yet (schema v1 is the only version). Future:
  // if (state.schemaVersion === 1) { state = { ...state, schemaVersion: 2, ...}; }
  return state;
}

export function loadState(wingId) {
  const key = storageKey(wingId);
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return emptyState(wingId); // localStorage unavailable (private mode, quota) — degrade to session-only
  }
  if (!raw) return emptyState(wingId);
  try {
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return emptyState(wingId); // corrupt save — never throw the app into a broken state
  }
}

export function saveState(state) {
  const key = storageKey(state.wingId);
  try {
    localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false; // quota exceeded or unavailable — caller decides whether to warn the player
  }
}

/** Card state as the engine wants it: local override if reviewed at least once, else the
 * compiled baseline (stability/difficulty at their as-compiled defaults, `lastReviewedAt`
 * absent — i.e. "never reviewed", exactly what `lightcone.js` expects). */
export function effectiveCardState(state, baseCard) {
  const local = state.cards[baseCard.id];
  if (local) return local;
  return { stability: baseCard.stability, difficulty: baseCard.difficulty, lastReviewedAt: undefined };
}

/** All cards from the compiled world, with local review history layered on top. */
export function effectiveCards(state, baseCards) {
  return baseCards.map((c) => ({ ...c, ...effectiveCardState(state, c) }));
}

export function recordCardReview(state, cardId, nextSrsState) {
  return { ...state, cards: { ...state.cards, [cardId]: nextSrsState } };
}

export function effectiveKataState(state, kataId) {
  return state.kata[kataId] ?? { stability: 0, difficulty: 5, lastRunAt: undefined, recentRatios: [] };
}

export function recordKataRun(state, kataId, nextSrsState, ratio) {
  const prior = effectiveKataState(state, kataId);
  const recentRatios = [...prior.recentRatios, ratio].slice(-3);
  return {
    ...state,
    kata: { ...state.kata, [kataId]: { ...nextSrsState, recentRatios } },
  };
}

// --- kata timing: rolling median correct-response time, per card, DESIGN.md §5 ------------

const DEFAULT_TFAST_MS = 8000;
const KATA_TIME_HISTORY_CAP = 5;

export function getTFast(state, cardId) {
  const history = state.kataTimes[cardId];
  if (!history || history.length === 0) return DEFAULT_TFAST_MS;
  const sorted = [...history].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Only correct outcomes (good/easy) feed the rolling median — a wrong/hard answer's timing
 * says nothing about how fast the player recalls it correctly. */
export function recordKataTime(state, cardId, responseTimeMs, outcome) {
  if (outcome !== 'good' && outcome !== 'easy') return state;
  const prior = state.kataTimes[cardId] ?? [];
  const next = [...prior, responseTimeMs].slice(-KATA_TIME_HISTORY_CAP);
  return { ...state, kataTimes: { ...state.kataTimes, [cardId]: next } };
}

// --- streak + freeze tokens (DESIGN.md §6) ------------------------------------------------

const FREEZE_MILESTONE_DAYS = 7;
const MAX_FREEZE_TOKENS = 3;

/** Call once per completed review action for the day. Idempotent within a day (calling it
 * twice on the same `day` does not double-count). Auto-consumes a banked freeze token on
 * exactly one missed day; two or more missed days break the streak even with tokens banked
 * (a freeze covers a single skipped day, not an extended absence). */
export function touchStreak(streak, day) {
  if (streak.lastActiveDay === day) return streak; // already recorded today
  if (streak.lastActiveDay === null) {
    return { ...streak, current: 1, longest: Math.max(streak.longest, 1), lastActiveDay: day };
  }
  const gap = day - streak.lastActiveDay;
  let current;
  let freezeTokens = streak.freezeTokens;
  let freezesUsed = streak.freezesUsed;
  if (gap === 1) {
    current = streak.current + 1;
  } else if (gap === 2 && freezeTokens > 0) {
    current = streak.current + 1;
    freezeTokens -= 1;
    freezesUsed += 1;
  } else {
    current = 1; // streak broken, restart
  }
  if (current > 0 && current % FREEZE_MILESTONE_DAYS === 0) {
    freezeTokens = Math.min(MAX_FREEZE_TOKENS, freezeTokens + 1);
  }
  return {
    ...streak,
    current,
    longest: Math.max(streak.longest, current),
    lastActiveDay: day,
    freezeTokens,
    freezesUsed,
  };
}

/** Whether today's streak has already lapsed (no freeze available) as of `day`, purely for
 * display — does not mutate anything; the actual break is applied lazily by `touchStreak` the
 * next time the player reviews. */
export function streakAtRisk(streak, day) {
  if (streak.lastActiveDay === null) return false;
  const gap = day - streak.lastActiveDay;
  return gap >= 1;
}

// --- export / import (face-spec item 5) ----------------------------------------------------

export function exportStateJson(state) {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(text) {
  const parsed = JSON.parse(text);
  return migrate(parsed);
}
