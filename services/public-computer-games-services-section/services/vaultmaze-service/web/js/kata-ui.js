/**
 * `kata-ui` — pure helpers for kata mode (DESIGN.md §5, face-spec item 4): "pick a lit path,
 * timed sequence recall, belt result." The timed-flashcard *interaction* itself reuses the
 * same review-modal component as gate/daily-walk (`app.js`) — the four grade buttons
 * (Again/Hard/Good/Easy) double as `KataOutcome` (`again`/`hard`/`good`/`easy`, the exact same
 * four strings), so nothing here reimplements a second grading UI. This module only decides
 * *which* card represents each room in the path, and folds a finished run's results into a
 * ratio/belt via `engine/kata.js`.
 */
import { recallProbability } from './engine/srs.js';
import { kataRatio, beltForRatio, awardedBelt, ratioToGrade } from './engine/kata.js';

/** For each room in a kata's path, pick the card that best represents "what's next due there"
 * — the one with the lowest current `R(t)` (ties broken by card id for determinism). A room
 * with no cards at all (shouldn't happen for a compiled wing, but degenerate-input-safe) is
 * skipped rather than crashing the run. */
export function pickKataCards(path, cardsByRoom, now) {
  const picked = [];
  for (const roomId of path) {
    const cards = cardsByRoom.get(roomId) ?? [];
    if (cards.length === 0) continue;
    let best = null;
    let bestR = Infinity;
    for (const c of [...cards].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const t = c.lastReviewedAt === undefined ? Infinity : Math.max(0, now - c.lastReviewedAt);
      const S = c.stability || 0.01;
      const R = c.lastReviewedAt === undefined ? 0 : recallProbability(t, S);
      if (R < bestR) {
        bestR = R;
        best = c;
      }
    }
    if (best) picked.push({ roomId, card: best });
  }
  return picked;
}

/** A kata is offered as runnable when every room on its path is currently reached (in the
 * light cone) — DESIGN.md's "pick a lit path." Halls smaller than 2 rooms never produce a
 * kata (see `build-layout.mts`), so this only needs the reachability check. */
export function kataIsAvailable(path, reachable) {
  return path.length >= 2 && path.every((roomId) => reachable.has(roomId));
}

/** Fold a finished run's per-card results into the numbers the UI + SRS update need. */
export function summarizeKataRun(results) {
  const ratio = kataRatio(results);
  return {
    ratio,
    beltThisRun: beltForRatio(ratio),
    grade: ratioToGrade(ratio),
  };
}

export { awardedBelt };
