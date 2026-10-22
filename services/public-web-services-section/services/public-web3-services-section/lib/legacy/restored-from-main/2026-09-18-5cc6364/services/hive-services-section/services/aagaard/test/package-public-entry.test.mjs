import assert from "node:assert/strict";
import test from "node:test";

test("published root entry resolves to emitted JavaScript", async () => {
  const entry = await import("@red-cup-engineering/aagaard");
  assert.equal(typeof entry.createAagaardRuntime, "function");
});
