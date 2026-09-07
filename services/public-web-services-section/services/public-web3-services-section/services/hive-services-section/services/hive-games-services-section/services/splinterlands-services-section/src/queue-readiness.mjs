// queue-readiness — reports whether the fleet's observed energy, collection,
// and battle-queue state WOULD satisfy a conservative one-match ranked-queue
// policy, without building, queuing, or submitting a battle. This is an
// audit signal only: it exists so an operator can see "the account looks
// battle-ready" as a fact about owned inventory, the same way a human player
// checks their energy bar before opening the game client. It intentionally
// stops short of the automated-play boundary described in this section's
// README (no sm_find_match / sm_submit_team / sm_surrender encoder exists in
// this service, and none is planned).

export const SPLINTERLANDS_OPERATOR_POLICY = Object.freeze({
  format: "modern",
  matchType: "Modern Ranked",
  minimumEnergy: 40,
  maximumMatchesPerRun: 1,
  minimumSubmitWindowMs: 25_000,
  authority: "posting",
  inventory: "owned-only",
});

/**
 * Would a single owned-only Modern Ranked match be admitted under this
 * fleet's conservative policy? Never queues anything itself — a caller that
 * wants to act on a "queue-one" result still needs a battle-submission path
 * this service deliberately does not provide (see README).
 */
export function admitOneSplinterlandsQueue(input) {
  if (typeof input.account !== "string" || !/^[a-z][a-z0-9.-]{2,15}$/u.test(input.account)) return Object.freeze({ kind: "refuse", reason: "the observed account is invalid" });
  if (!Number.isFinite(input.energy) || input.energy < SPLINTERLANDS_OPERATOR_POLICY.minimumEnergy) return Object.freeze({ kind: "refuse", reason: `energy is below the hard ${SPLINTERLANDS_OPERATOR_POLICY.minimumEnergy} floor` });
  if (!Number.isSafeInteger(input.outstandingMatches) || input.outstandingMatches !== 0) return Object.freeze({ kind: "refuse", reason: "an outstanding or malformed battle queue exists" });
  if (!input.collectionReady) return Object.freeze({ kind: "refuse", reason: "no owned-only Modern team core is ready" });
  if (!input.coverageReady) return Object.freeze({ kind: "refuse", reason: "the owned-only roster does not cover every tested live match scenario" });
  if (!Number.isSafeInteger(input.alreadyAttempted) || input.alreadyAttempted !== 0) return Object.freeze({ kind: "refuse", reason: "the one-match run budget is already spent" });
  return Object.freeze({ kind: "queue-one", reason: "one owned-only Modern Ranked match would be admitted under posting authority by this policy's readiness bar; this service does not submit it" });
}
