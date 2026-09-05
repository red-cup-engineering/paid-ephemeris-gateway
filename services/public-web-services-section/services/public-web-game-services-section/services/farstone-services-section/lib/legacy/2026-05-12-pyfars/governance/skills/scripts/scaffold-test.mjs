#!/usr/bin/env node
// scaffold-test.mjs
// Creates tests/test_<spec-slug>.py with correct header and fixture-loading skeleton.
// Usage: node scaffold-test.mjs <spec-slug> [--criteria <label,...>]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pyfarsRoot = path.resolve(scriptDir, "../../..");

function parseArgs(argv) {
  const args = { specSlug: null, criteria: [], help: false };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { args.help = true; }
    else if (arg === "--criteria") { args.criteria = argv[++i].split(",").map(s => s.trim()); }
    else if (args.specSlug === null) { args.specSlug = arg; }
    else { throw new Error(`Unexpected argument: ${arg}`); }
    i++;
  }
  return args;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toPythonIdent(s) {
  return s.replace(/-/g, "_").replace(/[^a-z0-9_]/gi, "");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.specSlug) {
    console.log("Usage: scaffold-test.mjs <spec-slug> [--criteria <label,...>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const specSlug = slugify(args.specSlug);
  const specIdent = toPythonIdent(specSlug);
  const testsDir = path.join(pyfarsRoot, "tests");
  const outPath = path.join(testsDir, `test_${specIdent}.py`);

  if (fs.existsSync(outPath)) {
    console.error(`Already exists: ${path.relative(pyfarsRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  const examplesPath = `examples/${specSlug}`;

  const testFunctions = args.criteria.length > 0
    ? args.criteria.map((criterion) => {
        const criterionIdent = toPythonIdent(slugify(criterion));
        return `\ndef test_${criterionIdent}(examples_dir):\n    # spec: ${specSlug}  criterion: ${criterion}\n    # Load fixture and assert the criterion holds.\n    # TODO: implement\n    pytest.fail("not yet implemented")`;
      }).join("\n")
    : `\ndef test_placeholder(examples_dir):\n    # TODO: add test cases per §6 acceptance criteria\n    pytest.fail("not yet implemented")`;

  const content = `# tests/test_${specIdent}.py
# spec: ${specSlug}
# Asserts acceptance criteria from governance/specifications/${specSlug}.md §6
# over code examples in ${examplesPath}/.
# Per authoring-tests: these tests MUST fail before the implementation exists.
# Generated: ${today()}

import pathlib
import pytest


EXAMPLES_DIR = pathlib.Path(__file__).parent.parent / "${examplesPath}"


@pytest.fixture
def examples_dir():
    assert EXAMPLES_DIR.is_dir(), f"Code examples not found: {EXAMPLES_DIR}"
    return EXAMPLES_DIR
${testFunctions}
`;

  fs.mkdirSync(testsDir, { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`Created: ${path.relative(pyfarsRoot, outPath)}`);
}

main();
