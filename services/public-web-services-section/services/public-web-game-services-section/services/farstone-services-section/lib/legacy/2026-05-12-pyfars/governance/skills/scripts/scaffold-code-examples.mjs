#!/usr/bin/env node
// scaffold-code-examples.mjs
// Creates examples/<spec-slug>/_index.md scaffolding for a spec's code fixture corpus.
// Usage: node scaffold-code-examples.mjs <spec-slug> [--criteria <label,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { specSlug: null, criteria: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--criteria") { args.criteria = argv[++i].split(",").map(s => s.trim()); }
    else if (args.specSlug === null) { args.specSlug = arg; }
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

  if (args.help || !args.specSlug) {
    console.log("Usage: scaffold-code-examples.mjs <spec-slug> [--criteria <label,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const specSlug = slugify(args.specSlug);
  const examplesDir = path.join(pyfarsRoot, "examples", specSlug);
  const indexPath = path.join(examplesDir, "_index.md");

  if (fs.existsSync(indexPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, indexPath)}`);
    process.exitCode = 1;
    return;
  }

  const criteriaRows = args.criteria.length > 0
    ? args.criteria.map((c, i) => `| ${String(i + 1).padStart(2)} | ${c} | \`${slugify(c)}.<ext>\` | <!-- math example slug --> |`).join("\n")
    : `| 01 | <!-- criterion label --> | \`<criterion-slug>.<ext>\` | <!-- math example slug --> |`;

  const content = `---
title: "Code examples: ${specSlug}"
type: index
spec: ${specSlug}
date: ${today()}
---

# Code examples — ${specSlug}

Spec-compliant fixtures for [\`governance/specifications/${specSlug}.md\`](../../governance/specifications/${specSlug}.md).
Tests at \`tests/test_${specSlug}.py\` load these fixtures; they do not fabricate their own data.

## Fixtures

| # | Acceptance criterion | Fixture | Derived from math example |
|---|---|---|---|
${criteriaRows}

## Authoring notes

- Each fixture must be self-contained (no hidden dependencies outside this directory).
- Each fixture carries a header comment citing the spec slug and criterion number.
- Verify each fixture manually before handing off to test authoring.
- Per \`authoring-code-examples\`: no explanatory comments beyond the spec-citation header.
`;

  fs.mkdirSync(examplesDir, { recursive: true });
  fs.writeFileSync(indexPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, indexPath)}`);

  // Stub fixture files for each named criterion.
  for (const criterion of args.criteria) {
    const criterionSlug = slugify(criterion);
    // We don't know the extension yet; create a .md stub as placeholder.
    const stubPath = path.join(examplesDir, `${criterionSlug}.md`);
    if (!fs.existsSync(stubPath)) {
      fs.writeFileSync(stubPath, `<!-- spec: ${specSlug} criterion: ${criterion} -->\n<!-- TODO: replace with actual fixture -->\n`, "utf8");
      console.log(`  Stubbed: ${path.relative(pyfarsRoot, stubPath)}`);
    }
  }
}

main();
