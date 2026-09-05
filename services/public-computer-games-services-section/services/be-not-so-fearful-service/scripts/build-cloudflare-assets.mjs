#!/usr/bin/env node
// build-cloudflare-assets — snapshots src/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. Vendors exactly the
// packages real bare-specifier imports reach: abrash (dedicated route), and the generic-route
// packages actually named in web/index.html's import map that also exist in node_modules
// (@561-group/computer, @red-cup-engineering/cartridge) — NOT @lenticule-science/metrologic,
// which the import map references but which is absent from node_modules and outside the
// original server's own VENDOR_SCOPES allowlist, so it already 404s on the live service too.
// Run: node scripts/build-cloudflare-assets.mjs
import { mkdir, cp, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { copyStrippingMts } from "@red-cup-engineering/project-browser-asset-tree-service";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const NODE_MODULES = join(ROOT, "node_modules");

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await copyStrippingMts(join(ROOT, "web"), join(DIST, "web"));
  await copyStrippingMts(join(ROOT, "src"), join(DIST, "src"));

  await cp(join(ROOT, "DESIGN.md"), join(DIST, "DESIGN.md"));
  await cp(join(ROOT, "README.md"), join(DIST, "README.md"));

  // /vendor/abrash/<name>.mjs — the dedicated route, served from abrash's own src/ flat.
  await cp(
    join(NODE_MODULES, "@red-cup-engineering", "abrash", "src"),
    join(DIST, "vendor", "abrash"),
    { recursive: true, filter: (p) => !p.endsWith(".test.mts") && !p.endsWith(".d.ts") },
  );

  // /vendor/<scope>/<pkg>/<realPath> — the generic route, for the transitive packages the
  // real import map (web/index.html) actually names and that exist in node_modules.
  await cp(
    join(NODE_MODULES, "@561-group", "computer"),
    join(DIST, "vendor", "@561-group", "computer"),
    { recursive: true },
  );
  await cp(
    join(NODE_MODULES, "@red-cup-engineering", "cartridge", "src"),
    join(DIST, "vendor", "@red-cup-engineering", "cartridge", "src"),
    { recursive: true, filter: (p) => !p.endsWith(".test.mts") },
  );

  console.log(`built ${DIST}`);
}

main();
