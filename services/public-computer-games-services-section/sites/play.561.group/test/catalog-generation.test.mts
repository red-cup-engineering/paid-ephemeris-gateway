// Guards the one invariant the manifest-per-game redesign exists for:
// catalog.json on disk must always be exactly what scripts/build-catalog.mjs
// produces from the games' own catalog-entry.json manifests right now. If
// someone hand-edits catalog.json (or edits a manifest and forgets to
// regenerate), this test is the thing that catches it -- catalog.json drifted
// out of sync with its sources three times before this existed.
//
// The "generated" date is the one field this deliberately does NOT hold to a
// byte-diff: it's a today()-stamp, expected to differ between "what the
// generator produces if you run it right now" and "what's committed," any
// day after the last real regeneration. Every other byte is compared exactly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog } from '../scripts/build-catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const CATALOG_PATH = path.join(ROOT, 'catalog.json');

// One of build-catalog.mjs's real search roots -- used below to plant a
// throwaway manifest and prove the verifier actually walks the tree, rather
// than asserting against fixtures that already happen to pass.
const GAMES_ROOT = path.join(ROOT, '..', '..', 'services');

function withoutGeneratedDate(json) {
  return json.replace(/^(\s*"generated":\s*")[^"]*(",?\s*)$/m, '$1<date>$2');
}

test('catalog.json on disk is exactly what scripts/build-catalog.mjs generates right now (byte-diff, "generated" date excepted)', async () => {
  const committed = await readFile(CATALOG_PATH, 'utf8');
  const { json: generated } = await buildCatalog();

  assert.equal(
    withoutGeneratedDate(generated),
    withoutGeneratedDate(committed),
    'catalog.json is stale relative to its games\' catalog-entry.json manifests -- run `npm run generate-catalog` and commit the result',
  );
});

test('every game with a catalog-entry.json is represented in catalog.json exactly once', async () => {
  const { catalog } = await buildCatalog();
  const ids = catalog.games.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate game id in generated catalog');
  assert.ok(ids.length > 0, 'expected at least one game');
});

test('buildCatalog() refuses to build when a cartridgeWrapped:true manifest claims a replayVerifier that does not exist on disk', async () => {
  // Regression: catalog.json used to keep claiming cartridgeWrapped:true for
  // flickering-delve with a replayVerifier pointing at a src/cartridge.manifest.mts
  // that had already been deleted -- nothing checked that claim against
  // reality. Plant a real throwaway manifest making the same false claim and
  // prove the generator now refuses to build rather than publishing it.
  const tempDir = path.join(GAMES_ROOT, '__catalog-generation-test-fixture');
  await mkdir(tempDir, { recursive: true });
  await writeFile(
    path.join(tempDir, 'catalog-entry.json'),
    JSON.stringify({
      id: '__catalog-generation-test-fixture',
      displayName: 'Test Fixture',
      description: 'Throwaway fixture for catalog-generation.test.mts',
      subdomain: 'test-fixture',
      entryPoints: { browser: '/' },
      seedPolicy: { kind: 'on-demand' },
      intentLog: { schemaVersion: 'test-v1' },
      replayVerifier: 'src/does-not-exist.mts#verify',
      keywords: ['test'],
      status: 'playable',
      cartridgeWrapped: true,
      energyBankWrapped: false,
      shelf: 'unshelved',
    }),
    'utf8',
  );

  try {
    await assert.rejects(
      () => buildCatalog(),
      /replayVerifier file does not exist/,
      'expected buildCatalog() to reject a cartridgeWrapped:true manifest whose replayVerifier file is missing',
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
