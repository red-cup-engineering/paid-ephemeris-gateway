#!/usr/bin/env node
// Collection lift over scripts/generate-design.mjs: renders a set of design
// specs (the whole corpus by default, or one niche) to SVG files, and writes
// the LISTINGS.md manifest mapping every design to its ready listing copy.
// Imports scripts and src only, per import stratification law.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateDesign } from "./generate-design.mjs";
import { CORPUS, NICHES, designsByNiche } from "../src/corpus.mjs";

export async function generateSetOfDesigns(specs, outDir) {
  const results = [];
  for (const spec of specs) {
    results.push(await generateDesign(spec, outDir));
  }
  return results;
}

export function renderListingsMarkdown(specs, { svgDir = "data/state/rendered-designs" } = {}) {
  const lines = [
    "# LISTINGS",
    "",
    `Fine Print Mercantile design manifest — ${specs.length} designs across ${new Set(specs.map((s) => s.niche)).size} niches. Every SVG is print-ready (12in x 15in @ 300 DPI canvas). Generated from \`src/corpus.mjs\` by \`scripts/generate-set-of-designs.mjs\` — do not hand-edit; re-run the generator instead.`,
    "",
  ];
  for (const niche of NICHES) {
    const inNiche = specs.filter((s) => s.niche === niche);
    if (inNiche.length === 0) continue;
    lines.push(`## ${niche} (${inNiche.length})`, "");
    for (const spec of inNiche) {
      lines.push(`### ${spec.title}`);
      lines.push("");
      lines.push(`- **id**: \`${spec.id}\``);
      lines.push(`- **svg**: \`${svgDir}/${spec.id}.svg\``);
      if (spec.products.includes("poster")) {
        lines.push(`- **generated art**: \`${svgDir}/${spec.id}-art.png\` (provenance: \`${svgDir}/${spec.id}-art.provenance.json\`)`);
      }
      lines.push(`- **layout / colorway**: ${spec.layout} / ${spec.colorway}`);
      lines.push(`- **products**: ${spec.products.join(", ")}`);
      lines.push(`- **description**: ${spec.description}`);
      lines.push(`- **tags**: ${spec.tags.join(", ")}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

async function main() {
  const nicheArg = process.argv[2];
  const outDir =
    process.argv[3] ??
    path.join(import.meta.dirname, "..", "data", "state", "rendered-designs");
  const listingsPath =
    process.argv[4] ?? path.join(import.meta.dirname, "..", "LISTINGS.md");

  const specs = nicheArg && NICHES.includes(nicheArg) ? designsByNiche(nicheArg) : CORPUS;
  if (nicheArg && !NICHES.includes(nicheArg)) {
    console.error(`unknown niche "${nicheArg}"; known niches: ${NICHES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  await generateSetOfDesigns(specs, outDir);
  const markdown = renderListingsMarkdown(specs, {
    svgDir: path.relative(path.join(import.meta.dirname, ".."), outDir),
  });
  await mkdir(path.dirname(listingsPath), { recursive: true });
  await writeFile(listingsPath, markdown, "utf8");
  console.log(`rendered ${specs.length} designs to ${outDir}`);
  console.log(`wrote ${listingsPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
