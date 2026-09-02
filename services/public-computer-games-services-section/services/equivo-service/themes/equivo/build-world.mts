/**
 * `build-world` -- Equivo's own build script (self-education-platform-design.md §9 step 4:
 * "Equivo ships as a new theme... supplying its own corpus... its own six-type checker registry").
 * Compiles `themes/equivo/corpus/` through the platform's theme-agnostic `compileWing` with
 * Equivo's real `extractEquivoExercises` extractor wired in -- the one piece `src/compile.mts`'s
 * generic CLI entry point deliberately does NOT do (see that file's own header: "use a theme's
 * own build script... for real exercise content"). Writes the compiled World JSON to
 * `data/world-equivo.json` (engine-side fixture, matching Lantern's own `data/world-weiqi.json`
 * precedent) and `web/data/equivo-world.json` (the deployed face's self-contained copy, per
 * `web/server.mjs`'s "never reach outside its own root" discipline).
 *
 * Run: `node themes/equivo/build-world.mts` (also driven by `npm run build:world`).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileWing } from '@red-cup-engineering/education-platform-service/compile';
import { extractEquivoExercises } from './extract.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = join(HERE, '..', '..');
const CORPUS_ROOT = join(HERE, 'corpus');

export function buildEquivoWorld() {
  return compileWing(CORPUS_ROOT, { id: 'equivo' }, extractEquivoExercises);
}

function main(): void {
  const world = buildEquivoWorld();

  const engineOut = join(SERVICE_ROOT, 'data', 'world-equivo.json');
  const webOut = join(SERVICE_ROOT, 'web', 'data', 'equivo-world.json');
  mkdirSync(dirname(engineOut), { recursive: true });
  mkdirSync(dirname(webOut), { recursive: true });
  const json = JSON.stringify(world, null, 1) + '\n';
  writeFileSync(engineOut, json, 'utf8');
  writeFileSync(webOut, json, 'utf8');

  const kindCounts = new Map<string, number>();
  for (const e of world.exercises) kindCounts.set(e.kind, (kindCounts.get(e.kind) ?? 0) + 1);
  const kindSummary = [...kindCounts.entries()].map(([k, n]) => `${k}=${n}`).join(', ');

  process.stdout.write(
    `build-world (equivo): ${world.rooms.length} rooms, ${world.doors.length} doors ` +
      `(${world.doors.filter((d) => d.weight === 'hard').length} hard / ${world.doors.filter((d) => d.weight === 'soft').length} soft), ` +
      `${world.halls.length} halls (${world.halls.filter((h) => h.stable).length} stable), ` +
      `${world.exercises.length} exercises [${kindSummary}], ${world.warnings.length} warnings\n` +
      `  -> ${engineOut}\n  -> ${webOut}\n`,
  );
  if (world.warnings.length > 0) {
    for (const w of world.warnings) process.stdout.write(`  warning: ${w}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
