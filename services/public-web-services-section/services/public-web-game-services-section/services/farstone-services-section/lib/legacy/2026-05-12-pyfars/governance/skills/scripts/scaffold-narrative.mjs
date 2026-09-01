#!/usr/bin/env node
// scaffold-narrative.mjs
// Creates prose/narratives/<slug>.md with correct frontmatter.
// Usage: node scaffold-narrative.mjs <slug> --title "The angle" [--depends-on <slug,...>] [--introduces <slug,...>] [--recaps <slug,...>] [--discusses <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, title: null, dependsOn: [], introduces: [], recaps: [], discusses: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--title") { args.title = argv[++i]; }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--introduces") { args.introduces = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--recaps") { args.recaps = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--discusses") { args.discusses = argv[++i].split(",").map(s => s.trim()); }
    else if (args.slug === null) { args.slug = arg; }
    else { throw new Error(`Unexpected argument: ${arg}`); }
    i++;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listOrEmpty(arr) {
  return arr.length > 0 ? `[${arr.join(", ")}]` : `[]`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.slug) {
    console.log("Usage: scaffold-narrative.mjs <slug> --title \"The angle\" [--depends-on <slug,...>] [--introduces <slug,...>] [--recaps <slug,...>] [--discusses <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const title = args.title ?? slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const outPath = path.join(pyfarsRoot, "prose", "narratives", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const content = `---
type: narrative
title: "${title}"
status: draft
depends-on: ${listOrEmpty(args.dependsOn)}
introduces: ${listOrEmpty(args.introduces)}
recaps: ${listOrEmpty(args.recaps)}
discusses: ${listOrEmpty(args.discusses)}
---

# ${title}

<!-- 500–3000 words. Walk the path through the material.
     Link to objects/morphisms/concepts by reference — don't duplicate their definitions.
     The narrative's value is the path, not the definitions. Keep it moving.
     Per authoring-a-narrative: every claim must be grounded in a cited record. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
