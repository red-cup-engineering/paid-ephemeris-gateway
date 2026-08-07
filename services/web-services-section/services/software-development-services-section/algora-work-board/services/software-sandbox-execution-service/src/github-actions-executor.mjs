// GitHub Actions carrier for the sandbox-execution die. Bounty code is tested inside a
// disposable GitHub Actions runner (isolated, ephemeral, no secrets exposed to job code) —
// never on the Leader's machine. Repo READS (file list, contents, for context) go through the
// GitHub API and execute nothing. Only test-running touches the sandbox.
//
// Setup required (human/infra, refuses clearly until present):
//   - a RUNNER repo you control, with .github/workflows/solve-and-test.yml installed
//   - the hired GitHub provider configured with repo-read, gist, and Actions authority
//   - an explicit `runnerRepo` and API instance supplied by the caller.
import { mentionedPaths } from "@red-cup-engineering/coding-context-projection-service";
import { githubApi } from "@red-cup-engineering/github-services-section";
import { randomUUID } from "node:crypto";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollRun(api, runnerRepo, workflowFile, correlationId, { maxPolls = 60, pollMs = 5000, wait = sleep } = {}) {
  for (let i = 0; i < maxPolls; i++) {
    const runs = await api.listRuns(runnerRepo, workflowFile);
    const run = runs.find((candidate) => candidate.displayTitle === `solve-and-test-${correlationId}`);
    if (run && run.status === "completed") return run;
    await wait(pollMs);
  }
  throw new Error("sandbox run did not complete within the poll budget");
}

export function githubActionsExecutor(config = {}) {
  // This library is deliberately not a public invocation boundary.  A caller
  // must name its carrier explicitly; reading a host environment here would
  // silently turn a local shell into an authority source.
  const runnerRepo = config.runnerRepo;
  const workflowFile = config.workflowFile || "solve-and-test.yml";
  const runnerRef = config.runnerRef || "main";
  const api = config.api || (runnerRepo ? githubApi() : null);
  const configured = Boolean(runnerRepo && api);

  const requireConfig = () => {
    if (!configured) {
      throw new Error("github-actions executor unconfigured: supply runnerRepo and a configured hired GitHub provider");
    }
  };

  return {
    name: "github-actions",
    async prepare(repo) {
      requireConfig();
      const meta = await api.getRepo(repo);
      const ref = meta.default_branch;
      const files = await api.getTree(repo, ref);
      return { repo, ref, files, patch: null };
    },
    async buildContext(handle, { task, failures = [] }) {
      const hint = `${task?.title || ""}\n${task?.body || ""}\n${failures.map((f) => f.test || f.apply || "").join("\n")}`;
      const focus = mentionedPaths(hint, handle.files);
      const excerpts = {};
      for (const f of focus.slice(0, 6)) {
        try { excerpts[f] = (await api.getContent(handle.repo, handle.ref, f)).slice(0, 6000); } catch { /* unreadable */ }
      }
      return { task, focusFiles: focus, excerpts, failures, repoFileCount: handle.files.length };
    },
    // Stage the patch; it is actually applied inside the sandbox at test time.
    async applyPatch(handle, patch) {
      if (typeof patch !== "string" || patch.trim().length === 0) return { ok: false, error: "patch candidate is empty" };
      handle.patch = patch;
      return { ok: true };
    },
    async runTests(handle) {
      requireConfig();
      if (typeof handle.patch !== "string" || handle.patch.trim().length === 0) throw new Error("sandbox execution requires a staged nonempty patch");
      const correlationId = randomUUID();
      const gist = await api.createGist({ "patch.diff": handle.patch });
      try {
        await api.dispatchWorkflow(runnerRepo, workflowFile, runnerRef, {
          target_repo: handle.repo,
          target_ref: handle.ref,
          patch_url: gist.rawUrl,
          correlation_id: correlationId,
        });
        const run = await pollRun(api, runnerRepo, workflowFile, correlationId, config);
        return await api.getRunResult(runnerRepo, run.id);
      } finally {
        await api.deleteGist(gist.id).catch(() => {});
      }
    },
    async dispose() {},
  };
}
