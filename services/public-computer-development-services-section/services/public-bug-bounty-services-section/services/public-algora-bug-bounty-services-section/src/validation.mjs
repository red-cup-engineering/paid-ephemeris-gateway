import { spawnSync } from "node:child_process";
import { extname, resolve } from "node:path";

export function checkSyntax(file) {
  const path = resolve(file);
  const extension = extname(path);
  if (![".js", ".mjs", ".cjs"].includes(extension)) return { path, ok: true, skipped: true };
  const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
  return { path, ok: result.status === 0, error: result.status === 0 ? null : result.stderr.trim() };
}

/** Run an explicit project test command; it is never guessed from package metadata. */
export function runTests(directory, command, args = []) {
  if (!command) return { ok: true, skipped: true, output: "no test command supplied" };
  const result = spawnSync(command, args, { cwd: directory, encoding: "utf8" });
  return { ok: result.status === 0, skipped: false, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
}

export function testSummary(output) {
  const text = String(output ?? "");
  const count = (name) => Number(new RegExp(`(?:#\\s*)?${name}\\s+(\\d+)`, "i").exec(text)?.[1] ?? 0);
  return { passed: count("pass"), failed: count("fail") };
}

export function compareTestRuns(before, after) {
  if (!before.ok) return { verdict: "inconclusive", reason: "baseline test command failed" };
  if (!after.ok) return { verdict: "regression", reason: "patched test command failed" };
  const base = testSummary(before.output), patched = testSummary(after.output);
  if (patched.failed < base.failed) return { verdict: "improved", reason: `failures ${base.failed} → ${patched.failed}` };
  return { verdict: "no-regression", reason: "the supplied test command still passes" };
}
