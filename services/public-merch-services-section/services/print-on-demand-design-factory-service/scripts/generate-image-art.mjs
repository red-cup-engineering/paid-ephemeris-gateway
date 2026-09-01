#!/usr/bin/env node
/**
 * @module generate-image-art -- pod-specific glue over the shared
 * `@red-cup-engineering/image-generation-inference-team` provider-fallback
 * algebra: corpus lookup, the design's art prompt, and design-id-based
 * output naming/provenance. Imports src and the shared package only.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImageWithFallback, buildProvenance } from "@red-cup-engineering/image-generation-inference-team";
import { buildArtPrompt } from "../src/design-factory.mjs";
import { designById } from "../src/corpus.mjs";

const DEFAULT_TARGET_WIDTH_PX = 2400;

/**
 * Generate print-ready art for one design spec via the shared
 * provider-fallback algebra, writing a design-id-named PNG and provenance
 * sidecar to outDir.
 * @param {(string|object)} spec design id, or a full design spec object
 * @param {{outDir:string, targetWidth?:number, providers?:Array<Function>, fetchImpl?:typeof fetch}} opts
 * @returns {Promise<{spec:object, imagePath:string, provenancePath:string, provenance:object}>}
 * @throws {Error} when spec is an unknown design id, or every provider fails
 */
export async function generateImageArt(
  spec,
  { outDir, targetWidth = DEFAULT_TARGET_WIDTH_PX, providers, fetchImpl } = {}
) {
  if (typeof spec === "string") {
    const found = designById(spec);
    if (!found) throw new Error(`no design with id "${spec}" in the corpus`);
    spec = found;
  }
  const prompt = buildArtPrompt(spec);

  const generated = await generateImageWithFallback(prompt, { providers, fetchImpl, targetWidth });

  await mkdir(outDir, { recursive: true });
  const imagePath = path.join(outDir, `${spec.id}-art.png`);
  await writeFile(imagePath, generated.buffer);

  const provenance = {
    designId: spec.id,
    ...buildProvenance({
      provider: generated.provider,
      model: generated.model,
      promptUsed: prompt,
      generatedAt: new Date().toISOString(),
      sourceWidthPx: generated.sourceWidthPx,
      targetWidthPx: generated.targetWidthPx,
      upscaled: generated.upscaled,
      upscaleNote: generated.upscaleNote,
      outputPath: imagePath,
    }),
  };
  const provenancePath = path.join(outDir, `${spec.id}-art.provenance.json`);
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2), "utf8");

  return { spec, imagePath, provenancePath, provenance };
}

async function main() {
  const id = process.argv[2];
  const outDir =
    process.argv[3] ??
    path.join(import.meta.dirname, "..", "data", "state", "rendered-designs");
  if (!id) {
    console.error("usage: generate-image-art.mjs <design-id> [outDir]");
    process.exitCode = 1;
    return;
  }
  const { imagePath, provenance } = await generateImageArt(id, { outDir });
  console.log(`wrote ${imagePath} (provider=${provenance.provider} model=${provenance.model})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
