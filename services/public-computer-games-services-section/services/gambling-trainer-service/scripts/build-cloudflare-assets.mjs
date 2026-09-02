#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. The vendor root is
// cartridge's own `src/` directory, matching its package.json#exports subpath map (every
// subpath resolves to `./src/*.mjs`, not the package root). Run: node scripts/build-cloudflare-assets.mjs
import { mkdir, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStrippingMts } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const VENDOR_CARTRIDGE_ROOT = join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src");
const VENDOR_DEST = join(DIST, "vendor", "red-cup-engineering-cartridge");

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));
  await cp(VENDOR_CARTRIDGE_ROOT, VENDOR_DEST, { recursive: true });
  console.log(`built ${DIST}`);
}

main();
