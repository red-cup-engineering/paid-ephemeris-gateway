#!/usr/bin/env node
// build-cloudflare-assets — crucible-service's pattern (static-snapshot the .mts type-stripping
// and vendor pass-through) plus one addition: bake /api/manifest as a static JSON file from the
// deterministic `manifest` export of the (now-stripped) cartridge.manifest.mts.
// Run: node scripts/build-cloudflare-assets.mjs
import { readdir, mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripTypeScriptTypes } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const VENDOR_CARTRIDGE_ROOT = join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src");
const VENDOR_DEST = join(DIST, "vendor", "red-cup-engineering-cartridge");

/**
 * Recursively copy `srcDir` to `dstDir`, type-stripping any `.mts` file and skipping
 * `*.test.mts`, a `test/` directory, and `server.mjs` (not needed in the served asset tree).
 * @param {string} srcDir
 * @param {string} dstDir
 * @returns {Promise<void>}
 */
async function copyStrippingMts(srcDir, dstDir) {
  await mkdir(dstDir, { recursive: true });
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    if (entry.name === "test" || entry.name.endsWith(".test.mts") || entry.name === "server.mjs") continue;
    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await copyStrippingMts(srcPath, dstPath);
    } else if (extname(entry.name) === ".mts") {
      const source = await readFile(srcPath, "utf8");
      const stripped = stripTypeScriptTypes(source, { mode: "strip" });
      await writeFile(dstPath, stripped);
    } else {
      await cp(srcPath, dstPath);
    }
  }
}

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
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));
  await cp(VENDOR_CARTRIDGE_ROOT, VENDOR_DEST, { recursive: true });
  await writeApiManifest();
  console.log(`built ${DIST}`);
}

main();
