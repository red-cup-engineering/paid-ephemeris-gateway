import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { staticCheckPath, duplicateImportLines } from "@red-cup-engineering/software-static-verification-service";
import { grepRepo, listFiles, readRepoFile } from "@red-cup-engineering/repository-material-observation-service";
import { issueKeywords, locateFiles } from "../src/explore-and-solve.mjs";

function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), "fix-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "authService.js"), "export function registerUser(p){\n  return { id: `usr_${Date.now()}` };\n}\n");
  writeFileSync(join(dir, "README.md"), "# freelanceflow\n");
  return dir;
}

test("static-check: valid JS parses, broken JS fails, WITHOUT executing", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-"));
  const good = join(dir, "g.mjs"); writeFileSync(good, "export const x = 1;\n");
  const bad = join(dir, "b.mjs"); writeFileSync(bad, "export const x = ;\n");
  assert.equal(staticCheckPath(good).ok, true);
  assert.equal(staticCheckPath(bad).ok, false);
});

test("static-check: catches duplicate imports (the defect that slipped through)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sc-"));
  const f = join(dir, "d.mjs");
  writeFileSync(f, 'import { a } from "./a.js";\nimport { a } from "./a.js";\nexport const y = a;\n');
  const r = staticCheckPath(f);
  assert.equal(r.ok, false);
  assert.ok(r.checks.some((c) => c.check === "duplicate-imports"));
  assert.equal(duplicateImportLines('import x from "y";\nimport x from "y";').length, 1);
});

test("repo-workspace: grep locates code, list and read work (no execution)", () => {
  const dir = fixtureRepo();
  const hits = grepRepo(dir, "registerUser", { literal: true });
  assert.ok(hits.some((h) => h.startsWith("src/authService.js")));
  assert.ok(listFiles(dir).includes("src/authService.js"));
  assert.match(readRepoFile(dir, "src/authService.js"), /registerUser/);
});

test("locate: explicit filename in the issue wins", () => {
  const dir = fixtureRepo();
  assert.deepEqual(locateFiles(dir, "bug in src/authService.js registration"), ["src/authService.js"]);
});

test("locate: falls back to keyword grep when no filename is named", () => {
  const dir = fixtureRepo();
  const located = locateFiles(dir, "the registerUser function returns a duplicated identifier");
  assert.ok(located.includes("src/authService.js"));
  assert.ok(issueKeywords("the registerUser function").includes("registerUser"));
});
