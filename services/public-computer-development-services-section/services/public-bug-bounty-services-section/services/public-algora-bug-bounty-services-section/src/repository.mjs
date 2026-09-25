import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  return { ok: result.status === 0, stdout: result.stdout ?? "", stderr: result.stderr ?? "", status: result.status };
}

/** A checked-out repository and the facts needed to work on it. */
export class RepositoryWorkspace {
  constructor(directory) {
    this.directory = resolve(directory);
    if (!existsSync(this.directory)) throw new Error(`directory does not exist: ${this.directory}`);
    this.remote = run("git", ["-C", this.directory, "config", "--get", "remote.origin.url"]).stdout.trim() || null;
    this.branch = run("git", ["-C", this.directory, "branch", "--show-current"]).stdout.trim() || null;
    Object.freeze(this);
  }

  status() { return run("git", ["-C", this.directory, "status", "--short"]).stdout.split("\n").filter(Boolean); }
  package() {
    const path = join(this.directory, "package.json");
    if (!existsSync(path)) return null;
    const value = JSON.parse(readFileSync(path, "utf8"));
    return { name: value.name ?? null, scripts: value.scripts ?? {} };
  }
}

/** Clone only when the caller explicitly asks for a disposable workspace. */
export function cloneRepository(url, { directory = mkdtempSync(join(tmpdir(), "algora-")), branch } = {}) {
  const args = ["clone", "--depth", "1"];
  if (branch) args.push("--branch", branch);
  args.push(url, directory);
  const result = run("git", args);
  if (!result.ok) throw new Error(`git clone failed: ${result.stderr.trim()}`);
  return new RepositoryWorkspace(directory);
}

export function applyPatch(workspace, patch) {
  const result = run("git", ["-C", workspace.directory, "apply", "--whitespace=error-all", "-"], { input: patch });
  return { applied: result.ok, error: result.ok ? null : result.stderr.trim() };
}
