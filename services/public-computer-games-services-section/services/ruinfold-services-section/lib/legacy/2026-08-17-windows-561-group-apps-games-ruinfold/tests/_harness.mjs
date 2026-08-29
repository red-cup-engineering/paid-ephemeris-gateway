// _harness — the tiny proof harness the ruinfold tests share. Each test builds a throwaway world,
// drives the engine directly (no HTTP), and asserts against the settled bilattice state. Mirrors
// the tab spine-test idiom: plain asserts, a final report that sets the exit code.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import buildWorld from "#server/scripts/seed.mjs";
import { clock } from "#engine/functional.mjs";

let passed = 0;
let failed = 0;

export function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

export function section(name) {
  console.log(`\n${name}`);
}

export function report(title) {
  console.log(`\n${failed === 0 ? "✓" : "✗"} ${title}: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// world — a fresh seeded world under a temp dir, plus a monotonic `t()` clock thunk and a cleanup.
export async function world() {
  const root = mkdtempSync(join(tmpdir(), "ruinfold-test-"));
  await buildWorld(root);
  let seq = 0;
  const t = () => clock(1, seq++);
  return { root, t, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
