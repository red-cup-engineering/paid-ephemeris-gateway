import { test } from "node:test";
import assert from "node:assert/strict";

import {
  actions,
  markdownSemanticLinefeedText,
  normalizeMarkdownLinefeeds,
  normalizeMarkdownLinefeedsAction,
} from "../dist/index.mjs";

test("markdownSemanticLinefeedText unwraps column prose into semantic lines", () => {
  assert.equal(
    markdownSemanticLinefeedText("Alpha beta wraps across\nan arbitrary column. Gamma follows.\n"),
    "Alpha beta wraps across an arbitrary column.\nGamma follows.\n",
  );
});

test("normalizeMarkdownLinefeeds reports the knowing memory normal form carrier", () => {
  const result = normalizeMarkdownLinefeeds("Alpha wraps\nacross a column. Beta follows.\n", {
    path: "notes/alpha.md",
  });

  assert.equal(result.kind, "knowing.memory.markdown-normalization");
  assert.equal(result.normalForm, "semantic-linefeeds");
  assert.equal(result.changed, true);
  assert.equal(result.path, "notes/alpha.md");
  assert.equal(result.text, "Alpha wraps across a column.\nBeta follows.\n");
  assert.equal(result.findings[0]?.rule, "semantic-linefeeds");
});

test("normalize-markdown-linefeeds action is registered on knowing's action apex", () => {
  assert.ok(actions.some((candidate) => candidate.verb === "normalize-markdown-linefeeds"));

  const result = normalizeMarkdownLinefeedsAction.run({
    text: "Alpha wraps\nacross a column. Beta follows.\n",
    path: "notes/alpha.md",
  }, {});

  assert.equal(result.kind, "knowing.memory.markdown-normalization");
  assert.equal(result.changed, true);
  assert.equal(result.text, "Alpha wraps across a column.\nBeta follows.\n");
  assert.equal(result.path, "notes/alpha.md");
});
