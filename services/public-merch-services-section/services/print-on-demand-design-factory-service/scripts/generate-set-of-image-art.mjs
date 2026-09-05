#!/usr/bin/env node
// Collection lift over scripts/generate-image-art.mjs: generates real art
// for a set of design specs with a delay between calls (free-tier quota
// courtesy) and writes a dated run receipt naming every attempt's outcome
// and provenance. Imports scripts and src only.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateImageArt } from "./generate-image-art.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateSetOfImageArt(specs, { outDir, delayMs = 1500, ...rest } = {}) {
  const results = [];
  for (const spec of specs) {
    const id = typeof spec === "string" ? spec : spec.id;
    try {
      const result = await generateImageArt(spec, { outDir, ...rest });
      results.push({ designId: id, status: "generated", ...result.provenance });
    } catch (err) {
      results.push({ designId: id, status: "failed", error: err.message });
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  return results;
}

export function buildImageGenerationRunReceipt(results) {
  return {
    type: "PrintOnDemandImageGenerationRun",
    recordedAt: new Date().toISOString(),
    requested: results.length,
    generated: results.filter((r) => r.status === "generated").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}

export async function writeImageGenerationReceipt(results, receiptDir) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const receiptPath = path.join(receiptDir, `${dateStamp}-image-generation-run.json`);
  await mkdir(receiptDir, { recursive: true });
  await writeFile(receiptPath, JSON.stringify(buildImageGenerationRunReceipt(results), null, 2), "utf8");
  return receiptPath;
}

async function main() {
  const idsArg = process.argv[2];
  const outDir =
    process.argv[3] ??
    path.join(import.meta.dirname, "..", "data", "state", "rendered-designs");
  const receiptDir = path.join(import.meta.dirname, "..", "data", "records");

  if (!idsArg) {
    console.error("usage: generate-set-of-image-art.mjs <comma-separated-ids> [outDir]");
    process.exitCode = 1;
    return;
  }
  const ids = idsArg.split(",").map((s) => s.trim()).filter(Boolean);
  const results = await generateSetOfImageArt(ids, { outDir });
  const receiptPath = await writeImageGenerationReceipt(results, receiptDir);

  for (const r of results) {
    console.log(`${r.designId}: ${r.status}${r.status === "generated" ? ` (${r.provider}/${r.model})` : ` -- ${r.error}`}`);
  }
  console.log(`wrote ${receiptPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
