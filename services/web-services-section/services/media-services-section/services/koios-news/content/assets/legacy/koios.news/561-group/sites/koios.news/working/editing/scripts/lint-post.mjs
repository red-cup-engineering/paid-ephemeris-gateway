#!/usr/bin/env node
// lint-post.mjs — mechanical pre-publish checks for a Koios.News post.
// Usage: node lint-post.mjs <path/to/post.md>
// Exit 0 if all hard checks pass, 1 otherwise. Soft checks print warnings.

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: lint-post.mjs <post.md>");
  process.exit(2);
}

const raw = readFileSync(path, "utf8");
const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!m) {
  console.error("✗ no YAML frontmatter found");
  process.exit(1);
}
const [, fm, body] = m;

// --- tiny frontmatter field readers (good enough for our flat + koios shape) ---
const top = (k) => {
  const r = fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, "m"));
  return r ? r[1] : null;
};
const koios = (k) => {
  const r = fm.match(new RegExp(`^\\s{2,}${k}:\\s*"?(.*?)"?\\s*$`, "m"));
  return r ? r[1] : null;
};

const seoTerm = koios("seo_term") || (top("keywords") || "").replace(/[[\]"]/g, "");
const summary = top("summary");
const description = top("description");
const tweet = koios("tweet");
const draft = top("draft");

const words = body.trim().split(/\s+/).filter(Boolean).length;
const firstPara = body.trim().split(/\n\s*\n/)[0] || "";
const subheads = [...body.matchAll(/^##\s+(.*)$/gm)].map((x) => x[1]);
const has = (hay, needle) =>
  needle && hay.toLowerCase().includes(needle.toLowerCase());

const fails = [];
const warns = [];

if (!seoTerm) fails.push("no seo_term / keywords set");
if (words < 800) fails.push(`body is ${words} words (need ≥ 800)`);
if (seoTerm && !has(firstPara, seoTerm))
  fails.push(`SEO term "${seoTerm}" not in the first paragraph`);
if (seoTerm && !subheads.some((h) => has(h, seoTerm)))
  fails.push(`SEO term "${seoTerm}" not in any ## subheader`);
if (!summary) fails.push("summary (excerpt) is empty");
if (!description) fails.push("description (meta) is empty");
if (!tweet) fails.push("koios.tweet is empty");

if (summary) {
  const sw = summary.split(/\s+/).length;
  if (sw < 35 || sw > 65) warns.push(`summary is ${sw} words (aim ~50)`);
}
if (description && description.length > 160)
  warns.push(`description is ${description.length} chars (aim ~120)`);
if (draft === "true") warns.push("draft: true — not yet publishable");

const name = path.split("/").pop();
for (const w of warns) console.log(`  ⚠ ${name}: ${w}`);
for (const f of fails) console.log(`  ✗ ${name}: ${f}`);
if (fails.length === 0) console.log(`  ✓ ${name}: ${words} words, checks pass`);

process.exit(fails.length ? 1 : 0);
