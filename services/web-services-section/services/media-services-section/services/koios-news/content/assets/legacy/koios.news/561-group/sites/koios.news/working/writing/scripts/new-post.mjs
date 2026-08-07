#!/usr/bin/env node
// new-post.mjs — scaffold a Koios.News post in the site's frontmatter shape.
// Usage: node new-post.mjs "<title>" "<seo term>"
// Writes content/posts/<slug>.md (won't overwrite), marked draft: true.

import { writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , title, seoTerm] = process.argv;
if (!title) {
  console.error('usage: new-post.mjs "<title>" "<seo term>"');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
// here = working/writing/scripts -> up 3 to package root, then into content.
const posts = resolve(here, "..", "..", "..", "content", "posts");
const today = new Date().toISOString().slice(0, 10);
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const file = resolve(posts, `${slug}.md`);
const term = seoTerm ?? "";

if (existsSync(file)) {
  console.error(`refusing to overwrite ${file}`);
  process.exit(1);
}

const post = `---
title: "${title}"
date: ${today}
draft: true
author: "Nik Koios"
slug: "${slug}"
description: ""
summary: ""
keywords: ["${term}"]
categories: ["Climate Breakdown"]
tags: []
koios:
  seo_term: "${term}"
  tweet: ""
---

<!-- Lede: state the event and land "${term}" here. Then the turn. -->

## <!-- a subheader; "${term}" should appear in at least one -->

<!-- read the event through the collapse frame; cite primary sources inline -->

## What this is a window onto

<!-- tie it into the larger compounding pattern — a vision, never a prophecy -->
`;

writeFileSync(file, post);
console.log(file);
