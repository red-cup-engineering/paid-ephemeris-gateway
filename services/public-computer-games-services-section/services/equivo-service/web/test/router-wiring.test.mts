/**
 * Guards equivo.561.group's own Cloudflare wiring after the 2026-08-31 GCP exit: this section
 * ships its own Workers static-assets site (`wrangler.jsonc` at the service root, `assets.directory`
 * `./web`, own `custom_domain` route) rather than a Cloud Run origin proxied through the shared
 * `cloudflare-router`. This only proves this service's own config is internally consistent before
 * `wrangler deploy` runs -- it does not assert anything about the shared router, which is another
 * section's custody and is trimming this route on its own schedule.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = path.resolve(HERE, '..', '..');

test('equivo.561.group has its own custom_domain route with a static assets binding', async () => {
  const wrangler = JSON.parse(await readFile(path.join(SERVICE_ROOT, 'wrangler.jsonc'), 'utf8'));
  const route = wrangler.routes.find((r: { pattern: string }) => r.pattern === 'equivo.561.group');
  assert.ok(route, 'expected a { pattern: "equivo.561.group", custom_domain: true } route');
  assert.equal(route.custom_domain, true);
  assert.ok(wrangler.assets && wrangler.assets.directory === './web', 'expected assets.directory "./web"');
});
