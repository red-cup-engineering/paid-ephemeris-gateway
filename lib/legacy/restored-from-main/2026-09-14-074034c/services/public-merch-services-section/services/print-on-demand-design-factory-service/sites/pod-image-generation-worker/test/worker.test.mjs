import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRequestBody, describeAiResult } from "../src/worker.mjs";

test("parseRequestBody requires an object body", () => {
  assert.throws(() => parseRequestBody(null), /invalid JSON body/);
  assert.throws(() => parseRequestBody("nope"), /invalid JSON body/);
});

test("parseRequestBody requires a non-empty string prompt", () => {
  assert.throws(() => parseRequestBody({}), /prompt \(string\) is required/);
  assert.throws(() => parseRequestBody({ prompt: "" }), /prompt \(string\) is required/);
  assert.throws(() => parseRequestBody({ prompt: 5 }), /prompt \(string\) is required/);
});

test("parseRequestBody defaults to the flux-1-schnell model", () => {
  const parsed = parseRequestBody({ prompt: "a red circle" });
  assert.equal(parsed.prompt, "a red circle");
  assert.equal(parsed.model, "@cf/black-forest-labs/flux-1-schnell");
});

test("parseRequestBody honors an explicit model", () => {
  const parsed = parseRequestBody({ prompt: "a red circle", model: "@cf/stabilityai/stable-diffusion-xl-base-1.0" });
  assert.equal(parsed.model, "@cf/stabilityai/stable-diffusion-xl-base-1.0");
});

test("describeAiResult recognizes the flux-style {image: base64} shape", () => {
  const described = describeAiResult({ image: "QUJD" }, "@cf/black-forest-labs/flux-1-schnell");
  assert.equal(described.kind, "json");
  assert.equal(described.imageBase64, "QUJD");
  assert.equal(described.mimeType, "image/jpeg");
});

test("describeAiResult recognizes a raw binary result", () => {
  const described = describeAiResult(new Uint8Array([1, 2, 3]), "@cf/stabilityai/stable-diffusion-xl-base-1.0");
  assert.equal(described.kind, "binary");
  assert.equal(described.mimeType, "image/png");
});

test("describeAiResult rejects an unrecognized result shape", () => {
  assert.throws(() => describeAiResult({ nope: true }, "x"), /unrecognized AI\.run result shape/);
});
