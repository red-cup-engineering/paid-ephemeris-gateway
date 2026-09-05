#!/usr/bin/env node
// scaffold-claim.mjs
// Creates claims/<slug>.md with correct frontmatter.
// Usage: node scaffold-claim.mjs <slug> [--question <slug>] [--depends-on <slug,...>] [--theory-basis <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, question: null, dependsOn: [], theoryBasis: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--question") { args.question = argv[++i]; }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--theory-basis") { args.theoryBasis = argv[++i].split(",").map(s => s.trim()); }
    else if (args.slug === null) { args.slug = arg; }
    else { throw new Error(`Unexpected argument: ${arg}`); }
    i++;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.slug) {
    console.log("Usage: scaffold-claim.mjs <slug> [--question <slug>] [--depends-on <slug,...>] [--theory-basis <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const outPath = path.join(pyfarsRoot, "claims", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const questionLine = args.question
    ? `derived-from-question: ${args.question}`
    : `derived-from-question: # TODO: cite originating question slug`;

  const dependsOn = args.dependsOn.length > 0
    ? `[${args.dependsOn.join(", ")}]`
    : `[]`;

  const theoryBasis = args.theoryBasis.length > 0
    ? `[${args.theoryBasis.join(", ")}]`
    : `[] # upstream theorems grounding this claim's correctness`;

  const title = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  const content = `---
type: claim
status: draft
${questionLine}
depends-on: ${dependsOn}
theory-basis: ${theoryBasis}
---

# ${title}

**Claim.** <!-- Single declarative sentence. -->

## Statement

<!-- Formal statement of the claim. -->

## Sketch

<!-- Proof outline. Route through upstream theorems. -->

## Non-claims

<!-- What this claim does NOT assert. -->

## What would have to change for this claim to fail

<!-- Refutation conditions. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
