#!/usr/bin/env node
// build-cloudflare-assets — snapshots web/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. Run: node scripts/build-cloudflare-assets.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCloudflareStaticAssetTree } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
async function main() {
  console.log(`built ${await buildCloudflareStaticAssetTree({ rootDirectory: ROOT, copies: [{ source: "node_modules/@red-cup-engineering/parlor-kernel/src", destination: "vendor/parlor-kernel" }, { source: "node_modules/@red-cup-engineering/cartridge/src", destination: "vendor/cartridge" }] })}`);
}

main();
