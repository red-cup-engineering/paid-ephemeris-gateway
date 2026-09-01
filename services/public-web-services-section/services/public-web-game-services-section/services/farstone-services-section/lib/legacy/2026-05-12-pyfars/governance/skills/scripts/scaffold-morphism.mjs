#!/usr/bin/env node
// scaffold-morphism.mjs
// Creates morphisms/<slug>.md with correct frontmatter.
// Usage: node scaffold-morphism.mjs <slug> [--class <class>] [--realizes <slug,...>] [--depends-on <slug,...>] [--claim <slug>] [--theory-basis <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, class: null, realizes: [], dependsOn: [], claim: null, theoryBasis: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--class") { args.class = argv[++i]; }
    else if (arg === "--realizes") { args.realizes = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--claim") { args.claim = argv[++i]; }
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
    console.log("Usage: scaffold-morphism.mjs <slug> [--class <class>] [--realizes <slug,...>] [--depends-on <slug,...>] [--claim <slug>] [--theory-basis <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const outPath = path.join(pyfarsRoot, "morphisms", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const classLine = args.class ? `class: ${args.class}` : `class: substrate-operation`;
  const realizes = args.realizes.length > 0 ? `[${args.realizes.join(", ")}]` : `[]`;
  const dependsOn = args.dependsOn.length > 0 ? `[${args.dependsOn.join(", ")}]` : `[]`;
  const theoryBasis = args.theoryBasis.length > 0 ? `[${args.theoryBasis.join(", ")}]` : `[]`;
  const claimLine = args.claim
    ? `derives-from-claim: ${args.claim}`
    : `derives-from-claim: # TODO: cite originating claim slug`;
  const title = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  const content = `---
type: morphism
${classLine}
status: draft
realizes: ${realizes}
${claimLine}
depends-on: ${dependsOn}
theory-basis: ${theoryBasis}
---

# ${title}

<!-- One sentence: what this morphism does. -->

## Action

<!-- Premise → conclusion shape.
     What cells the morphism reads (premise), what cells it writes (conclusion),
     what value-transformation it performs. -->

## Composition

<!-- How this morphism composes with upstream/downstream morphisms in its work cycle. -->

## What this morphism commits to

<!-- Invariants: what must be true of any execution. -->

## What this morphism does not do

<!-- Explicit non-scope. What adjacent things this morphism deliberately leaves to other morphisms. -->

## Open structural questions

<!-- Things not yet decided about this morphism's behavior or boundary. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
