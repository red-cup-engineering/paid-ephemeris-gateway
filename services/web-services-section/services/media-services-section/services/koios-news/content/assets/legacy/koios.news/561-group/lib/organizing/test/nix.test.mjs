import test from "node:test";
import assert from "node:assert/strict";

import {
  NIX_NO_REAL_BINARY_ASSUMPTION,
  closureOf,
  evaluateDerivation,
  nixDerivation,
  nixDerivationCarrier,
  settleDerivation,
  termContentId,
} from "../dist/index.mjs";

const termOf = (value) => ["app", ["lam", ["mark", JSON.stringify(value)]], ["star"]];

test("evaluating a derivation twice settles to the same store hash", () => {
  const derivation = nixDerivation({
    id: "drv:hello",
    name: "hello",
    system: "x86_64-linux",
    term: termOf({ builder: "fixed-output", output: "hello" }),
  });

  assert.equal(nixDerivationCarrier.validate(derivation), true);
  assert.match(NIX_NO_REAL_BINARY_ASSUMPTION, /does not invoke a real nix or guix binary/u);

  const first = evaluateDerivation(derivation);
  const second = evaluateDerivation(derivation);

  assert.equal(first.hash, second.hash);
  assert.equal(first.$id, second.$id);
  assert.equal(first.path, second.path);
});

test("a closure is the settled transitive dependency set", () => {
  const lib = nixDerivation({
    id: "drv:libfoo",
    name: "libfoo",
    term: termOf({ output: "libfoo" }),
  });
  const tool = nixDerivation({
    id: "drv:toolchain",
    name: "toolchain",
    inputIds: [lib.id],
    term: termOf({ output: "toolchain" }),
  });
  const app = nixDerivation({
    id: "drv:app",
    name: "app",
    inputIds: [tool.id],
    term: termOf({ output: "app" }),
  });

  const closure = closureOf(app, [app, tool, lib]);

  assert.deepEqual(closure.storePaths.map((storePath) => storePath.derivationId), [
    "drv:libfoo",
    "drv:toolchain",
    "drv:app",
  ]);
  assert.deepEqual(
    closure.witnesses
      .filter((row) => row.a === "organizing/nix/input")
      .map((row) => [row.e, row.v]),
    [
      ["drv:toolchain", "drv:libfoo"],
      ["drv:app", "drv:toolchain"],
    ],
  );
});

test("the content-addressed store path carries the settled term id", () => {
  const derivation = nixDerivation({
    id: "drv:normal",
    name: "normal",
    term: termOf({ output: "same-normal-form" }),
  });

  const settled = settleDerivation(derivation);

  assert.equal(settled.storePath.$id, termContentId(settled.normalForm));
  assert.equal(settled.storePath.hash, settled.storePath.$id.slice("nix:sha256:".length));
  assert.equal(settled.storePath.path, `/nix/store/${settled.storePath.hash}-normal`);
});
