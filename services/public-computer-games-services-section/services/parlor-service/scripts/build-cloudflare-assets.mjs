#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. Run: node scripts/build-cloudflare-assets.mjs
import { mkdir, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStrippingMts } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const VENDOR_ROOTS = {
  "parlor-kernel": join(ROOT, "node_modules", "@red-cup-engineering", "parlor-kernel", "src"),
  cartridge: join(ROOT, "node_modules", "@red-cup-engineering", "cartridge", "src"),
};

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));
  for (const [prefix, vendorRoot] of Object.entries(VENDOR_ROOTS)) {
    await cp(vendorRoot, join(DIST, "vendor", prefix), { recursive: true });
  }
  console.log(`built ${DIST}`);
}

main();
