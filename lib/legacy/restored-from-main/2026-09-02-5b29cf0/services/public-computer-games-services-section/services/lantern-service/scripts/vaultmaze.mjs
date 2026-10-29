#!/usr/bin/env node
/**
 * `vaultmaze` — one command: point at a directory, get a playable maze in the browser.
 *
 *   node scripts/vaultmaze.mjs <vaultDir> [--dialect house|obsidian|org] [--wing <id>]
 *                           [--port N] [--host H] [--exclude <glob>]... [--no-serve]
 *
 * READ-ONLY IS SACRED: this command only ever *reads* from `<vaultDir>` — that guarantee is
 * enforced by `@561-group/vault-compiler` itself (see its `read-only` tests), not just this
 * file's own discipline. Every byte this command writes goes under this service's own
 * `web/data/` directory, never into the vault.
 *
 * Compiles via `@561-group/vault-compiler` (dialect auto-detected, or `--dialect` override),
 * builds the same layout artifact the house-only `build:web` pipeline builds (the same
 * `buildLayout` lantern-service's own `web/build/build-layout.mts` was ported from — see
 * `@561-group/vault-compiler/build-layout`'s own doc comment for that provenance), and writes:
 *
 *   - `web/data/<wing>.json`          the compiled World — SAME artifact shape `build:web` writes
 *   - `web/data/<wing>-layout.json`   room positions + auto-hall katas — SAME shape
 *   - `web/data/<wing>-meta.json`     dialect + honest degradation notes — NEW, only ever
 *                                     written by this command. The house `compile:weiqi` /
 *                                     `build:web` pipeline never writes this file, and
 *                                     `web/js/app.js`'s `renderVaultMeta()` treats its absence
 *                                     as "nothing to disclose" — so the original weiqi wing is
 *                                     completely unaffected by this command's existence.
 *
 * Then serves `web/` (reusing `web/server.mjs`'s own `createStaticServer`, not a second
 * implementation) so the compiled result is immediately playable at
 * `http://<host>:<port>/?wing=<wing>`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVault } from '@561-group/vault-compiler/compile';
import { buildLayout } from '@561-group/vault-compiler/build-layout';
import { createStaticServer } from '../web/server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = join(HERE, '..');
const WEB_DATA_DIR = join(SERVICE_ROOT, 'web', 'data');

function parseArgs(argv) {
  const out = { excludeGlobs: [] };
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dialect') out.dialect = argv[++i];
    else if (a === '--wing') out.wing = argv[++i];
    else if (a === '--port') out.port = argv[++i];
    else if (a === '--host') out.host = argv[++i];
    else if (a === '--exclude') out.excludeGlobs.push(argv[++i]);
    else if (a === '--no-serve') out.noServe = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else positionals.push(a);
  }
  out.vaultDir = positionals[0];
  return out;
}

function sanitizeWingId(name) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'vault';
}

/**
 * Honest degradation notes for the web face — computed from the COMPILED WORLD, never guessed
 * from the dialect name alone. This matters: a house-dialect wing that simply never declares
 * any `requires:`-shaped fields earns exactly the same "no hard-door convention" note an
 * Obsidian wing with no `up:`-style fields does. The notes describe what actually happened to
 * THIS vault's own content, not a property of its dialect label.
 */
function describeDegradations(world, dialect) {
  const notes = [];

  const hasExplicitHardDoors = world.doors.some((d) => d.reason.startsWith('declared as a prerequisite of'));
  if (!hasExplicitHardDoors && world.doors.length > 0) {
    notes.push('No hard-door convention was found in this vault — every door comes from links between notes, promoted from soft to hard.');
  } else if (world.doors.length === 0 && world.rooms.length > 1) {
    notes.push('No links between notes were found — every room is its own isolated frontier room.');
  }

  const withDate = world.rooms.filter((r) => r.dateCreated).length;
  if (world.rooms.length > 0 && withDate === 0) {
    notes.push('No note in this vault declares a creation date — kata paths fall back to alphabetical room-id ordering instead of chronological order.');
  }

  if (dialect === 'org') {
    notes.push(
      "This is a minimal v1 org-mode reader: PROPERTY drawers, TODO states, and [[id:...]] org-roam links are not read. See @561-group/vault-compiler's README for the full disclosed scope.",
    );
  }

  return notes;
}

function printHelp() {
  console.log(
    [
      'usage: node scripts/vaultmaze.mjs <vaultDir> [options]',
      '',
      '  --dialect house|obsidian|org   override dialect auto-detection',
      '  --wing <id>                    wing id (default: sanitized <vaultDir> basename)',
      '  --port <n>                     serve port (default: 8080, or $PORT)',
      '  --host <h>                     serve host (default: 127.0.0.1, or $HOST)',
      '  --exclude <glob>                additional exclude glob (repeatable; teraum is ALWAYS excluded)',
      '  --no-serve                     compile only, do not start the web server',
      '',
      'Read-only: never writes into <vaultDir>. Writes only under this service\'s own web/data/.',
    ].join('\n'),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.vaultDir) {
    printHelp();
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const vaultDir = resolve(args.vaultDir);
  const wing = sanitizeWingId(args.wing ?? basename(vaultDir));

  const { world, dialect, dialectReason } = compileVault(
    vaultDir,
    { id: wing },
    { dialect: args.dialect, excludeGlobs: args.excludeGlobs },
  );
  const layout = buildLayout(world);
  const degradations = describeDegradations(world, dialect);

  mkdirSync(WEB_DATA_DIR, { recursive: true });
  writeFileSync(join(WEB_DATA_DIR, `${wing}.json`), JSON.stringify(world, null, 1), 'utf8');
  writeFileSync(join(WEB_DATA_DIR, `${wing}-layout.json`), JSON.stringify(layout, null, 1), 'utf8');
  writeFileSync(
    join(WEB_DATA_DIR, `${wing}-meta.json`),
    JSON.stringify({ wingId: wing, dialect, dialectReason, degradations, sourceDir: vaultDir }, null, 1) + '\n',
    'utf8',
  );

  console.log(
    `vaultmaze: compiled "${vaultDir}" as ${dialect} (${dialectReason})\n` +
      `vaultmaze: ${world.rooms.length} rooms, ${world.doors.length} doors, ${world.halls.length} halls, ` +
      `${world.cards.length} cards, ${world.warnings.length} warnings`,
  );
  if (degradations.length > 0) {
    console.log('vaultmaze: degradations (shown honestly in the web face too, not hidden) —');
    for (const d of degradations) console.log(`  - ${d}`);
  }
  if (world.warnings.length > 0) {
    console.log(`vaultmaze: ${world.warnings.length} compile warning(s) — see web/data/${wing}.json's own "warnings" field for detail`);
  }

  if (args.noServe) {
    console.log(`vaultmaze: wrote web/data/${wing}.json + web/data/${wing}-layout.json + web/data/${wing}-meta.json (--no-serve, not starting the server)`);
    return;
  }

  const port = Number(args.port ?? process.env.PORT ?? 8080);
  const host = args.host ?? process.env.HOST ?? '127.0.0.1';
  const server = createStaticServer();
  server.listen(port, host, () => {
    console.log(`vaultmaze: playable at http://${host}:${port}/?wing=${wing}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
