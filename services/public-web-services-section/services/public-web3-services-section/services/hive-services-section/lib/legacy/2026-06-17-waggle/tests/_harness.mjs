// _harness — the tiny runner shared by every prove-*.mjs in waggle. `run(suites)` executes each
// suite against one shared `check`, prints ok/FAIL, and exits 0/1; `isMain` lets any test file run
// standalone (`node tests/prove-foo.mjs`) as well as be aggregated by tests/_run_tests.mjs.
import { pathToFileURL } from "node:url";

export const isMain = (url) => !!process.argv[1] && url === pathToFileURL(process.argv[1]).href;

export function run(suites) {
  const results = [];
  const check = (name, pass) => results.push({ name, pass: !!pass });
  for (const suite of suites) suite(check);
  let failed = 0;
  for (const r of results) { console.log(`${r.pass ? "  ok" : "FAIL"}  ${r.name}`); if (!r.pass) failed++; }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
