import { test } from "node:test";
import assert from "node:assert/strict";

import { conceptMapMemory } from "../dist/index.mjs";

const document = (path, title, related) => Object.freeze({
  kind: "knowing.memory.document",
  term: `doc:${path}`,
  path,
  hadFrontMatter: true,
  frontMatter: Object.freeze({ title, related: Object.freeze(related) }),
  body: "",
  genre: Object.freeze({ value: null }),
  findings: Object.freeze([]),
  facts: Object.freeze([]),
  typings: Object.freeze([]),
  utterances: Object.freeze([]),
});

test("conceptMapMemory exposes cyclic concept references as normalized H1 cohomology", () => {
  const memory = Object.freeze({
    kind: "knowing.memory",
    root: "test",
    documents: Object.freeze([
      document("concepts/alpha-one.md", "Alpha One", ["alpha-two"]),
      document("concepts/alpha-two.md", "Alpha Two", ["alpha-three"]),
      document("concepts/alpha-three.md", "Alpha Three", ["alpha-one"]),
    ]),
    utterances: Object.freeze([]),
  });

  const map = conceptMapMemory(memory, "alpha");

  assert.equal(map.kind, "knowing.memory.concept-map");
  assert.equal(map.nodes.length, 3);
  assert.equal(map.edgeCount, 3);
  assert.equal(map.cohomology.kind, "knowing.memory.concept-map.cohomology");
  assert.equal(map.cohomology.nodes, map.nodes.length);
  assert.equal(map.cohomology.edges, map.edgeCount);
  assert.equal(map.cohomology.h1, 1, "three concept references form one unresolved dependency loop");
  assert.equal(map.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(map.cohomology.laplacian.kind, "predication.cohomology.laplacian");
  assert.equal(map.cohomology.laplacian.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
});
