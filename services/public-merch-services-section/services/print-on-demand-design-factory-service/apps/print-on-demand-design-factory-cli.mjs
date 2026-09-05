#!/usr/bin/env node
// Composed CLI face over the design factory: generate the full corpus (or
// one niche/id) and print corpus stats. Apps compose scripts and src, per
// import stratification law.

import path from "node:path";
import { generateDesign } from "../scripts/generate-design.mjs";
import { generateSetOfDesigns, renderListingsMarkdown } from "../scripts/generate-set-of-designs.mjs";
import { generateImageArt } from "../scripts/generate-image-art.mjs";
import { generateSetOfImageArt, writeImageGenerationReceipt } from "../scripts/generate-set-of-image-art.mjs";
import { CORPUS, NICHES, designsByNiche } from "../src/corpus.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const DEFAULT_OUT_DIR = path.join(import.meta.dirname, "..", "data", "state", "rendered-designs");
const DEFAULT_LISTINGS = path.join(import.meta.dirname, "..", "LISTINGS.md");

function printStats() {
  console.log(`corpus: ${CORPUS.length} designs across ${NICHES.length} niches`);
  for (const niche of NICHES) {
    console.log(`  ${niche}: ${designsByNiche(niche).length}`);
  }
  const productCounts = {};
  for (const spec of CORPUS) {
    for (const p of spec.products) productCounts[p] = (productCounts[p] ?? 0) + 1;
  }
  console.log("product targets:");
  for (const [product, count] of Object.entries(productCounts)) {
    console.log(`  ${product}: ${count}`);
  }
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (!command || command === "stats") {
    printStats();
    return;
  }

  if (command === "id") {
    if (!arg) throw new Error("usage: pod-merch id <design-id>");
    const { filePath } = await generateDesign(arg, DEFAULT_OUT_DIR);
    console.log(`wrote ${filePath}`);
    return;
  }

  if (command === "niche") {
    if (!arg || !NICHES.includes(arg)) {
      throw new Error(`usage: pod-merch niche <${NICHES.join("|")}>`);
    }
    const specs = designsByNiche(arg);
    await generateSetOfDesigns(specs, DEFAULT_OUT_DIR);
    console.log(`rendered ${specs.length} designs for niche "${arg}" to ${DEFAULT_OUT_DIR}`);
    return;
  }

  if (command === "all") {
    await generateSetOfDesigns(CORPUS, DEFAULT_OUT_DIR);
    const markdown = renderListingsMarkdown(CORPUS, {
      svgDir: path.relative(path.join(import.meta.dirname, ".."), DEFAULT_OUT_DIR),
    });
    await mkdir(path.dirname(DEFAULT_LISTINGS), { recursive: true });
    await writeFile(DEFAULT_LISTINGS, markdown, "utf8");
    console.log(`rendered ${CORPUS.length} designs to ${DEFAULT_OUT_DIR}`);
    console.log(`wrote ${DEFAULT_LISTINGS}`);
    return;
  }

  if (command === "art") {
    if (!arg) throw new Error("usage: pod-merch art <design-id> (tries the free Cloudflare Workers AI worker first; API_KEY_GOOGLE_GEMINI / API_KEY_OPENROUTER in env only matter as paid fallbacks)");
    const { imagePath, provenance } = await generateImageArt(arg, { outDir: DEFAULT_OUT_DIR });
    console.log(`wrote ${imagePath} (provider=${provenance.provider} model=${provenance.model})`);
    return;
  }

  if (command === "art-set") {
    if (!arg) throw new Error("usage: pod-merch art-set <comma-separated-ids>");
    const ids = arg.split(",").map((s) => s.trim()).filter(Boolean);
    const results = await generateSetOfImageArt(ids, { outDir: DEFAULT_OUT_DIR });
    const receiptPath = await writeImageGenerationReceipt(
      results,
      path.join(import.meta.dirname, "..", "data", "records")
    );
    for (const r of results) {
      console.log(`${r.designId}: ${r.status}${r.status === "generated" ? ` (${r.provider}/${r.model})` : ` -- ${r.error}`}`);
    }
    console.log(`wrote ${receiptPath}`);
    return;
  }

  throw new Error(
    `unknown command "${command}". commands: stats, all, niche <name>, id <design-id>, art <design-id>, art-set <ids>`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
