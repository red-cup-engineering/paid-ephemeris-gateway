#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping into a static
// dist/ tree for Cloudflare Workers Assets. No vendor step: solitaire has zero runtime
// dependencies reachable from the browser (cartridge.mts is test/tooling-only, never imported
// by web/js/kernel.mjs). Run: node scripts/build-cloudflare-assets.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCloudflareStaticAssetTree } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
async function main() {
  console.log(`built ${await buildCloudflareStaticAssetTree({ rootDirectory: ROOT })}`);
}

main();
