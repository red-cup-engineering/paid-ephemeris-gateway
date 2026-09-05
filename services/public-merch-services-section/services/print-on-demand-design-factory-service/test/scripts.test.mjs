import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateDesign } from "../scripts/generate-design.mjs";
import { generateSetOfDesigns, renderListingsMarkdown } from "../scripts/generate-set-of-designs.mjs";
import { CORPUS, designsByNiche } from "../src/corpus.mjs";
import { renderDesign } from "../src/design-factory.mjs";

test("generateDesign writes the exact renderDesign output to <id>.svg", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-design-"));
  try {
    const spec = CORPUS[0];
    const { filePath } = await generateDesign(spec, dir);
    assert.equal(filePath, path.join(dir, `${spec.id}.svg`));
    const written = await readFile(filePath, "utf8");
    assert.equal(written, renderDesign(spec));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateDesign accepts a bare id string and resolves it against the corpus", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-design-"));
  try {
    const spec = CORPUS[1];
    const { filePath } = await generateDesign(spec.id, dir);
    const written = await readFile(filePath, "utf8");
    assert.equal(written, renderDesign(spec));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateDesign rejects an unknown id", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-design-"));
  try {
    await assert.rejects(() => generateDesign("not-a-real-id", dir), /no design with id/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateSetOfDesigns renders one file per spec", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-design-set-"));
  try {
    const specs = designsByNiche("cat-humor");
    const results = await generateSetOfDesigns(specs, dir);
    assert.equal(results.length, specs.length);
    for (const spec of specs) {
      const written = await readFile(path.join(dir, `${spec.id}.svg`), "utf8");
      assert.equal(written, renderDesign(spec));
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("renderListingsMarkdown includes every design's title, id, svg path, and tags", () => {
  const specs = designsByNiche("gym-humor");
  const markdown = renderListingsMarkdown(specs, { svgDir: "out" });
  for (const spec of specs) {
    assert.ok(markdown.includes(spec.title), spec.id);
    assert.ok(markdown.includes(spec.id), spec.id);
    assert.ok(markdown.includes(`out/${spec.id}.svg`), spec.id);
    for (const tag of spec.tags) assert.ok(markdown.includes(tag), `${spec.id} tag ${tag}`);
  }
});

test("renderListingsMarkdown lists a generated-art line only for poster-targeted designs", () => {
  const specs = designsByNiche("gym-humor");
  const markdown = renderListingsMarkdown(specs, { svgDir: "out" });
  for (const spec of specs) {
    const artLine = `out/${spec.id}-art.png`;
    if (spec.products.includes("poster")) {
      assert.ok(markdown.includes(artLine), `${spec.id} should list its art path`);
    } else {
      assert.ok(!markdown.includes(artLine), `${spec.id} should not list an art path`);
    }
  }
});

test("renderListingsMarkdown groups by niche and only includes niches present in the input", () => {
  const specs = designsByNiche("plant-parent");
  const markdown = renderListingsMarkdown(specs);
  assert.ok(markdown.includes("## plant-parent"));
  assert.ok(!markdown.includes("## cat-humor"));
});
