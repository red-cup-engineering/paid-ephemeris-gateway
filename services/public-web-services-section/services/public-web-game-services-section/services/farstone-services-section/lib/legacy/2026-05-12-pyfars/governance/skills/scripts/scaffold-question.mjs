#!/usr/bin/env node
// scaffold-question.mjs
// Creates questions/<slug>.md with correct frontmatter.
// Usage: node scaffold-question.mjs <slug> --title "The question?" [--explores <slug,...>] [--filed-by <officer>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { slug: null, title: null, explores: [], filedBy: "captain", help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--title") { args.title = argv[++i]; }
    else if (arg === "--explores") { args.explores = argv[++i].split(",").map(s => s.trim()); }
    else if (arg === "--filed-by") { args.filedBy = argv[++i]; }
    else if (args.slug === null) { args.slug = arg; }
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

  if (args.help || !args.slug) {
    console.log("Usage: scaffold-question.mjs <slug> --title \"The question?\" [--explores <slug,...>] [--filed-by <officer>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const slug = slugify(args.slug);
  const title = args.title ?? `TODO: state the question for ${slug}`;
  const explores = args.explores.length > 0
    ? `[${args.explores.join(", ")}]`
    : `[] # objects/morphisms/concepts/claims this question is about`;

  const outPath = path.join(pyfarsRoot, "questions", `${slug}.md`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const content = `---
type: question
title: "${title}"
status: open
explores: ${explores}
depends-on: []
filed-by: ${args.filedBy}
filed-at: ${today()}
---

# ${title}

<!-- What prompted this question. -->

<!-- What a resolution would need to establish. -->

<!-- What prior context is relevant (prior art, adjacent questions, upstream theory). -->
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
