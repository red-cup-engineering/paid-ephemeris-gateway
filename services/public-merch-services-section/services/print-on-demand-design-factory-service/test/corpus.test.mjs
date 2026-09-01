import { test } from "node:test";
import assert from "node:assert/strict";
import { CORPUS, NICHES, designsByNiche, designById } from "../src/corpus.mjs";
import { validateDesign } from "../src/design-factory.mjs";

// Lightweight IP-safety guard: known trademarked/franchise/brand terms that
// must never appear in an original design's text. Not exhaustive -- the
// corpus is hand-written to avoid IP entirely; this is a cheap regression
// net, not the compliance check itself.
const BANNED_TERMS = [
  "nike", "disney", "pokemon", "pokémon", "marvel", "star wars", "nintendo",
  "harry potter", "taylor swift", "coca-cola", "coca cola", "adidas",
  "minecraft", "fortnite", "pixar", "warner bros", "hbo", "netflix",
];

test("corpus has at least 30 designs", () => {
  assert.ok(CORPUS.length >= 30, `expected >= 30, got ${CORPUS.length}`);
});

test("corpus spans 4-6 niches, all declared in NICHES", () => {
  assert.ok(NICHES.length >= 4 && NICHES.length <= 6);
  const used = new Set(CORPUS.map((d) => d.niche));
  for (const niche of used) assert.ok(NICHES.includes(niche), `undeclared niche: ${niche}`);
});

test("every niche has at least 5 designs", () => {
  for (const niche of NICHES) {
    const count = designsByNiche(niche).length;
    assert.ok(count >= 5, `${niche} has only ${count} designs`);
  }
});

test("design ids are unique", () => {
  const ids = CORPUS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every design validates against the design-factory contract", () => {
  for (const spec of CORPUS) {
    assert.doesNotThrow(() => validateDesign(spec), spec.id);
  }
});

test("designById finds every id in the corpus and nothing else", () => {
  for (const spec of CORPUS) {
    assert.equal(designById(spec.id), spec);
  }
  assert.equal(designById("does-not-exist"), undefined);
});

test("no design text contains a banned trademark/franchise term", () => {
  for (const spec of CORPUS) {
    const haystack = [spec.title, spec.phrase, spec.subphrase ?? "", spec.description, ...spec.tags]
      .join(" ")
      .toLowerCase();
    for (const term of BANNED_TERMS) {
      assert.ok(!haystack.includes(term), `${spec.id} contains banned term "${term}"`);
    }
  }
});

test("at least one design per niche has a poster target for the generated-art lane", () => {
  for (const niche of NICHES) {
    const withPoster = designsByNiche(niche).filter((d) => d.products.includes("poster"));
    assert.ok(withPoster.length >= 1, `${niche} has no poster-targeted design`);
  }
});

test("every design targets at least one real product type", () => {
  const allowed = new Set(["shirt", "mug", "sticker", "poster"]);
  for (const spec of CORPUS) {
    assert.ok(spec.products.length > 0, spec.id);
    for (const p of spec.products) assert.ok(allowed.has(p), `${spec.id} has unknown product ${p}`);
  }
});
