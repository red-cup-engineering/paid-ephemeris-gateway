#!/usr/bin/env node
// build-cloudflare-assets — snapshots src/server.mjs's dynamic .mts stripping and vendor
// pass-through into a static dist/ tree for Cloudflare Workers Assets. Vendors exactly the
// packages real bare-specifier imports reach: abrash (dedicated route), and the generic-route
// packages actually named in web/index.html's import map that also exist in node_modules
// (@561-group/computer, @red-cup-engineering/cartridge) — NOT @lenticule-science/metrologic,
// which the import map references but which is absent from node_modules and outside the
// original server's own VENDOR_SCOPES allowlist, so it already 404s on the live service too.
// Run: node scripts/build-cloudflare-assets.mjs
import { readdir, mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = join(ROOT, "dist");
const NODE_MODULES = join(ROOT, "node_modules");

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
