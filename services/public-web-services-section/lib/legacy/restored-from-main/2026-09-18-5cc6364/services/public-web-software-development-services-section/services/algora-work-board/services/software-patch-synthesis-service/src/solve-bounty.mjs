// Synthesize one patch candidate from bounded repository material via the
// GitHub API (no execution), ask a capable free model for SEARCH/REPLACE edits, apply them
// with the tolerant applier. Produces the fixed file content. Does NOT run tests (that is the
// cloud sandbox) and does NOT post anything.
import { githubApi } from "@red-cup-engineering/github-services-section";
import { complete } from "./inference-client.mjs";
import { buildEditMessages, applyEditBlocks } from "@red-cup-engineering/software-edit-language-service";

// Candidate source paths named in the issue text.
export function focusPathsFromIssue(text) {
  const hits = new Set();
  const re = /[\w./-]+\.(?:js|mjs|cjs|ts|tsx|jsx|py|go|rs|java|rb)/g;
  let m;
  while ((m = re.exec(String(text || "")))) hits.add(m[0]);
  return [...hits];
}

export async function solveBounty({
  repo,
  issueNumber,
  issueText,
  filePath,
  api,
  ref,
  maxTokens = 900,
}) {
  const gh = api || githubApi();
  const branch = ref || (await gh.getRepo(repo)).default_branch;
  const paths = filePath ? [filePath] : focusPathsFromIssue(issueText);
  let file = null, source = null;
  for (const p of paths) {
    try { source = await gh.getContent(repo, branch, p); file = p; break; } catch { /* try next */ }
  }
  if (!file) return { ok: false, reason: "no target file resolved from the issue", paths };

  // Free models are non-deterministic about emitting a parseable edit block; retry a few
  // times until one applies. (This is single-shot per attempt — the sandbox verify is what
  // proves correctness; this only fights format flakiness.)
  const maxAttempts = 4;
  let editText = "", applied = { ok: false, reason: "no attempt" };
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    editText = await complete({
      messages: buildEditMessages({ task: { title: `Bounty #${issueNumber}`, body: issueText }, filePath: file, source }),
      maxTokens,
    });
    applied = applyEditBlocks(source, editText);
    if (applied.ok && applied.result !== source) break;
  }
  return {
    ok: applied.ok && applied.result !== source,
    reason: applied.ok ? (applied.result === source ? "edit was a no-op" : undefined) : (applied.reason || "no parseable edit produced after retries"),
    repo,
    issueNumber,
    file,
    before: source,
    after: applied.result ?? null,
    editText,
    changed: applied.ok && applied.result !== source,
  };
}
