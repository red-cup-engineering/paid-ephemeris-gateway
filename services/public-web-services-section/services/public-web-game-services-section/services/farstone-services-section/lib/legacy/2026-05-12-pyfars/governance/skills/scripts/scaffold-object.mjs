#!/usr/bin/env node
// scaffold-object.mjs
// Creates objects/<slug>.md with correct frontmatter.
// Usage: node scaffold-object.mjs <slug> [--class <class>] [--realizes <slug,...>] [--depends-on <slug,...>] [--claim <slug>] [--theory-basis <slug,...>] [--impl <python.module.path>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, class: null, realizes: [], dependsOn: [], claim: null, theoryBasis: [], impl: null, help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--class") { args.class = argv[++i]; }
    else if (arg === "--realizes") { args.realizes = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--claim") { args.claim = argv[++i]; }
    else if (arg === "--theory-basis") { args.theoryBasis = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--impl") { args.impl = argv[++i]; }
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
    console.log("Usage: scaffold-object.mjs <slug> [--class <class>] [--realizes <slug,...>] [--depends-on <slug,...>] [--claim <slug>] [--theory-basis <slug,...>] [--impl <python.module>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const outPath = path.join(pyfarsRoot, "objects", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const classLine = args.class ? `class: ${args.class}` : `class: substrate-entity`;
  const realizes = args.realizes.length > 0 ? `[${args.realizes.join(", ")}]` : `[]`;
  const dependsOn = args.dependsOn.length > 0 ? `[${args.dependsOn.join(", ")}]` : `[]`;
  const theoryBasis = args.theoryBasis.length > 0 ? `[${args.theoryBasis.join(", ")}]` : `[]`;
  const claimLine = args.claim
    ? `derives-from-claim: ${args.claim}`
    : `derives-from-claim: # TODO: cite originating claim slug`;
  const implLine = args.impl ? `implementation: ${args.impl}` : `implementation: # TODO: pyfars.module.path when implemented`;
  const title = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  const content = `---
type: definition
${classLine}
status: draft
realizes: ${realizes}
${claimLine}
depends-on: ${dependsOn}
theory-basis: ${theoryBasis}
${implLine}
---

# ${title}

<!-- One sentence: what this object is. -->

## Definition

<!-- Formal definition. Cell-shape (frontmatter schema): what cells the substrate stores,
     in what value-domain (bilattice, cost-quantale, etc.), and which closure rules read/write them. -->

## Cells

<!-- List the substrate cells this object carries. -->

## What this object commits to

<!-- The invariants this object maintains. What must be true of any instance. -->

## What this object does not specify

<!-- Deliberate silences. What is left to the morphisms or implementation to decide. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
