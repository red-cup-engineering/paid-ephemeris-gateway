import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { observeRepositoryMaterial } from "../src/repo-workspace.mjs";

function request(root, projection = { kind: "manifest", carrier: "inline" }) {
  return {
    type: "RepositoryMaterialObservationRequest",
    source: { kind: "local-directory", root },
    projection,
    traversalPolicy: { excludedDirectoryNames: ["excluded"] },
  };
}

test("observes the complete admitted denominator without following symbolic links", async () => {
  const root = mkdtempSync(join(tmpdir(), "repository-observation-"));
  try {
    mkdirSync(join(root, "excluded"));
    writeFileSync(join(root, "README.md"), "observed\n");
    writeFileSync(join(root, "excluded", "secret"), "not admitted\n");
    symlinkSync("/etc/passwd", join(root, "outside"));
    const result = await observeRepositoryMaterial(request(root), { appendReceipt: false });
    assert.equal(result.type, "RepositoryMaterialObservation");
    assert.equal(result.denominator.completeness, "source-minus-declared-exclusions");
    assert.deepEqual(result.denominator.excluded, [{ path: "excluded", reason: "caller-supplied-directory-exclusion", name: "excluded" }]);
    assert.equal(result.projection.files[0].path, "README.md");
    assert.equal(result.projection.links[0].path, "outside");
    assert.equal(result.resourceObservation.authority, "measured-resource-use-does-not-authorize-a-ceiling");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("artifact carrier remains valid when the selected projection has zero records", async () => {
  const root = mkdtempSync(join(tmpdir(), "repository-observation-empty-"));
  const dataRoot = mkdtempSync(join(tmpdir(), "repository-observation-data-"));
  try {
    writeFileSync(join(root, "README.md"), "observed\n");
    const result = await observeRepositoryMaterial(request(root, {
      kind: "matching-lines", carrier: "artifact", pattern: "absent", patternKind: "literal",
      pathPattern: ".*", caseSensitive: true,
    }), { appendReceipt: false, dataRoot });
    assert.equal(result.type, "RepositoryMaterialObservation");
    assert.equal(result.projection.artifact.records, "0");
    assert.equal(readFileSync(result.projection.artifact.path, "utf8"), "");
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
