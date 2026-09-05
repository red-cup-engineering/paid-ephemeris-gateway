#!/usr/bin/env node
// Verb script: render one design spec to a print-ready SVG file.
// Imports src (design-factory) only, per import stratification law.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDesign } from "../src/design-factory.mjs";
import { designById } from "../src/corpus.mjs";

export async function generateDesign(spec, outDir) {
  if (typeof spec === "string") {
    const found = designById(spec);
    if (!found) throw new Error(`no design with id "${spec}" in the corpus`);
    spec = found;
  }
  const svg = renderDesign(spec);
  await mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, `${spec.id}.svg`);
  await writeFile(filePath, svg, "utf8");
  return { spec, filePath, svg };
}

async function main() {
  const id = process.argv[2];
  const outDir =
    process.argv[3] ??
    path.join(import.meta.dirname, "..", "data", "state", "rendered-designs");
  if (!id) {
    console.error("usage: generate-design.mjs <design-id> [outDir]");
    process.exitCode = 1;
    return;
  }
  const { filePath } = await generateDesign(id, outDir);
  console.log(`wrote ${filePath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
