import { test } from "node:test";
import assert from "node:assert/strict";
import { badgeClass, badgeText, formatNumber, formatPercent, taggedNumber } from "../js/format.mjs";

test("formatNumber fixes decimals and normalizes negative zero to 0", () => {
  assert.equal(formatNumber(1.23456, 2), "1.23");
  assert.equal(formatNumber(-0, 2), "0.00");
});

test("formatNumber spells out non-finite values rather than printing raw Infinity/NaN", () => {
  assert.equal(formatNumber(Infinity), "unbounded");
  assert.equal(formatNumber(-Infinity), "unbounded (negative)");
  assert.equal(formatNumber(NaN), "undefined (NaN)");
});

test("formatPercent scales by 100 and appends %", () => {
  assert.equal(formatPercent(0.5), "50.0%");
  assert.equal(formatPercent(1), "100.0%");
});

test("badgeClass/badgeText map the two real provenance.mts values", () => {
  assert.equal(badgeClass("computed-from-your-graph"), "badge badge--computed");
  assert.equal(badgeClass("designed-flavor"), "badge badge--authored");
  assert.equal(badgeText("computed-from-your-graph"), "computed");
  assert.equal(badgeText("designed-flavor"), "authored");
});

test("badgeClass/badgeText throw on any other value — a third provenance would be a real bug, not a silent default", () => {
  assert.throws(() => badgeClass("something-else"), TypeError);
  assert.throws(() => badgeText("something-else"), TypeError);
});

test("taggedNumber renders a Tagged<number> as {text, cls, badge, title} without dropping provenance", () => {
  const tagged = { value: 1.6180339887, provenance: "computed-from-your-graph", label: "power iteration over your graph" };
  const rendered = taggedNumber(tagged, 3);
  assert.equal(rendered.text, "1.618");
  assert.equal(rendered.cls, "badge badge--computed");
  assert.equal(rendered.badge, "computed");
  assert.equal(rendered.title, "power iteration over your graph");
});
