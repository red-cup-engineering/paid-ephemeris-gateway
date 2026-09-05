#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping into a static
// dist/ tree for Cloudflare Workers Assets. No vendor step: solitaire has zero runtime
// dependencies reachable from the browser (cartridge.mts is test/tooling-only, never imported
// by web/js/kernel.mjs). Run: node scripts/build-cloudflare-assets.mjs
import { mkdir, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStrippingMts } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));
  console.log(`built ${DIST}`);
}

main();
