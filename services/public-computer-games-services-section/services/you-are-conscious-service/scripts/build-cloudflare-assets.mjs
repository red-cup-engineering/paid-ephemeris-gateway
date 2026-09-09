#!/usr/bin/env node
// build-cloudflare-assets — crucible-service's pattern (static-snapshot the .mts type-stripping
// and vendor pass-through) plus one addition: bake /api/manifest as a static JSON file from the
// deterministic `manifest` export of the (now-stripped) cartridge.manifest.mts.
// Run: node scripts/build-cloudflare-assets.mjs
import { writeFile, readdir, readFile } from "node:fs/promises";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCloudflareStaticAssetTree } from "@red-cup-engineering/project-browser-asset-tree-service";
import { createWebReleaseManifest, serializeWebReleaseManifest } from "@red-cup-engineering/web-release-candidate-service";

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

/** Read the sealed Worker Assets tree as the one portable release inventory. */
async function releaseArtifacts(directory = DIST) {
  const artifacts = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        artifacts.push({ path: relative(directory, path).split(sep).join("/"), body: await readFile(path) });
      } else {
        throw new Error(`Cloudflare asset tree contains a non-file entry: ${path}`);
      }
    }
  }
  await visit(directory);
  return artifacts;
}

async function writeReleaseManifest() {
  const manifest = createWebReleaseManifest({
    artifacts: await releaseArtifacts(),
    baseUrl: "https://you-are-conscious.561.group/",
    profile: "cloudflare-worker-assets",
    excludePaths: ["release-manifest.json"],
    metadata: { deliveryClass: "dynamic-stateless", receiver: "cloudflare-worker-assets" },
  });
  await writeFile(join(DIST, "release-manifest.json"), serializeWebReleaseManifest(manifest));
  return manifest;
}

async function main() {
  await buildCloudflareStaticAssetTree({ rootDirectory: ROOT, copies: [{ source: "node_modules/@red-cup-engineering/cartridge/src", destination: "vendor/red-cup-engineering-cartridge" }] });
  await writeApiManifest();
  const manifest = await writeReleaseManifest();
  console.log(`built ${DIST} (${manifest.digest})`);
}

main();
