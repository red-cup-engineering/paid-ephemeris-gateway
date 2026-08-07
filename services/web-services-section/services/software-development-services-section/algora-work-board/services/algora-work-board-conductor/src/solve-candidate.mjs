// Conduct one qualified candidate through hired synthesis and sandbox dies.
// Inference is hired through this settlement's signed-provider market. Refuses to run wet without an executor.
import { solveLoop } from "@red-cup-engineering/software-solve-loop-service";
import { complete, contractRefinementCandidate, extractDiff } from "@rsc-quiescent/software-patch-synthesis-service/inference-client";

// Customer-owned market patch generator. Context (focus files, prior failures) is the lever.
export function makeGeneratePatch() {
  return async (ctx) => {
    const files = Object.entries(ctx.excerpts || {}).map(([f, c]) => `FILE ${f}:\n${c}`).join("\n\n");
    const failures = (ctx.failures || []).map((f) => f.test || f.apply).filter(Boolean).slice(-2).join("\n");
    const text = await complete({
      messages: [
        { role: "system", content: "You are a software engineer. Output ONLY a git-apply-able unified diff in a ```diff block that makes the repository's tests pass. No prose." },
        { role: "user", content: `TASK: ${ctx.task.title || ""}\n${ctx.task.body || ""}\n\nFILES:\n${files}\n\n${failures ? `PRIOR FAILED ATTEMPTS:\n${failures}` : ""}` },
      ],
      maxTokens: 2048,
    });
    const patch = extractDiff(text);
    return patch ? { patch } : null;
  };
}

export async function solveCandidate(
  candidate,
  analysis = {},
  { executor, maxFreeRounds = 4, dryRun = false, generatePatch } = {}
) {
  if (dryRun) return { status: "skipped", solvedBy: null, note: "dry run" };
  if (!executor) {
    return { status: "refused", solvedBy: null, note: "no executor: refusing to run bounty code without a sandbox (laptop execution is not a default)" };
  }
  let handle;
  try {
    handle = await executor.prepare(candidate.repo);
    const res = await solveLoop({
      workdir: handle,
      task: { title: candidate.title, body: candidate.body },
      buildContext: ({ task, failures }) => executor.buildContext(handle, { task, failures }),
      generatePatch: generatePatch || makeGeneratePatch(),
      applyPatch: (_workdir, patch) => executor.applyPatch(handle, patch),
      runTests: () => executor.runTests(handle),
      refine: contractRefinementCandidate,
      difficulty: analysis.difficulty ?? null,
      maxFreeRounds,
    });
    return { status: res.status, solvedBy: res.solvedBy, freeRounds: res.freeRounds };
  } catch (e) {
    return { status: "failed", solvedBy: null, note: e.message };
  } finally {
    if (handle && executor.dispose) await executor.dispose(handle);
  }
}
