/**
 * `vaultmaze-parity` — the acceptance test the VaultMaze rebrand promised: this service's
 * house-dialect corpus compiles IDENTICALLY (byte-for-byte, `assert.deepEqual` on the full
 * `World`) whether run through this service's own `src/compile.mts` or through
 * `@red-cup-engineering/vault-compiler`'s house adapter — the SAME package `scripts/vaultmaze.mjs` uses for
 * every foreign vault. This is what makes "keep the existing house-dialect path byte-compatible"
 * a checked fact, not a claim.
 *
 * Two levels: the local `test/fixtures/` corpus (always present, always runs) and the live
 * weiqi corpus behind `$WEIQI_ROOT` (skipped, not failed, when that env var/path is absent —
 * matching `compile:weiqi`'s own existing convention of requiring `WEIQI_ROOT`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { compileWing as localCompileWing } from './compile.mts';
import { compileWing as packageCompileWing } from '@red-cup-engineering/vault-compiler/compile';

const FIXTURES = fileURLToPath(new URL('../test/fixtures/', import.meta.url));

test('house-dialect parity: @red-cup-engineering/vault-compiler compiles the local test fixtures identically to this service\'s own compile.mts', () => {
  const local = localCompileWing(FIXTURES, { id: 'fixture' });
  const viaPackage = packageCompileWing(FIXTURES, { id: 'fixture' });
  assert.deepEqual(viaPackage, local);
});

const WEIQI_ROOT = process.env.WEIQI_ROOT;

test(
  'house-dialect parity: @red-cup-engineering/vault-compiler compiles the live weiqi corpus identically to this service\'s own compile.mts',
  { skip: !WEIQI_ROOT || !existsSync(WEIQI_ROOT) ? 'WEIQI_ROOT not set or does not exist in this environment' : false },
  () => {
    const local = localCompileWing(WEIQI_ROOT, { id: 'weiqi' });
    const viaPackage = packageCompileWing(WEIQI_ROOT, { id: 'weiqi' });
    assert.deepEqual(viaPackage, local);
  },
);
