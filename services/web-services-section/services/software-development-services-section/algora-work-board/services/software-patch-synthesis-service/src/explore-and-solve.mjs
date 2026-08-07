// Patch-synthesis die: understand by reading, propose an edit, and hire verification.
// 1. clone read-only, 2. LOCATE the relevant code by grepping the issue's keywords (not by
// guessing one filename), 3. edit that file, 4. static-check the edit (parse/lint, no exec),
// 5. iterate on static failure. Dynamic tests are a separate optional step, not here.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { cloneReadOnly, listFiles, grepRepo, readRepoFile, disposeWorkspace } from "@rsc-quiescent/repository-material-observation-service";
import { staticCheckPath } from "@rsc-quiescent/software-static-verification-service";
import { complete } from "./inference-client.mjs";
import { buildEditMessages, applyEditBlocks } from "@red-cup-engineering/software-edit-language-service";

export function issueKeywords(text) {
  const kw = new Set();
  for (const m of String(text || "").matchAll(/[A-Za-z_][A-Za-z0-9_]{4,}/g)) kw.add(m[0]);
  return [...kw];
}

// Find the files most likely to hold the bug: explicit filenames in the issue win; otherwise
// rank files by how many of the issue's keywords they contain.
export function locateFiles(dir, issueText, { maxFiles = 4 } = {}) {
  const all = listFiles(dir);
  const named = [];
  for (const m of String(issueText || "").matchAll(/[\w./-]+\.\w{1,5}/g)) {
    const hit = all.find((f) => f === m[0] || f.endsWith("/" + m[0]));
    if (hit && !named.includes(hit)) named.push(hit);
  }
  if (named.length) return named.slice(0, maxFiles);

  const kws = issueKeywords(issueText).filter((k) => k.length > 4).slice(0, 8);
  const score = new Map();
  for (const kw of kws) {
    for (const h of grepRepo(dir, kw, { max: 60, literal: true })) {
      const f = h.split(":")[0];
      score.set(f, (score.get(f) || 0) + 1);
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxFiles).map((e) => e[0]);
}

export async function exploreAndSolve({
  repo, issueText, ref,
  maxRounds = 3, maxTokens = 1200, clone = cloneReadOnly, keepDir = false,
}) {
  const dir = await clone(repo, { ref });
  try {
    const located = locateFiles(dir, issueText);
    if (!located.length) return { ok: false, reason: "could not locate relevant files in the repo", located: [] };
    const primary = located[0];
    const original = readRepoFile(dir, primary);
    const failures = [];

    for (let round = 1; round <= maxRounds; round++) {
      const source = readRepoFile(dir, primary);
      const editText = await complete({
        maxTokens,
        messages: buildEditMessages({ task: { title: "Fix the reported issue", body: `${issueText}\n\nFiles located: ${located.join(", ")}` }, filePath: primary, source, failures }),
      });
      const applied = applyEditBlocks(source, editText);
      if (!applied.ok || applied.result === source) { failures.push({ apply: applied.reason || "no-op edit" }); continue; }

      const abs = join(dir, primary);
      writeFileSync(abs, applied.result);
      const sc = staticCheckPath(abs); // verify WITHOUT running
      if (sc.ok) {
        return { ok: true, repo, file: primary, before: original, after: applied.result, located, staticChecks: sc.checks, rounds: round, dir: keepDir ? dir : undefined };
      }
      failures.push({ static: sc.checks.filter((c) => !c.ok).map((c) => `${c.check}: ${c.detail}`).join("; ") });
      writeFileSync(abs, original); // revert before next attempt
    }
    return { ok: false, reason: "no statically-valid edit after retries", repo, file: primary, located, failures };
  } finally {
    if (!keepDir) disposeWorkspace(dir);
  }
}
