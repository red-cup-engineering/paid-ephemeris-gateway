#!/usr/bin/env node
// build-cloudflare-assets — crucible-service's pattern (static-snapshot the .mts type-stripping
// and vendor pass-through) plus one addition: bake /api/manifest as a static JSON file from the
// deterministic `manifest` export of the (now-stripped) cartridge.manifest.mts.
// Run: node scripts/build-cloudflare-assets.mjs
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCloudflareStaticAssetTree } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");

/**
 * Import the stripped `dist/src/cartridge.manifest.mts` copy at build time and write its
 * `manifest` export as static JSON — a deterministic, build-time-computable value, not
 * per-request state.
 * @returns {Promise<void>}
 */
async function writeApiManifest() {
  const strippedPath = join(DIST, "src", "cartridge.manifest.mts");
  const mod = await import(pathToFileURL(strippedPath).href);
  await writeFile(join(DIST, "api-manifest.json"), JSON.stringify(mod.manifest, null, 2));
}

async function main() {
  await buildCloudflareStaticAssetTree({ rootDirectory: ROOT, copies: [{ source: "node_modules/@red-cup-engineering/cartridge/src", destination: "vendor/red-cup-engineering-cartridge" }] });
  await writeApiManifest();
  console.log(`built ${DIST}`);
}

main();
