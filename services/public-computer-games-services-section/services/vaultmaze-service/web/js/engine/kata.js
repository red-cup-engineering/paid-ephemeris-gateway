/**
 * `kata` — browser port of `src/kata.mts`'s *runtime* half only (DESIGN.md §5): per-card
 * scoring, belt tiers, and the ratio→SRS-grade mapping. The path-linearization half
 * (`autoKataPath`) is intentionally NOT ported here — it is a pure function of the compiled
 * world (doors + rooms), so `web/build/build-layout.mts` calls the REAL `src/kata.mts` once at
 * build time and bakes the resulting paths into `data/<wing>-layout.json`. That keeps exactly
 * one copy of the path-generation logic in the whole system; only the genuinely-per-session
 * runtime bits (score a timed response, decide a belt) need to exist in the browser.
 */

export function scoreCard(result) {
  if (result.outcome === 'again') return 0;
  if (result.outcome === 'hard') return 0.5;
  return result.responseTimeMs <= result.tFastMs ? 2 : 1;
}

export function kataRatio(results) {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + scoreCard(r), 0);
  const max = results.length * 2;
  return total / max;
}

export const BELT_THRESHOLDS = [
  { belt: 'black', min: 0.97 },
  { belt: 'brown', min: 0.92 },
  { belt: 'blue', min: 0.85 },
  { belt: 'green', min: 0.75 },
  { belt: 'orange', min: 0.65 },
  { belt: 'yellow', min: 0.5 },
  { belt: 'white', min: 0 },
];

export function beltForRatio(ratio) {
  for (const { belt, min } of BELT_THRESHOLDS) {
    if (ratio >= min) return belt;
  }
  return 'white';
}

/** A belt is only *awarded* once it's the minimum of the player's last 3 consecutive kata
 * clears (DESIGN.md §5) — avoids a one-lucky-run fluke. */
export function awardedBelt(lastThreeRatios) {
  if (lastThreeRatios.length < 3) return 'white';
  const min = Math.min(...lastThreeRatios);
  return beltForRatio(min);
}

export function ratioToGrade(ratio) {
  if (ratio < 0.5) return 1;
  if (ratio < 0.75) return 2;
  if (ratio < 0.92) return 3;
  return 4;
}
