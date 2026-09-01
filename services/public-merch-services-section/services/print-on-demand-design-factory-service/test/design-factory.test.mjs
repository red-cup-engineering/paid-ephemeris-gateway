import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escapeXml,
  wrapText,
  validateDesign,
  renderDesign,
  buildArtPrompt,
  NICHE_ART_STYLES,
  LAYOUTS,
  COLORWAYS,
  CANVAS,
} from "../src/design-factory.mjs";

test("escapeXml escapes the five XML special characters", () => {
  assert.equal(escapeXml(`<a & "b" 'c'>`), "&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;");
});

test("wrapText keeps words intact and respects the character budget", () => {
  const lines = wrapText("one two three four five", 9);
  for (const line of lines) assert.ok(line.length <= 9 || !line.includes(" "));
  assert.equal(lines.join(" "), "one two three four five");
});

test("wrapText never drops a word", () => {
  const words = "a b c d e f g h".split(" ");
  const lines = wrapText(words.join(" "), 3);
  assert.equal(lines.join(" ").split(" ").length, words.length);
});

const baseSpec = {
  id: "test-01-example",
  niche: "programmer-humor",
  phrase: "Test Phrase",
  layout: "stacked-bold",
  colorway: "mono-black",
  title: "Test Title",
  description: "A test description.",
  tags: ["tag one"],
  products: ["shirt"],
};

test("validateDesign accepts a well-formed spec", () => {
  assert.deepEqual(validateDesign({ ...baseSpec }), { ...baseSpec });
});

test("validateDesign rejects a missing required field", () => {
  const { title, ...rest } = baseSpec;
  assert.throws(() => validateDesign(rest), /missing required field: title/);
});

test("validateDesign rejects an unknown layout", () => {
  assert.throws(() => validateDesign({ ...baseSpec, layout: "spiral" }), /unknown layout/);
});

test("validateDesign rejects an unknown colorway", () => {
  assert.throws(() => validateDesign({ ...baseSpec, colorway: "neon" }), /unknown colorway/);
});

test("validateDesign rejects more than 13 tags", () => {
  const tags = Array.from({ length: 14 }, (_, i) => `tag ${i}`);
  assert.throws(() => validateDesign({ ...baseSpec, tags }), /13-tag/);
});

test("renderDesign produces a well-formed SVG document for every layout", () => {
  for (const layout of LAYOUTS) {
    const svg = renderDesign({
      ...baseSpec,
      id: `test-${layout}`,
      layout,
      subphrase: "sub phrase",
    });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, new RegExp(`viewBox="0 0 ${CANVAS.width} ${CANVAS.height}"`));
    assert.match(svg, /<\/svg>$/);
  }
});

test("renderDesign is deterministic", () => {
  const a = renderDesign({ ...baseSpec });
  const b = renderDesign({ ...baseSpec });
  assert.equal(a, b);
});

test("every colorway resolves to valid fill values", () => {
  for (const [name, c] of Object.entries(COLORWAYS)) {
    assert.ok(c.fg.startsWith("#"), `${name} fg`);
    assert.ok(c.accent.startsWith("#"), `${name} accent`);
  }
});

test("buildArtPrompt composes the niche style, the phrase, and the safety clause", () => {
  const prompt = buildArtPrompt({ ...baseSpec, niche: "cat-humor", phrase: "Owned By A Cat", subphrase: "since day one" });
  assert.ok(prompt.includes(NICHE_ART_STYLES["cat-humor"]));
  assert.ok(prompt.includes("Owned By A Cat"));
  assert.ok(prompt.includes("since day one"));
  assert.match(prompt, /No text, letters, or numbers/);
  assert.match(prompt, /No logos, no brand names, no trademarked characters, no real people/);
});

test("buildArtPrompt respects an explicit spec.artPrompt override", () => {
  const prompt = buildArtPrompt({ ...baseSpec, artPrompt: "a bespoke hand-authored prompt" });
  assert.equal(prompt, "a bespoke hand-authored prompt");
});

test("buildArtPrompt throws for a niche with no declared art style", () => {
  assert.throws(() => buildArtPrompt({ ...baseSpec, niche: "not-a-real-niche" }), /no art style declared/);
});

test("every declared niche in NICHE_ART_STYLES has a non-empty style string", () => {
  for (const [niche, style] of Object.entries(NICHE_ART_STYLES)) {
    assert.ok(style.length > 10, niche);
  }
});
