// Board sequence: Observe -> Assay -> Select -> Synthesize -> Execute -> Adjudicate -> Witness.
// Monitor+Analyze reuse runCycle0; Execute runs the free-compute solve loop per candidate;
// Witness appends outcomes that become the learned repo-trust K and the RSI detector's input.
// The daily free-compute REQUEST QUOTA is the only real cap, so selection is greedy by
// EV-per-request until the request budget is spent. Outward GitHub posting is NOT here — that
// act is gated on the human-type-account decision.
import { runCycle0 } from "./cycle0.mjs";

export async function runLoop({
  candidatesInput,
  observedAt,
  historyRecords = [], // witnessed merge/loss history
  requestBudget = Infinity, // free-compute requests available this run (the real cap)
  attemptCostRequests = 6,
  solve, // (candidate, analysis) -> { status, solvedBy, ... }  (injectable)
  witnessOutcome = null, // async (record) -> witnessed record
  config = {},
}) {
  if (!observedAt) throw new Error("observedAt is required");
  if (typeof solve !== "function") throw new Error("solve function is required");

  const { ranked, watch } = runCycle0({ candidatesInput, observedAt, historyRecords, config });
  const qualified = ranked.filter((r) => r.analysis.verdict === "qualified");

  const maxAttempts = Number.isFinite(requestBudget)
    ? Math.floor(requestBudget / attemptCostRequests)
    : qualified.length;
  const selected = qualified.slice(0, maxAttempts);
  const deferred = qualified.length - selected.length; // long tail left for the next budget window

  const outcomes = [];
  for (const r of selected) {
    const outcome = await solve(r.candidate, r.analysis);
    const record = {
      observedAt,
      repo: r.candidate.repo,
      issueNumber: r.candidate.issueNumber,
      reward: r.candidate.reward,
      evPerRequest: r.analysis.evPerRequest,
      status: outcome.status,
      solvedBy: outcome.solvedBy,
      note: outcome.note ?? null,
    };
    if (witnessOutcome) await witnessOutcome(record);
    outcomes.push({ ...record, ...outcome });
  }

  const by = (pred) => outcomes.filter(pred).length;
  const summary = {
    discovered: candidatesInput.length,
    qualified: qualified.length,
    attempted: selected.length,
    deferredToNextBudget: deferred,
    solvedByResolver: by((o) => typeof o.solvedBy === "string" && o.solvedBy.startsWith("resolver:")),
    solvedFree: by((o) => o.solvedBy === "free-model"),
    escalatedToClaude: by((o) => o.solvedBy === "claude-code"),
    failed: by((o) => !o.solvedBy && o.status !== "skipped"),
    skipped: by((o) => o.status === "skipped"),
  };
  return { watchId: watch.id, summary, outcomes };
}
