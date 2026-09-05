#!/usr/bin/env node
// scaffold-tutorial.mjs
// Creates prose/tutorials/<slug>.md with correct frontmatter.
// Usage: node scaffold-tutorial.mjs <slug> --title "Gerund phrase" [--depends-on <slug,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, title: null, dependsOn: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--title") { args.title = argv[++i]; }
    else if (arg === "--depends-on") { args.dependsOn = argv[++i].split(",").map(s => s.trim()); }
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
    console.log("Usage: scaffold-tutorial.mjs <slug> --title \"Gerund phrase\" [--depends-on <slug,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const title = args.title ?? slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const dependsOn = args.dependsOn.length > 0 ? `[${args.dependsOn.join(", ")}]` : `[]`;
  const outPath = path.join(pyfarsRoot, "prose", "tutorials", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const content = `---
title: "${title}"
type: tutorial
status: draft
depends-on: ${dependsOn}
---

# ${title}

<!-- After this tutorial, you will be able to: TODO -->

## Before you start

<!-- Prerequisites. Software versions. Files that must exist. Permissions required. Be specific. -->

You need:

- TODO

## Step 1 — TODO

<!-- One action per step. Include expected output for non-obvious steps. -->

## Step 2 — TODO

<!-- Continue. -->

## You now have

<!-- Summary of what the reader accomplished. -->

## What to do next

<!-- Pointers to related tutorials, deeper explanations, how-to guides for common variations. -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
