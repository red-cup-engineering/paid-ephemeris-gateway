#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. The vendor root is
// cartridge's own `src/` directory, matching its package.json#exports subpath map (every
// subpath resolves to `./src/*.mjs`, not the package root). Run: node scripts/build-cloudflare-assets.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCloudflareStaticAssetTree } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
async function main() {
  console.log(`built ${await buildCloudflareStaticAssetTree({ rootDirectory: ROOT, copies: [{ source: "node_modules/@red-cup-engineering/cartridge/src", destination: "vendor/red-cup-engineering-cartridge" }] })}`);
}

main();
