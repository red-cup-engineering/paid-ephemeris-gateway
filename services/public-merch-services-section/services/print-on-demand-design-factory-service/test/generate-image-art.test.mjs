import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateImageArt } from "../scripts/generate-image-art.mjs";
import { generateSetOfImageArt } from "../scripts/generate-set-of-image-art.mjs";
import { CORPUS } from "../src/corpus.mjs";

// Real 1x1 PNG bytes, so the sharp upscale path runs against a genuine image.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("generateImageArt tries Cloudflare Workers AI first by default", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-art-"));
  try {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ model: "@cf/black-forest-labs/flux-1-schnell", imageBase64: TINY_PNG_BASE64, mimeType: "image/jpeg" }),
    });
    const { provenance } = await generateImageArt(CORPUS[0], { outDir: dir, fetchImpl, targetWidth: 64 });
    assert.equal(provenance.provider, "cloudflare-workers-ai");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateImageArt falls back to the next provider on failure, writes image + provenance, and upscales", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-art-"));
  try {
    async function simulatedFailingProvider() {
      throw new Error("simulated provider outage");
    }
    async function simulatedSucceedingProvider() {
      return {
        provider: "test-provider",
        model: "test-model",
        base64: TINY_PNG_BASE64,
        mimeType: "image/png",
      };
    }
    const failing = simulatedFailingProvider;
    const succeeding = simulatedSucceedingProvider;

    const spec = CORPUS[0];
    const { imagePath, provenancePath, provenance } = await generateImageArt(spec, {
      outDir: dir,
      providers: [failing, succeeding],
      targetWidth: 64,
    });

    assert.equal(imagePath, path.join(dir, `${spec.id}-art.png`));
    const imageBytes = await readFile(imagePath);
    assert.ok(imageBytes.length > 0);

    assert.equal(provenance.provider, "test-provider");
    assert.equal(provenance.model, "test-model");
    assert.equal(provenance.designId, spec.id);
    assert.equal(provenance.upscaled, true);
    assert.equal(provenance.sourceWidthPx, 1);
    assert.ok(provenance.promptUsed.includes(spec.phrase));

    const writtenProvenance = JSON.parse(await readFile(provenancePath, "utf8"));
    assert.deepEqual(writtenProvenance, provenance);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateImageArt throws an aggregated error when every provider fails", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-art-"));
  try {
    const alwaysFails = async () => {
      throw new Error("nope");
    };
    await assert.rejects(
      () => generateImageArt(CORPUS[0], { outDir: dir, providers: [alwaysFails] }),
      /all image providers failed/
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("generateSetOfImageArt records one result per id, generated and failed alike", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "pod-art-set-"));
  try {
    const succeeding = async () => ({
      provider: "test-provider",
      model: "test-model",
      base64: TINY_PNG_BASE64,
      mimeType: "image/png",
    });
    const alwaysFails = async () => {
      throw new Error("nope");
    };

    const results = await generateSetOfImageArt([CORPUS[0].id, "not-a-real-id"], {
      outDir: dir,
      delayMs: 0,
      providers: [succeeding],
    });

    assert.equal(results.length, 2);
    assert.equal(results[0].status, "generated");
    assert.equal(results[1].status, "failed");
    assert.match(results[1].error, /no design with id/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
