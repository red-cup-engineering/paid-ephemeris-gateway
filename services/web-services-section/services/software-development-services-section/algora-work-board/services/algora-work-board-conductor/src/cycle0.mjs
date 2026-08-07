// Cycle 0 conductor function. Observe -> assay -> ranked, content-addressed
// watch-result. Does NOT attempt or claim. Runs on free compute.
//
// Input JSON: an array of { commentMarkdown, meta } (meta as in parseBountyCandidate).
// Usage:
//   node src/cli/cycle0.mjs --input candidates.json --observed-at 2026-07-18T00:00:00Z \
//     [--ledger data/ledgers/bounty-outcomes] [--out data/ledgers/watch-results]
import { parseBountyCandidate } from "@rsc-quiescent/algora-opportunity-observation-service/parse";
import { buildRepoTrust, trustFor } from "@rsc-quiescent/software-work-risk-assay-service/repo-trust";
import { qualifyBounty } from "@rsc-quiescent/software-work-qualification-assay-service";
import { addressed } from "@rsc-quiescent/software-work-witness-service/hashing";

export function runCycle0({ candidatesInput, observedAt, historyRecords = [], config = {} }) {
  if (!observedAt) throw new Error("observedAt is required (no hidden clock)");
  const repoTrust = buildRepoTrust(historyRecords, config.trust);
  const scored = candidatesInput.map((raw) => {
    const candidate = parseBountyCandidate({ ...raw, observedAt });
    const trust = trustFor(repoTrust, candidate.repo);
    const analysis = qualifyBounty(candidate, trust, config.qualify);
    return { candidate, analysis };
  });
  const ranked = [...scored].sort((a, b) => b.analysis.evPerRequest - a.analysis.evPerRequest);
  const summary = {
    total: ranked.length,
    qualified: ranked.filter((r) => r.analysis.verdict === "qualified").length,
    refused: ranked.filter((r) => r.analysis.verdict === "refused").length,
  };
  const watch = addressed({
    kind: "algora-pilot.watch-result",
    observedAt,
    summary,
    candidates: ranked.map((r) => ({
      repo: r.candidate.repo,
      issueNumber: r.candidate.issueNumber,
      url: r.candidate.url,
      reward: r.candidate.reward,
      competition: r.candidate.competition,
      verdict: r.analysis.verdict,
      ev: r.analysis.ev,
      evPerRequest: r.analysis.evPerRequest,
      pWin: r.analysis.pWin,
      repoTrust: r.analysis.repoTrust,
      flags: r.analysis.flags,
      reasons: r.analysis.reasons,
    })),
  });
  return { watch, ranked, summary };
}
