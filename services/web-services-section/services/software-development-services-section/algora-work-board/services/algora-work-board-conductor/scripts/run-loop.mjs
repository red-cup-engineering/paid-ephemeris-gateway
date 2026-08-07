#!/usr/bin/env node
// Full-loop driver: Monitor -> Analyze -> Execute -> Witness, budget-bounded. Does NOT post
// to GitHub (that act is gated on the human-type-account decision). Use --dry for a safe
// measurement pass (discovers + qualifies + selects, skips code execution).
import { discoverCandidates } from "@rsc-quiescent/algora-opportunity-observation-service";
import { runLoop } from "../src/orchestrator.mjs";
import { solveCandidate } from "../src/solve-candidate.mjs";
import { githubActionsExecutor } from "@rsc-quiescent/software-sandbox-execution-service";
import { appendOutcome, outcomeStore, readOutcomes } from "@rsc-quiescent/software-work-witness-service";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) a[t.slice(2)] = argv[i + 1]?.startsWith("--") || i + 1 >= argv.length ? true : argv[++i];
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.live || !args["observed-at"]) {
    console.error("usage: run-loop --live --observed-at <iso> [--budget <requests>] [--dry] [--executor github-actions] [--limit N] [--ledger <dir>] [--out <dir>]");
    process.exit(2);
  }
  // No executor by default. The only admitted wet carrier is the remote sandbox.
  const executor = args.executor === "github-actions" ? githubActionsExecutor() : undefined;
  const candidatesInput = await discoverCandidates({ limit: args.limit ? Number(args.limit) : 15, onSkip: (i, r) => console.error(`skip ${i.repo}#${i.issueNumber}: ${r}`) });

  const res = await runLoop({
    candidatesInput,
    observedAt: args["observed-at"],
    historyRecords: args.ledger ? readOutcomes(args.ledger) : [],
    requestBudget: args.budget ? Number(args.budget) : Infinity,
    solve: (c, a) => solveCandidate(c, a, { executor, dryRun: Boolean(args.dry) }),
    witnessOutcome: args.out ? (record) => appendOutcome(outcomeStore({ dataRoot: args.out }), record) : null,
  });

  console.log(`# algora full loop @ ${args["observed-at"]}${args.dry ? " (DRY)" : ""}`);
  console.log(`# discovered ${res.summary.discovered} / qualified ${res.summary.qualified} / attempted ${res.summary.attempted} (deferred ${res.summary.deferredToNextBudget})`);
  console.log(`# solved: resolver ${res.summary.solvedByResolver}, free ${res.summary.solvedFree}, escalated ${res.summary.escalatedToClaude}; failed ${res.summary.failed}; skipped ${res.summary.skipped}`);
  for (const o of res.outcomes) {
    console.log(`${String(o.status).padEnd(16)} ${o.solvedBy ?? "-"}  ${o.repo}#${o.issueNumber}  ${o.reward?.formatted ?? "?"}${o.note ? "  (" + o.note + ")" : ""}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
