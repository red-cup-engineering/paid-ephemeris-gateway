#!/usr/bin/env node
/**
 * `check-mts` — a real syntax gate for `.mts` files, closing a gap `node --check`/`-c` leaves
 * open in this Node build (confirmed directly, v24.19.0): `--check` is a documented no-op for
 * `.mts` files specifically — type-stripping is applied on the *execution* path (`node file.mts`
 * throws `ERR_INVALID_TYPESCRIPT_SYNTAX` on real garbage) but not on the `--check` syntax-only
 * path, which exits 0 on any input at all (unterminated strings, unparseable tokens, all pass
 * `node --check garbage.mts` clean; the identical content as `.mjs` correctly fails). This is a
 * second, deeper bug than the "only the first argv is ever checked" bug the per-file-loop fix
 * (this same session, this same package.json) already closed — that fix is real and necessary,
 * but it does not by itself make `.mts` checking meaningful, only makes it run per file.
 *
 * This script closes the real gap using the same primitive Node's own type-stripping execution
 * already uses (`node:module`'s `stripTypeScriptTypes` — the identical function
 * `solitaire-service/web/server.mjs` and `crucible-service/web/server.mjs` already call to serve
 * `.mts` sources to a browser as plain JS), in two stages, because stripping alone is not enough:
 *
 *   1. TS-syntax-level: `stripTypeScriptTypes(source, { mode: 'strip' })` in a try/catch. Invalid
 *      TypeScript-only syntax throws `ERR_INVALID_TYPESCRIPT_SYNTAX` here, caught and reported.
 *   2. JS-syntax-level: `stripTypeScriptTypes` only strips *recognized TypeScript* constructs —
 *      it does not itself validate that what's left is syntactically valid JavaScript (confirmed
 *      directly: plain JS garbage with no TS-shaped tokens sails through stage 1 clean). The
 *      stripped output is written to a temp `.mjs` file and run through a real, separate
 *      `node --check` subprocess — which DOES fully validate ESM syntax, including `import`/
 *      `export`. This is why a temp *file* + child process is used here rather than `new
 *      Function(strippedSource)`: `Function`'s body is function-scope, not module-scope, so it
 *      cannot parse a top-level `import`/`export` statement at all — every legitimate `.mts`
 *      module in this codebase uses both, so `new Function` would false-fail on real, correct
 *      files, not just on injected garbage.
 *
 * Usage: `node check-mts.mjs <file.mts> [<file.mts> ...]` — checks every argument in order (never
 * only the first — the original bug this whole mechanism exists to fix stays fixed here too),
 * stops and reports the first failing file, exits 0 only if every file passes both stages.
 *
 * Canonical copy: `flickering-delve-service/check-mts.mjs`. Every other tree's copy is a vendored,
 * byte-identical duplicate per house doctrine (vendor a copy, never a live cross-service import) —
 * confirmed identical at each vendor site's own header comment, which names this file as the
 * source.
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
    break; // fail loud at the first bad file — same discipline the per-file loop fix already established
  }
}
process.exit(ok ? 0 : 1);
