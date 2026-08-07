#!/usr/bin/env node
// measure-copyedit — run the local editorial closure over a property's
// stored drafts (which, since every cultivation projects draft:true, ARE
// the compost) and report the recovery: how many form defects the closure
// removes with ZERO LLM calls, plus a check that the closure laws hold on
// the real corpus (idempotence, defect-monotonicity, faithfulness).
//
// Usage: node scripts/measure-copyedit.mjs <postsDir> [intakeTitles.json]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { copyedit } from "@emsenn/content/topology/copyedit";
import {
  prophecyFindings, repetitionFindings, proseLintSuggestions,
  extractNumbers, extractLinks, wordCount,
} from "@emsenn/content/topology/gates";

const dir = process.argv[2] ?? "../../sites/koios.news/content/posts";
const FLOOR = 800;

/** Body after the front matter (everything past the second `---`). */
function bodyOf(text) {
  const m = text.match(/^---\n[\s\S]*?\n---\n?/);
  return m ? text.slice(m[0].length).trim() : text.trim();
}

const files = readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "_index.md");

let changed = 0;
let totalEdits = 0;
const opCounts = new Map();
let prophecyBefore = 0, prophecyAfter = 0;
let repetitionBefore = 0, repetitionAfter = 0;
let lintBefore = 0, lintAfter = 0;
let monotone = true, idempotent = true, faithful = true;
let lengthMonotone = true, minMarginAbsolute = Infinity;

for (const file of files) {
  const body = bodyOf(readFileSync(join(dir, file), "utf8"));
  if (wordCount(body) < 50) continue;

  const pB = prophecyFindings(body).length;
  const rB = repetitionFindings(body).length;
  const lB = proseLintSuggestions(body, 1000).length;

  const result = copyedit(body, { floor: FLOOR });
  const out = result.body;

  const pA = prophecyFindings(out).length;
  const rA = repetitionFindings(out).length;
  const lA = proseLintSuggestions(out, 1000).length;

  prophecyBefore += pB; prophecyAfter += pA;
  repetitionBefore += rB; repetitionAfter += rA;
  lintBefore += lB; lintAfter += lA;

  if (result.edits.length > 0) { changed += 1; totalEdits += result.edits.length; }
  for (const e of result.edits) opCounts.set(e.op, (opCounts.get(e.op) ?? 0) + 1);

  // Length is the one gate the closure can reduce: it must never push a
  // draft that was at/above the floor below it (length-gate monotonicity).
  const wB = wordCount(body), wA = wordCount(out);
  if (wB >= FLOOR && wA < FLOOR) lengthMonotone = false;
  if (wA >= FLOOR) minMarginAbsolute = Math.min(minMarginAbsolute, wA - FLOOR);

  // Closure laws on real input.
  if (pA > pB || rA > rB) monotone = false;
  if (copyedit(out, { floor: FLOOR }).edits.length !== 0) idempotent = false;
  const numsBefore = new Set(extractNumbers(body));
  for (const n of extractNumbers(out)) if (!numsBefore.has(n)) faithful = false;
  const urlsBefore = new Set(extractLinks(body));
  for (const u of extractLinks(out)) if (!urlsBefore.has(u)) faithful = false;
}

const line = (label, n) => `  ${label.padEnd(34)} ${n}`;
console.log(`\ncopyedit recovery over ${files.length} stored drafts in ${dir}\n`);
console.log(line("drafts the closure repaired", `${changed} / ${files.length}`));
console.log(line("total local edits applied", totalEdits));
console.log(line("LLM calls used", 0));
console.log("\n  edits by operator");
for (const [op, n] of [...opCounts].sort((a, b) => b[1] - a[1])) console.log(line(`    ${op}`, n));
console.log("\n  form defects: before -> after");
console.log(line("    prophecy findings", `${prophecyBefore} -> ${prophecyAfter}`));
console.log(line("    repeated sentences", `${repetitionBefore} -> ${repetitionAfter}`));
console.log(line("    prose-lint suggestions", `${lintBefore} -> ${lintAfter}`));
console.log("\n  closure laws on the real corpus");
console.log(line("    defect-monotone (no new defects)", monotone ? "HOLDS" : "VIOLATED"));
console.log(line("    idempotent (fixpoint reached)", idempotent ? "HOLDS" : "VIOLATED"));
console.log(line("    faithful (no invented num/url)", faithful ? "HOLDS" : "VIOLATED"));
console.log(line("    length-gate monotone (≥ 800)", lengthMonotone ? "HOLDS" : "VIOLATED"));
console.log(line("    min words above floor after edit", Number.isFinite(minMarginAbsolute) ? minMarginAbsolute : "n/a"));
console.log("");
