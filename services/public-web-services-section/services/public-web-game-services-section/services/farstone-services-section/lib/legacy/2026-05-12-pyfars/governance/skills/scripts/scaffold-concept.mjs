#!/usr/bin/env node
// scaffold-concept.mjs
// Creates concepts/<slug>.md with correct frontmatter.
// Usage: node scaffold-concept.mjs <slug> [--class <class>] [--depends-on <slug,...>] [--see-also <slug,...>] [--claim <slug>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, class: null, dependsOn: [], seeAlso: [], claim: null, help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--class") { args.class = argv[++i]; }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--see-also") { args.seeAlso = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--claim") { args.claim = argv[++i]; }
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
    console.log("Usage: scaffold-concept.mjs <slug> [--class <class>] [--depends-on <slug,...>] [--see-also <slug,...>] [--claim <slug>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const outPath = path.join(pyfarsRoot, "concepts", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const classLine = args.class ? `class: ${args.class}` : `class: # optional: category of concept`;
  const dependsOn = args.dependsOn.length > 0 ? `[${args.dependsOn.join(", ")}]` : `[]`;
  const seeAlso = args.seeAlso.length > 0 ? `[${args.seeAlso.join(", ")}]` : `[]`;
  const claimLine = args.claim
    ? `derives-from-claim: ${args.claim}`
    : `derives-from-claim: # TODO: cite originating claim slug`;
  const title = slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  const content = `---
type: concept
${classLine}
status: draft
${claimLine}
depends-on: ${dependsOn}
see-also: ${seeAlso}
---

# ${title}

<!-- One sentence: the role this concept plays across the structures that realize it. -->

<!-- Objects and morphisms that realize this concept declare \`realizes: [${slug}]\` in their frontmatter. -->

## What distinguishes this concept

<!-- What makes this a distinct semantic anchor, not just a synonym for another concept. -->

## Realizations

<!-- List known objects and morphisms that realize this concept, once they exist. -->

## What this concept does not yet specify

<!-- Deliberate silences: what is left to the realizing structure to decide. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
