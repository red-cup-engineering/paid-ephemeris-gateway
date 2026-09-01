#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. Run: node scripts/build-cloudflare-assets.mjs
import { readdir, mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const VENDOR_MATH_ROOT = join(ROOT, "node_modules", "@lenticule-science", "metrologic");
const VENDOR_DEST = join(DIST, "vendor", "lenticule-science-metrologic");

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

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));
  await cp(VENDOR_MATH_ROOT, VENDOR_DEST, { recursive: true });
  console.log(`built ${DIST}`);
}

main();
