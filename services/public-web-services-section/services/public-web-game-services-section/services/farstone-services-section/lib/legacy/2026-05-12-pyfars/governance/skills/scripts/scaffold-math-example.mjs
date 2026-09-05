#!/usr/bin/env node
// scaffold-math-example.mjs
// Creates examples/<object-slug>--<example-slug>.md with correct frontmatter.
// Usage: node scaffold-math-example.mjs <object-slug> <example-slug> [--claim <claim-slug>] [--instantiates <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { objectSlug: null, exampleSlug: null, claim: null, instantiates: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--claim") { args.claim = argv[++i]; }
    else if (arg === "--instantiates") { args.instantiates = argv[++i].split(",").map(s => s.trim()); }
    else if (args.objectSlug === null) { args.objectSlug = arg; }
    else if (args.exampleSlug === null) { args.exampleSlug = arg; }
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

  if (args.help || !args.objectSlug || !args.exampleSlug) {
    console.log("Usage: scaffold-math-example.mjs <object-slug> <example-slug> [--claim <slug>] [--instantiates <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const objectSlug = slugify(args.objectSlug);
  const exampleSlug = slugify(args.exampleSlug);
  const filename = `${objectSlug}--${exampleSlug}.md`;
  const examplesDir = path.join(pyfarsRoot, "examples");
  const outPath = path.join(examplesDir, filename);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const instantiates = args.instantiates.length > 0
    ? `[${args.instantiates.join(", ")}]`
    : `[${objectSlug}]`;

  const claimLine = args.claim
    ? `derives-from-claim: ${args.claim}`
    : `derives-from-claim: # TODO: cite originating claim slug`;

  const content = `---
type: example
kind: math
instantiates: ${instantiates}
${claimLine}
depends-on: []
date: ${today()}
---

# ${objectSlug} — ${exampleSlug}

<!-- Worked mathematical instantiation. Name every value, trace every step.
     Prose only to label what each step is doing. No Python, no CLI invocations.
     Per authoring-math-examples: at least one constraint must be actively exercised. -->

## Setup

<!-- Define the concrete domain: entity set, predicate set, value domain, etc. -->

## Trace

<!-- Step-by-step trace through the object/morphism formalism. -->

## What this witnesses

<!-- Name the specific constraint(s) from the object/morphism record that this example exercises. -->
`;

  fs.mkdirSync(examplesDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
