#!/usr/bin/env node
// new-brief.mjs — scaffold a dated Koios.News research brief.
// Usage: node new-brief.mjs "<title>" "<seo term>"
// Writes working/researching/library/<YYYY-MM-DD>-<slug>.md (won't overwrite).

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , title, seoTerm] = process.argv;
if (!title) {
  console.error('usage: new-brief.mjs "<title>" "<seo term>"');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const library = resolve(here, "..", "library");
const today = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const file = resolve(library, `${today}-${slug}.md`);

if (existsSync(file)) {
  console.error(`refusing to overwrite ${file}`);
  process.exit(1);
}

const brief = `---
title: "${title}"
date: ${today}
seo_term: "${seoTerm ?? ""}"
status: brief
---

# ${title}

## The event
<!-- what happened, confirmed within the last 7 days -->

## Primary sources
<!-- title — author — permalink, one per line -->
-

## Why it is under-discussed
<!-- what the coverage is missing -->

## The collapse-connection angle
<!-- one sentence: what larger system this is a window onto -->

## Feasibility check
<!-- can the world support the future this implies, at that point? -->
`;

mkdirSync(library, { recursive: true });
writeFileSync(file, brief);
console.log(file);
