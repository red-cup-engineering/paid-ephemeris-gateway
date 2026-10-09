import { applyPatch } from "./repository.mjs";
import { compareTestRuns, runTests } from "./validation.mjs";

/** Ask a caller-provided patch author for a unified diff against a known workspace. */
export async function proposePatch(author, { bounty, workspace, instructions = "" }) {
  if (typeof author !== "function") throw new TypeError("a patch author function is required");
  const patch = await author(Object.freeze({ bounty, workspace: { directory: workspace.directory, remote: workspace.remote, branch: workspace.branch }, instructions }));
  if (typeof patch !== "string" || !patch.includes("diff --git")) throw new TypeError("patch author must return a unified git diff");
  return patch;
}

/**
 * Apply and validate a patch proposed by a caller. Patch generation belongs to the
 * caller because this program can safely verify a diff but cannot safely invent one.
 */
export function validatePatch(workspace, { patch, testCommand, testArgs = [] }) {
  const before = runTests(workspace.directory, testCommand, testArgs);
  const applied = applyPatch(workspace, patch);
  if (!applied.applied) return { status: "failed", applied, before, after: null, verdict: { verdict: "patch-does-not-apply", reason: applied.error } };
  const after = runTests(workspace.directory, testCommand, testArgs);
  return { status: after.ok ? "attempted" : "failed", applied, before, after, verdict: compareTestRuns(before, after) };
}

export async function solveBounty(author, workspace, request) {
  const patch = await proposePatch(author, { ...request, workspace });
  return { patch, ...validatePatch(workspace, { ...request, patch }) };
}

/**
 * Delegate remote execution to an explicitly supplied adapter. An adapter can use
 * GitHub Actions, another CI provider, or a local isolated runner; this code owns
 * neither credentials nor publication.
 */
export async function executeRemotely(executor, request) {
  if (typeof executor !== "function") throw new TypeError("a remote executor function is required");
  const result = await executor(Object.freeze({ ...request }));
  if (!result || typeof result.ok !== "boolean") throw new TypeError("executor must return { ok, output? }");
  return result;
}
