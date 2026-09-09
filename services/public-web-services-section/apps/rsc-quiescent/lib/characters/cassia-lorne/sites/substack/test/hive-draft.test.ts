import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildHiveDraft, generatedImagePath } from "../src/hive-draft.ts";

test("uses the stage-one image MIME record to retain a JPEG illustration in the Hive draft", (t) => {
  const imagesRoot = mkdtempSync(join(tmpdir(), "cassia-images-"));
  t.after(() => rmSync(imagesRoot, { recursive: true, force: true }));
  const date = "2026-07-17";
  writeFileSync(join(imagesRoot, `${date}.json`), JSON.stringify({ mimeType: "image/jpeg" }));
  writeFileSync(join(imagesRoot, `${date}.jpg`), "jpeg bytes");

  const imagePath = generatedImagePath(imagesRoot, date);
  assert.equal(imagePath, join(imagesRoot, `${date}.jpg`));
  const draft = buildHiveDraft(date, "---\ntitle: Routine Read — 2026-07-17\n---\n\nA reading.", imagePath);
  assert.equal(draft.imageUploadRequired, true);
  assert.match(draft.body, /TODO: upload .*2026-07-17\.jpg/u);
});
