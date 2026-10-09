import { spawn } from "node:child_process";

function runGh(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ ok: code === 0, output: `${stdout}${stderr}`.trim() }));
  });
}

/**
 * A real GitHub Actions adapter. The caller chooses an existing workflow and ref;
 * this function only dispatches it through the authenticated GitHub CLI.
 */
export async function dispatchGitHubAction({ repository, workflow, ref = "main", inputs = {} }, { run = runGh } = {}) {
  if (!/^.+\/.+$/.test(repository ?? "")) throw new TypeError("repository must be owner/name");
  if (!workflow) throw new TypeError("workflow is required");
  const args = ["workflow", "run", workflow, "--repo", repository, "--ref", ref];
  for (const [name, value] of Object.entries(inputs)) args.push("--raw-field", `${name}=${value}`);
  return run(args);
}
