// build — load the DESIGNED "Farstone — the off-season" world (definition.mjs) into a target dir
// through the DSL's own `loadWorld`, so dual-filing, the deterministic `dsl:NNNNNN` stamping, and
// the entity shapes are all exercised exactly as the engine would build any authored world.
//
// The committed `examples/farstone-tale/` holds the DEFINITION + README + this script, NOT a
// generated world — run this to materialize the world wherever you want to play it:
//
//   node examples/farstone-tale/build.mjs <dir>     # write the world into <dir>
//
// It LINTS first and refuses to load a definition with errors (the DSL contract), then writes the
// designed core. Optionally it sprinkles a little GENERATED breadth on the EDGES of the map via
// #worldgen — extra rooms for an Explorer to dig through around the hand-designed center — but
// only when asked (`--breadth N`), so the designed world is the default and stays deterministic.

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { rm } from "node:fs/promises";

import { loadWorld, lint } from "#dsl";
import definition from "./definition.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// buildTale — lint then load the definition into `root`. Returns { written, issues }. Throws on a
// lint error (a designed world must be lint-clean before it loads — the same gate the DSL CLI uses).
export default async function buildTale(root = HERE, { fresh = false } = {}) {
  const issues = lint(definition);
  if (issues.length) {
    const lines = issues.map((i) => `  ${i.severity} [${i.code}] ${i.message}`).join("\n");
    throw new Error(`definition is not lint-clean (${issues.length} issue(s)):\n${lines}`);
  }
  if (fresh) await rm(root, { recursive: true, force: true });
  const { written } = await loadWorld(root, definition);
  return { written, issues };
}

// addBreadth — OPTIONAL generated rooms on the edges, for Explorers. Worldgen grows from a seed
// area already in the world; we hang its output off the lighthouse, away from the designed core.
async function addBreadth(root, count) {
  const { default: worldgen } = await import("#worldgen");
  // worldgen's signature varies by build; call it defensively and ignore if unavailable.
  try {
    await worldgen({ root, seed: "lighthouse-point", count });
  } catch (e) {
    console.warn(`(skipped generated breadth: ${e.message})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) {
    console.error("usage: node examples/farstone-tale/build.mjs <dir> [--breadth N]");
    process.exit(2);
  }
  const breadthIdx = args.indexOf("--breadth");
  const breadth = breadthIdx >= 0 ? Number(args[breadthIdx + 1]) || 0 : 0;

  const { written } = await buildTale(dir, { fresh: true });
  if (breadth > 0) await addBreadth(dir, breadth);
  console.log(`✓ built "Farstone — the off-season": ${written} cells under ${dir}` +
    (breadth > 0 ? ` (+ up to ${breadth} generated rooms on the edge)` : ""));
}
