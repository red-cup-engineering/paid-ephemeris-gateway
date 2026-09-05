#!/usr/bin/env node
// scaffold-cycle.mjs
// Creates work/cycles/<date>-<question-slug>.md with correct frontmatter for the 7-stage cycle.
// Usage: node scaffold-cycle.mjs <question-slug> [--officer <slug>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { questionSlug: null, officer: "pyfars-roadmap-enrichment-officer", help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--officer") { args.officer = argv[++i]; }
    else if (args.questionSlug === null) { args.questionSlug = arg; }
    else { throw new Error(`Unexpected argument: ${arg}`); }
    i++;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.questionSlug) {
    console.log("Usage: scaffold-cycle.mjs <question-slug> [--officer <slug>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const questionSlug = slugify(args.questionSlug);
  const date = today();
  const cycleSlug = `${date}-${questionSlug}`;
  const cyclesDir = path.join(pyfarsRoot, "work", "cycles");
  const outPath = path.join(cyclesDir, `${cycleSlug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const content = `---
type: cycle
slug: ${cycleSlug}
question: ${questionSlug}
officer: ${args.officer}
status: stage-1-question-selected
opened-at: ${date}
closed-at: null
stage-witnesses:
  - stage: stage-1-question-selected
    witnessed-at: ${date}
authored-claims: []
authored-concepts: []
authored-objects: []
authored-morphisms: []
pending-math-examples: []
authored-math-examples: []
deferred-math-examples: []
authored-specifications: []
theory-cited: []
prior-art-cited: []
commissioned-integration: []
integration-finding: null
---

# Cycle: ${questionSlug}

## Stage 1 — Question selected

**Question:** [${questionSlug}](../../questions/${questionSlug}.md)

<!-- Reason for selection. -->

## Stage 2 — Research

<!-- Theory cited. Prior art cited. Position assembled. -->

## Stage 3 — Claim authored

<!-- Claim statement and sketch. -->

## Stage 4 — Objects, morphisms, and concepts authored

<!-- What was authored. What was deferred (pending-math-examples). -->

## Stage 5 — Math examples authored

<!-- Worked instantiations. What was deferred. -->

## Stage 6 — Specifications authored

<!-- Spec slugs and their scope. -->

## Stage 7 — Integration commissioned

<!-- Roadmap touchpoints. Implementation-chain tasks commissioned. -->

## Deferred

<!-- Records explicitly deferred with reason. -->

## What this cycle changed

<!-- One-paragraph summary after completion. -->
`;

  fs.mkdirSync(cyclesDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
