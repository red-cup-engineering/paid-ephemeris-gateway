// Rectification-assay die. Reads witnessed outcomes and, when a pattern recurs at/above a
// threshold, emits a content-addressed rectification PROPOSAL — it never self-applies. This
// composes the firm's own doctrine (proposing-recovery-apparatus-rectification /
// bootstrap-by-rectification): choose the lowest faithful layer (memory -> rule -> skill ->
// hook), carry evidence, and retire the manual copy only after an witness.
//
// The point is the loop's self-improvement: repeated model-wins in a repo crystallize into a
// deterministic trusted-route (shrinking model reliance and pickiness — the long-tail thesis),
// and repeated failures crystallize into a cold-route that stops wasting the request budget.
import { addressed } from "@rsc-quiescent/software-work-witness-service/hashing";

const isWin = (o) => typeof o.solvedBy === "string" && o.solvedBy.length > 0;
const isFail = (o) => o.status === "failed" || o.status === "refused";

function groupBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}

// Firm's layer ladder (same rule as detect-repeated-surrogates).
export function proposeLayer({ mechanicallyCheckable, mustRunEveryTime }) {
  if (mechanicallyCheckable && mustRunEveryTime) return "hook";
  if (mechanicallyCheckable) return "skill";
  return "rule";
}

export function detectRectifications(outcomes, { threshold = 2 } = {}) {
  const proposals = [];

  for (const [repo, group] of groupBy(outcomes.filter(isWin), (o) => o.repo)) {
    if (group.length >= threshold) {
      proposals.push(addressed({
        kind: "algora-pilot.rectification-proposal",
        signature: `wins-in-repo:${repo}`,
        count: group.length,
        layer: proposeLayer({ mechanicallyCheckable: true, mustRunEveryTime: false }),
        proposal: `Crystallize a trusted-route resolver for ${repo}: ${group.length} solves recorded — prioritize its bounties and lower its difficulty gate, shrinking model reliance for its task-class.`,
        evidence: group.map((o) => `${o.repo}#${o.issueNumber}`),
        retireManualCopyAfterWitness: true,
      }));
    }
  }

  for (const [repo, group] of groupBy(outcomes.filter(isFail), (o) => o.repo)) {
    if (group.length >= threshold) {
      proposals.push(addressed({
        kind: "algora-pilot.rectification-proposal",
        signature: `fails-in-repo:${repo}`,
        count: group.length,
        layer: proposeLayer({ mechanicallyCheckable: true, mustRunEveryTime: false }),
        proposal: `Add a cold-route rule for ${repo}: ${group.length} attempts failed — de-prioritize its bounties until a win resets trust, so the request budget isn't spent on it.`,
        evidence: group.map((o) => `${o.repo}#${o.issueNumber}`),
        retireManualCopyAfterWitness: true,
      }));
    }
  }

  return proposals;
}
