#!/usr/bin/env node
/**
 * `check-mts` — a real syntax gate for `.mts` files, closing a gap `node --check`/`-c` leaves
 * open: `--check` is a documented no-op for `.mts` files specifically. Type-stripping is applied
 * on the *execution* path (`node file.mts` throws `ERR_INVALID_TYPESCRIPT_SYNTAX` on real
 * garbage) but not on the `--check` syntax-only path, which exits 0 on any input at all
 * (unterminated strings, unparseable tokens all pass `node --check garbage.mts` clean; the
 * identical content as `.mjs` correctly fails).
 *
 * This script closes that gap using the same primitive Node's own type-stripping execution uses
 * (`node:module`'s `stripTypeScriptTypes`), in two stages, because stripping alone is not enough:
 *
 *   1. TS-syntax-level: `stripTypeScriptTypes(source, { mode: 'strip' })` in a try/catch. Invalid
 *      TypeScript-only syntax throws `ERR_INVALID_TYPESCRIPT_SYNTAX` here, caught and reported.
 *   2. JS-syntax-level: `stripTypeScriptTypes` only strips *recognized TypeScript* constructs —
 *      it does not itself validate that what's left is syntactically valid JavaScript (plain JS
 *      garbage with no TS-shaped tokens sails through stage 1 clean). The stripped output is
 *      written to a temp `.mjs` file and run through a real, separate `node --check` subprocess,
 *      which does fully validate ESM syntax including `import`/`export`. A temp file + child
 *      process is used here rather than `new Function(strippedSource)` because `Function`'s body
 *      is function-scope, not module-scope, and cannot parse a top-level `import`/`export` at
 *      all — every legitimate `.mts` module in this codebase uses both.
 *
 * Usage: `node check-mts.mjs <file.mts> [<file.mts> ...]` — checks every argument in order, stops
 * and reports the first failing file, exits 0 only if every file passes both stages.
 *
 * Canonical copy: `flickering-delve-service/check-mts.mjs`. Every other tree's copy is a vendored,
 * byte-identical duplicate, per house doctrine (vendor a copy, never a live cross-service import).
 */
import { stripTypeScriptTypes } from 'node:module';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

/** Check one `.mts` file. Returns `true` on success, prints a diagnostic and returns `false`
 * otherwise — never throws, so the caller can loop over every argument regardless of failure. */
function checkOne(file) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch (err) {
    console.error(`check-mts: cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }

  let stripped;
  try {
    stripped = stripTypeScriptTypes(source, { mode: 'strip' });
  } catch (err) {
    console.error(`check-mts: ${file}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }

  const dir = mkdtempSync(join(tmpdir(), 'check-mts-'));
  const tempFile = join(dir, 'stripped.mjs');
  try {
    writeFileSync(tempFile, stripped, 'utf8');
    const result = spawnSync(process.execPath, ['--check', tempFile], { encoding: 'utf8' });
    if (result.status !== 0) {
      const detail = (result.stderr ?? '').split('\n').slice(0, 4).join('\n');
      console.error(`check-mts: ${file}: JS-level syntax error after type-stripping\n${detail}`);
      return false;
    }
    return true;
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      /* best-effort cleanup */
    }
    try {
      rmdirSync(dir);
    } catch {
      /* best-effort cleanup */
    }
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node check-mts.mjs <file.mts> [<file.mts> ...]');
  process.exit(1);
}

let ok = true;
for (const file of files) {
  if (!checkOne(file)) {
    ok = false;
    break; // fail loud at the first bad file
  }
}
process.exit(ok ? 0 : 1);
